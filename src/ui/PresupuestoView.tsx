import { useMemo, useState } from "react";
import { calcularPresupuesto, ErrorCalculo, formatoNumero, formatoPesos } from "../domain/calculo";
import type { Coeficientes, ItemPresupuesto, Presupuesto } from "../domain/types";
import { nuevoId, type Estado, type SetEstado } from "../store/store";
import { AsistenteIA } from "./AsistenteIA";
import { Impresion } from "./Impresion";

interface Props {
  presupuesto: Presupuesto;
  estado: Estado;
  setEstado: SetEstado;
}

const COEFICIENTES: [keyof Coeficientes, string][] = [
  ["gastosGenerales", "Gastos generales %"],
  ["gastosFinancieros", "Gastos financieros %"],
  ["beneficio", "Beneficio %"],
  ["iva", "IVA %"],
];

export function PresupuestoView({ presupuesto: p, estado, setEstado }: Props) {
  const [apuNuevo, setApuNuevo] = useState("");
  const { catalogo } = estado;

  const actualizar = (cambios: Partial<Presupuesto>) =>
    setEstado((e) => ({
      ...e,
      presupuestos: e.presupuestos.map((x) => (x.id === p.id ? { ...x, ...cambios } : x)),
    }));
  const actualizarItem = (id: string, cambios: Partial<ItemPresupuesto>) =>
    actualizar({ items: p.items.map((i) => (i.id === id ? { ...i, ...cambios } : i)) });
  const agregarItems = (nuevos: Omit<ItemPresupuesto, "id">[]) =>
    actualizar({ items: [...p.items, ...nuevos.map((n) => ({ ...n, id: nuevoId() }))] });

  const guardarVersion = () =>
    setEstado((e) => ({
      ...e,
      versiones: [
        ...e.versiones,
        { presupuestoId: p.id, version: p.version, guardado: new Date().toISOString(), presupuesto: p, catalogo: e.catalogo },
      ],
      presupuestos: e.presupuestos.map((x) => (x.id === p.id ? { ...x, version: x.version + 1 } : x)),
    }));

  const calculo = useMemo(() => {
    try {
      return { resumen: calcularPresupuesto(p, catalogo) };
    } catch (err) {
      if (err instanceof ErrorCalculo) return { error: err.message };
      throw err;
    }
  }, [p, catalogo]);

  const versiones = estado.versiones.filter((v) => v.presupuestoId === p.id);
  const trabajos = catalogo.apus.filter((a) => a.rubro !== "Subanálisis");

  if ("error" in calculo) return <p className="error">{calculo.error}</p>;
  const r = calculo.resumen;

  return (
    <>
      <div className="no-print">
        <section className="tarjeta grilla-datos">
          <label>
            Obra
            <input value={p.nombre} onChange={(e) => actualizar({ nombre: e.target.value })} />
          </label>
          <label>
            Cliente
            <input value={p.cliente} onChange={(e) => actualizar({ cliente: e.target.value })} />
          </label>
          <label>
            Ubicación
            <input value={p.ubicacion} onChange={(e) => actualizar({ ubicacion: e.target.value })} />
          </label>
          <label>
            Fecha
            <input type="date" value={p.fecha} onChange={(e) => actualizar({ fecha: e.target.value })} />
          </label>
          {COEFICIENTES.map(([clave, texto]) => (
            <label key={clave}>
              {texto}
              <input
                type="number"
                step="0.5"
                value={p.coeficientes[clave]}
                onChange={(e) => actualizar({ coeficientes: { ...p.coeficientes, [clave]: Number(e.target.value) } })}
              />
            </label>
          ))}
        </section>

        {r.itemsSinValidar > 0 && (
          <p className="aviso">
            {r.itemsSinValidar} de {p.items.length} ítems usan análisis sin validar por un profesional. Revisalos en
            “Análisis de precios” antes de enviar el presupuesto.
          </p>
        )}

        <AsistenteIA catalogo={catalogo} onAceptar={agregarItems} />

        <section className="tarjeta">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Un.</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo unit.</th>
                <th className="num">Precio unit.</th>
                <th className="num">Subtotal</th>
                <th />
              </tr>
            </thead>
            {r.rubros.map((rubro) => (
              <tbody key={rubro.rubro}>
                <tr className="rubro">
                  <td colSpan={6}>
                    {rubro.rubro} <span className="tenue">({(rubro.incidencia * 100).toFixed(1)} %)</span>
                  </td>
                  <td className="num">{formatoPesos.format(rubro.subtotalPrecio)}</td>
                  <td />
                </tr>
                {rubro.lineas.map((l) => (
                  <tr key={l.itemId}>
                    <td>
                      {l.apu.codigo}
                      {!l.apu.validado && (
                        <span className="marca" title="Análisis sin validar">
                          !
                        </span>
                      )}
                    </td>
                    <td>{l.apu.descripcion}</td>
                    <td>{l.apu.unidad}</td>
                    <td className="num">
                      <input
                        type="number"
                        step="any"
                        className="cantidad"
                        value={l.cantidad}
                        onChange={(e) => actualizarItem(l.itemId, { cantidad: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num" title={`Mat. ${formatoPesos.format(l.desglose.material)} · MO ${formatoPesos.format(l.desglose.mano_obra)} · Eq. ${formatoPesos.format(l.desglose.equipo)}`}>
                      {formatoPesos.format(l.unitarioDirecto)}
                    </td>
                    <td className="num">{formatoPesos.format(l.unitarioPrecio)}</td>
                    <td className="num">{formatoPesos.format(l.subtotalPrecio)}</td>
                    <td>
                      <button
                        className="icono"
                        title="Quitar ítem"
                        onClick={() => actualizar({ items: p.items.filter((i) => i.id !== l.itemId) })}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>

          <div className="agregar">
            <select value={apuNuevo} onChange={(e) => setApuNuevo(e.target.value)}>
              <option value="">Agregar ítem del catálogo…</option>
              {trabajos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.descripcion} ({a.unidad})
                </option>
              ))}
            </select>
            <button
              disabled={!apuNuevo}
              onClick={() => {
                agregarItems([{ apuId: apuNuevo, cantidad: 1 }]);
                setApuNuevo("");
              }}
            >
              Agregar
            </button>
          </div>
        </section>

        <section className="tarjeta resumen">
          <dl>
            <dt>Materiales</dt>
            <dd>{formatoPesos.format(r.porTipo.material)}</dd>
            <dt>Mano de obra</dt>
            <dd>{formatoPesos.format(r.porTipo.mano_obra)}</dd>
            <dt>Equipos</dt>
            <dd>{formatoPesos.format(r.porTipo.equipo)}</dd>
            <dt className="fuerte">Costo directo</dt>
            <dd className="fuerte">{formatoPesos.format(r.costoDirecto)}</dd>
            <dt>Gastos generales</dt>
            <dd>{formatoPesos.format(r.gastosGenerales)}</dd>
            <dt>Gastos financieros</dt>
            <dd>{formatoPesos.format(r.gastosFinancieros)}</dd>
            <dt>Beneficio</dt>
            <dd>{formatoPesos.format(r.beneficio)}</dd>
            <dt className="fuerte">Subtotal sin IVA</dt>
            <dd className="fuerte">{formatoPesos.format(r.subtotalSinIva)}</dd>
            <dt>IVA</dt>
            <dd>{formatoPesos.format(r.iva)}</dd>
            <dt className="total">Total</dt>
            <dd className="total">{formatoPesos.format(r.total)}</dd>
          </dl>
          <p className="tenue">
            Coeficiente de pase sin IVA: {formatoNumero.format(r.costoDirecto > 0 ? r.subtotalSinIva / r.costoDirecto : 0)}
          </p>
          <div className="acciones">
            <button onClick={guardarVersion}>Guardar versión {p.version}</button>
            <button onClick={() => window.print()}>Imprimir / PDF para el cliente</button>
          </div>
          {versiones.length > 0 && (
            <details>
              <summary>Versiones guardadas ({versiones.length})</summary>
              <ul>
                {versiones.map((v) => (
                  <li key={v.guardado}>
                    v{v.version} · {new Date(v.guardado).toLocaleString("es-AR")} ·{" "}
                    {formatoPesos.format(calcularPresupuesto(v.presupuesto, v.catalogo).total)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>

      <Impresion presupuesto={p} resumen={r} />
    </>
  );
}
