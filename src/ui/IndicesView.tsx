import { useState } from "react";
import { calcularPresupuesto, formatoPesos } from "../domain/calculo";
import { factorAjuste } from "../domain/indices";
import type { Presupuesto } from "../domain/types";
import type { Estado, SetEstado } from "../store/store";

interface Props {
  estado: Estado;
  setEstado: SetEstado;
  presupuesto?: Presupuesto;
}

/**
 * Carga manual de índices (CAC, ICC-INDEC, IIC CABA…) y redeterminación del
 * total de un presupuesto entre dos períodos.
 */
export function IndicesView({ estado, setEstado, presupuesto }: Props) {
  const [nuevo, setNuevo] = useState({ indice: "CAC", periodo: "", valor: "" });
  const [ajuste, setAjuste] = useState({ indice: "CAC", base: "", actual: "" });

  const nombres = [...new Set(estado.indices.map((v) => v.indice))];
  const ordenados = [...estado.indices].sort((a, b) => a.indice.localeCompare(b.indice) || a.periodo.localeCompare(b.periodo));
  const periodos = ordenados.filter((v) => v.indice === ajuste.indice).map((v) => v.periodo);

  const agregar = () => {
    const valor = Number(nuevo.valor.replace(",", "."));
    if (!nuevo.indice || !/^\d{4}-\d{2}$/.test(nuevo.periodo) || !(valor > 0)) return;
    setEstado((e) => ({
      ...e,
      indices: [
        ...e.indices.filter((v) => !(v.indice === nuevo.indice && v.periodo === nuevo.periodo)),
        { indice: nuevo.indice, periodo: nuevo.periodo, valor },
      ],
    }));
    setNuevo({ ...nuevo, periodo: "", valor: "" });
  };

  let resultado: string | null = null;
  if (presupuesto && ajuste.base && ajuste.actual) {
    try {
      const factor = factorAjuste(estado.indices, ajuste.indice, ajuste.base, ajuste.actual);
      const total = calcularPresupuesto(presupuesto, estado.catalogo).total;
      resultado = `Factor ${factor.toFixed(4)} (${((factor - 1) * 100).toFixed(2)} %). “${presupuesto.nombre}”: ${formatoPesos.format(total)} → ${formatoPesos.format(total * factor)}`;
    } catch (err) {
      resultado = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <>
      <section className="tarjeta">
        <h3>Cargar valor de índice</h3>
        <div className="acciones">
          <input
            list="nombres-indices"
            placeholder="Índice"
            value={nuevo.indice}
            onChange={(e) => setNuevo({ ...nuevo, indice: e.target.value })}
          />
          <datalist id="nombres-indices">
            {["CAC", "ICC-INDEC", "IIC-CABA", ...nombres].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <input type="month" value={nuevo.periodo} onChange={(e) => setNuevo({ ...nuevo, periodo: e.target.value })} />
          <input placeholder="Valor" value={nuevo.valor} onChange={(e) => setNuevo({ ...nuevo, valor: e.target.value })} />
          <button onClick={agregar}>Guardar</button>
        </div>
        {ordenados.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Índice</th>
                <th>Período</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((v) => (
                <tr key={`${v.indice}-${v.periodo}`}>
                  <td>{v.indice}</td>
                  <td>{v.periodo}</td>
                  <td className="num">{v.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tarjeta">
        <h3>Redeterminar presupuesto</h3>
        <div className="acciones">
          <select value={ajuste.indice} onChange={(e) => setAjuste({ indice: e.target.value, base: "", actual: "" })}>
            {(nombres.length ? nombres : ["CAC"]).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <select value={ajuste.base} onChange={(e) => setAjuste({ ...ajuste, base: e.target.value })}>
            <option value="">Período base…</option>
            {periodos.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={ajuste.actual} onChange={(e) => setAjuste({ ...ajuste, actual: e.target.value })}>
            <option value="">Período actual…</option>
            {periodos.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {resultado && <p>{resultado}</p>}
      </section>
    </>
  );
}
