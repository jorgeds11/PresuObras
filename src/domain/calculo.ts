import type { APU, Catalogo, Coeficientes, Presupuesto, TipoInsumo } from "./types";

export type CostoPorTipo = Record<TipoInsumo, number>;

export interface CostoAPU extends CostoPorTipo {
  total: number;
}

const cero = (): CostoAPU => ({ material: 0, mano_obra: 0, equipo: 0, total: 0 });

export class ErrorCalculo extends Error {}

/**
 * Costo directo de una unidad del APU, desglosado por tipo de insumo.
 * Los subanálisis (APU dentro de APU) se resuelven recursivamente y
 * se detectan referencias circulares.
 */
export function costoAPU(apuId: string, catalogo: Catalogo, visitados: string[] = []): CostoAPU {
  if (visitados.includes(apuId)) {
    throw new ErrorCalculo(`Referencia circular entre análisis: ${[...visitados, apuId].join(" → ")}`);
  }
  const apu = catalogo.apus.find((a) => a.id === apuId);
  if (!apu) throw new ErrorCalculo(`No existe el análisis ${apuId}`);

  const res = cero();
  for (const comp of apu.componentes) {
    if (comp.ref.tipo === "insumo") {
      const refId = comp.ref.id;
      const insumo = catalogo.insumos.find((i) => i.id === refId);
      if (!insumo) throw new ErrorCalculo(`El análisis ${apu.codigo} usa un insumo inexistente (${refId})`);
      const factor = insumo.tipo === "material" ? 1 + (comp.desperdicio ?? 0) / 100 : 1;
      res[insumo.tipo] += comp.cantidad * factor * insumo.precio;
    } else {
      const sub = costoAPU(comp.ref.id, catalogo, [...visitados, apuId]);
      const factor = 1 + (comp.desperdicio ?? 0) / 100;
      res.material += comp.cantidad * factor * sub.material;
      res.mano_obra += comp.cantidad * factor * sub.mano_obra;
      res.equipo += comp.cantidad * factor * sub.equipo;
    }
  }
  res.total = res.material + res.mano_obra + res.equipo;
  return res;
}

/**
 * Coeficiente de pase: multiplica el costo directo para llegar al precio final.
 * GG y gastos financieros sobre costo directo, beneficio sobre ese subtotal
 * e IVA sobre el precio antes de impuestos.
 */
export function coeficienteDePase(c: Coeficientes, conIva = true): number {
  const k = (1 + (c.gastosGenerales + c.gastosFinancieros) / 100) * (1 + c.beneficio / 100);
  return conIva ? k * (1 + c.iva / 100) : k;
}

export interface LineaCalculada {
  itemId: string;
  apu: APU;
  cantidad: number;
  unitarioDirecto: number;
  /** Precio unitario con coeficiente de pase, sin IVA. */
  unitarioPrecio: number;
  subtotalDirecto: number;
  subtotalPrecio: number;
  desglose: CostoAPU;
}

export interface RubroCalculado {
  rubro: string;
  lineas: LineaCalculada[];
  subtotalDirecto: number;
  subtotalPrecio: number;
  incidencia: number;
}

export interface ResumenPresupuesto {
  rubros: RubroCalculado[];
  costoDirecto: number;
  gastosGenerales: number;
  gastosFinancieros: number;
  beneficio: number;
  subtotalSinIva: number;
  iva: number;
  total: number;
  porTipo: CostoPorTipo;
  /** Ítems cuyo APU todavía no fue validado por un profesional. */
  itemsSinValidar: number;
}

export function calcularPresupuesto(p: Presupuesto, catalogo: Catalogo): ResumenPresupuesto {
  const kSinIva = coeficienteDePase(p.coeficientes, false);
  const porRubro = new Map<string, LineaCalculada[]>();
  const porTipo: CostoPorTipo = { material: 0, mano_obra: 0, equipo: 0 };
  let itemsSinValidar = 0;

  for (const item of p.items) {
    const apu = catalogo.apus.find((a) => a.id === item.apuId);
    if (!apu) throw new ErrorCalculo(`El ítem ${item.id} usa un análisis inexistente (${item.apuId})`);
    const desglose = costoAPU(apu.id, catalogo);
    if (!apu.validado) itemsSinValidar++;
    porTipo.material += desglose.material * item.cantidad;
    porTipo.mano_obra += desglose.mano_obra * item.cantidad;
    porTipo.equipo += desglose.equipo * item.cantidad;
    const linea: LineaCalculada = {
      itemId: item.id,
      apu,
      cantidad: item.cantidad,
      unitarioDirecto: desglose.total,
      unitarioPrecio: desglose.total * kSinIva,
      subtotalDirecto: desglose.total * item.cantidad,
      subtotalPrecio: desglose.total * kSinIva * item.cantidad,
      desglose,
    };
    porRubro.set(apu.rubro, [...(porRubro.get(apu.rubro) ?? []), linea]);
  }

  const costoDirecto = porTipo.material + porTipo.mano_obra + porTipo.equipo;
  const c = p.coeficientes;
  const gastosGenerales = (costoDirecto * c.gastosGenerales) / 100;
  const gastosFinancieros = (costoDirecto * c.gastosFinancieros) / 100;
  const beneficio = ((costoDirecto + gastosGenerales + gastosFinancieros) * c.beneficio) / 100;
  const subtotalSinIva = costoDirecto + gastosGenerales + gastosFinancieros + beneficio;
  const iva = (subtotalSinIva * c.iva) / 100;

  const rubros: RubroCalculado[] = [...porRubro.entries()].map(([rubro, lineas]) => {
    const subtotalDirecto = lineas.reduce((s, l) => s + l.subtotalDirecto, 0);
    return {
      rubro,
      lineas,
      subtotalDirecto,
      subtotalPrecio: subtotalDirecto * kSinIva,
      incidencia: costoDirecto > 0 ? subtotalDirecto / costoDirecto : 0,
    };
  });

  return {
    rubros,
    costoDirecto,
    gastosGenerales,
    gastosFinancieros,
    beneficio,
    subtotalSinIva,
    iva,
    total: subtotalSinIva + iva,
    porTipo,
    itemsSinValidar,
  };
}

export const formatoPesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export const formatoNumero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });
