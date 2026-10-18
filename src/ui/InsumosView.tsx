import { useState } from "react";
import { formatoPesos } from "../domain/calculo";
import { conciliar, parsearListaPrecios, type Conciliacion } from "../domain/csv";
import type { Insumo } from "../domain/types";
import type { Estado, SetEstado } from "../store/store";

interface Props {
  estado: Estado;
  setEstado: SetEstado;
}

const TIPOS: Record<Insumo["tipo"], string> = { material: "Material", mano_obra: "Mano de obra", equipo: "Equipo" };

export function InsumosView({ estado, setEstado }: Props) {
  const { insumos } = estado.catalogo;
  const [importacion, setImportacion] = useState<(Conciliacion & { errores: string[]; fuente: string }) | null>(null);

  const actualizarInsumo = (id: string, cambios: Partial<Insumo>) =>
    setEstado((e) => ({
      ...e,
      catalogo: { ...e.catalogo, insumos: e.catalogo.insumos.map((i) => (i.id === id ? { ...i, ...cambios } : i)) },
    }));

  const leerArchivo = async (archivo: File) => {
    const texto = await archivo.text();
    const { filas, errores } = parsearListaPrecios(texto);
    setImportacion({ ...conciliar(insumos, filas), errores, fuente: archivo.name });
  };

  const aplicar = () => {
    if (!importacion) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevos = new Map(importacion.cambios.map((c) => [c.insumo.id, c.fila.precio]));
    setEstado((e) => ({
      ...e,
      catalogo: {
        ...e.catalogo,
        insumos: e.catalogo.insumos.map((i) =>
          nuevos.has(i.id) ? { ...i, precio: nuevos.get(i.id)!, fechaPrecio: hoy, fuente: importacion.fuente } : i,
        ),
      },
    }));
    setImportacion(null);
  };

  return (
    <>
      <section className="tarjeta">
        <h3>Importar lista de precios (CSV)</h3>
        <p className="tenue">
          Exportá la lista del corralón desde Excel como CSV. Columnas: código (opcional), descripción, unidad, precio
          sin IVA. Se cruza por código y, si no hay, por descripción exacta.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])} />
        {importacion && (
          <div className="propuesta">
            {importacion.errores.map((err) => (
              <p key={err} className="error">
                {err}
              </p>
            ))}
            {importacion.cambios.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th className="num">Precio actual</th>
                    <th className="num">Precio nuevo</th>
                    <th className="num">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {importacion.cambios.map((c) => (
                    <tr key={c.insumo.id} className={Math.abs(c.variacion) > 20 ? "alerta" : ""}>
                      <td>{c.insumo.descripcion}</td>
                      <td className="num">{formatoPesos.format(c.insumo.precio)}</td>
                      <td className="num">{formatoPesos.format(c.fila.precio)}</td>
                      <td className="num">
                        {c.variacion > 0 ? "+" : ""}
                        {c.variacion.toFixed(1)} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {importacion.sinCoincidencia.length > 0 && (
              <details>
                <summary>{importacion.sinCoincidencia.length} filas sin coincidencia (no se importan)</summary>
                <ul>
                  {importacion.sinCoincidencia.map((f, i) => (
                    <li key={i}>
                      {f.codigo} {f.descripcion} — {formatoPesos.format(f.precio)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="acciones">
              <button onClick={aplicar} disabled={importacion.cambios.length === 0}>
                Actualizar {importacion.cambios.length} precios
              </button>
              <button className="secundario" onClick={() => setImportacion(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="tarjeta">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Un.</th>
              <th className="num">Precio s/IVA</th>
              <th>Actualizado</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => (
              <tr key={i.id}>
                <td>{i.codigo}</td>
                <td>{i.descripcion}</td>
                <td>{TIPOS[i.tipo]}</td>
                <td>{i.unidad}</td>
                <td className="num">
                  <input
                    type="number"
                    step="any"
                    className="cantidad"
                    value={i.precio}
                    onChange={(e) =>
                      actualizarInsumo(i.id, {
                        precio: Number(e.target.value),
                        fechaPrecio: new Date().toISOString().slice(0, 10),
                        fuente: "Carga manual",
                      })
                    }
                  />
                </td>
                <td>{i.fechaPrecio}</td>
                <td className="tenue">{i.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
