import type { Insumo } from "./types";

/**
 * Importación de listas de precios de corralones.
 *
 * Acepta CSV exportado de Excel con separador ";" o "," y números en
 * formato argentino ("1.234,56") o internacional ("1234.56").
 * Columnas reconocidas (en cualquier orden, sin importar mayúsculas/acentos):
 * codigo, descripcion, unidad, precio.
 */

export interface FilaPrecio {
  codigo: string;
  descripcion: string;
  unidad: string;
  precio: number;
}

export interface ResultadoParseo {
  filas: FilaPrecio[];
  errores: string[];
}

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const ALIAS: Record<keyof FilaPrecio, string[]> = {
  codigo: ["codigo", "cod", "cod.", "sku", "articulo"],
  descripcion: ["descripcion", "detalle", "producto", "material"],
  unidad: ["unidad", "un", "u.", "um", "presentacion"],
  precio: ["precio", "precio unitario", "p. unitario", "importe", "precio s/iva", "precio sin iva"],
};

/** "1.234,56" → 1234.56; "1234.56" → 1234.56; "$ 2.500" → 2500. */
export function parsearNumero(texto: string): number {
  const limpio = texto.replace(/[$\s]/g, "");
  if (limpio === "") return NaN;
  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");
  let normal = limpio;
  if (tieneComa && tienePunto) {
    // El último separador es el decimal.
    normal =
      limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
        ? limpio.replace(/\./g, "").replace(",", ".")
        : limpio.replace(/,/g, "");
  } else if (tieneComa) {
    normal = limpio.replace(",", ".");
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "2.500" en listas argentinas es dos mil quinientos.
    normal = limpio.replace(/\./g, "");
  }
  return Number(normal);
}

function separarLinea(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (ch === sep && !entreComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += ch;
    }
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

export function parsearListaPrecios(texto: string): ResultadoParseo {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length < 2) return { filas: [], errores: ["El archivo no tiene encabezado y filas de datos."] };

  const sep = (lineas[0].match(/;/g)?.length ?? 0) >= (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const encabezado = separarLinea(lineas[0], sep).map(normalizar);
  const indice = {} as Record<keyof FilaPrecio, number>;
  for (const campo of Object.keys(ALIAS) as (keyof FilaPrecio)[]) {
    indice[campo] = encabezado.findIndex((h) => ALIAS[campo].includes(h));
  }
  const faltantes = (["descripcion", "precio"] as const).filter((c) => indice[c] < 0);
  if (faltantes.length) {
    return { filas: [], errores: [`Faltan columnas obligatorias: ${faltantes.join(", ")}.`] };
  }

  const filas: FilaPrecio[] = [];
  const errores: string[] = [];
  lineas.slice(1).forEach((linea, n) => {
    const campos = separarLinea(linea, sep);
    const tomar = (c: keyof FilaPrecio) => (indice[c] >= 0 ? campos[indice[c]] ?? "" : "");
    const precio = parsearNumero(tomar("precio"));
    if (!Number.isFinite(precio) || precio < 0) {
      errores.push(`Fila ${n + 2}: precio inválido "${tomar("precio")}".`);
      return;
    }
    filas.push({
      codigo: tomar("codigo"),
      descripcion: tomar("descripcion"),
      unidad: tomar("unidad"),
      precio,
    });
  });
  return { filas, errores };
}

export interface CambioPrecio {
  insumo: Insumo;
  fila: FilaPrecio;
  variacion: number;
}

export interface Conciliacion {
  cambios: CambioPrecio[];
  sinCoincidencia: FilaPrecio[];
}

/**
 * Cruza la lista importada con los insumos existentes, primero por código y
 * después por descripción exacta (normalizada). Lo que no coincide queda para
 * que el usuario lo asocie a mano: no se crean insumos automáticamente porque
 * la presentación del corralón (bolsa, pallet, m³) suele no coincidir con la
 * unidad del análisis.
 */
export function conciliar(insumos: Insumo[], filas: FilaPrecio[]): Conciliacion {
  const cambios: CambioPrecio[] = [];
  const sinCoincidencia: FilaPrecio[] = [];
  for (const fila of filas) {
    const insumo =
      (fila.codigo && insumos.find((i) => i.codigo && normalizar(i.codigo) === normalizar(fila.codigo))) ||
      insumos.find((i) => normalizar(i.descripcion) === normalizar(fila.descripcion));
    if (!insumo) {
      sinCoincidencia.push(fila);
      continue;
    }
    const variacion = insumo.precio > 0 ? ((fila.precio - insumo.precio) / insumo.precio) * 100 : 0;
    cambios.push({ insumo, fila, variacion });
  }
  return { cambios, sinCoincidencia };
}
