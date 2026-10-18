import { useState } from "react";
import { costoAPU, ErrorCalculo, formatoNumero, formatoPesos } from "../domain/calculo";
import type { APU, ComponenteAPU } from "../domain/types";
import { nuevoId, type Estado, type SetEstado } from "../store/store";

interface Props {
  estado: Estado;
  setEstado: SetEstado;
}

export function CatalogoView({ estado, setEstado }: Props) {
  const { catalogo } = estado;
  const [filtro, setFiltro] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const actualizarApu = (id: string, cambios: Partial<APU>) =>
    setEstado((e) => ({
      ...e,
      catalogo: { ...e.catalogo, apus: e.catalogo.apus.map((a) => (a.id === id ? { ...a, ...cambios } : a)) },
    }));

  const nuevoApu = () => {
    const id = nuevoId();
    const apu: APU = {
      id,
      codigo: `NUEVO-${id}`,
      rubro: "Sin rubro",
      descripcion: "Análisis nuevo",
      unidad: "m²",
      componentes: [],
      validado: false,
      fuente: "",
    };
    setEstado((e) => ({ ...e, catalogo: { ...e.catalogo, apus: [...e.catalogo.apus, apu] } }));
    setAbierto(id);
  };

  const visibles = catalogo.apus.filter((a) =>
    `${a.codigo} ${a.rubro} ${a.descripcion}`.toLowerCase().includes(filtro.toLowerCase()),
  );
  const rubros = [...new Set(visibles.map((a) => a.rubro))];
  const validados = catalogo.apus.filter((a) => a.validado).length;

  return (
    <section className="tarjeta">
      <div className="acciones">
        <input placeholder="Buscar análisis…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <button onClick={nuevoApu}>+ Nuevo análisis</button>
        <span className="tenue">
          {validados} de {catalogo.apus.length} análisis validados
        </span>
      </div>
      {rubros.map((rubro) => (
        <div key={rubro}>
          <h3>{rubro}</h3>
          {visibles
            .filter((a) => a.rubro === rubro)
            .map((a) => (
              <FilaAPU
                key={a.id}
                apu={a}
                estado={estado}
                abierto={abierto === a.id}
                onAbrir={() => setAbierto(abierto === a.id ? null : a.id)}
                onCambiar={(c) => actualizarApu(a.id, c)}
              />
            ))}
        </div>
      ))}
    </section>
  );
}

interface FilaProps {
  apu: APU;
  estado: Estado;
  abierto: boolean;
  onAbrir: () => void;
  onCambiar: (cambios: Partial<APU>) => void;
}

function FilaAPU({ apu, estado, abierto, onAbrir, onCambiar }: FilaProps) {
  const { catalogo } = estado;
  const [nuevoRef, setNuevoRef] = useState("");
  let costo: ReturnType<typeof costoAPU> | null = null;
  let error = "";
  try {
    costo = costoAPU(apu.id, catalogo);
  } catch (err) {
    if (!(err instanceof ErrorCalculo)) throw err;
    error = err.message;
  }

  const cambiarComponente = (i: number, cambios: Partial<ComponenteAPU>) =>
    onCambiar({ componentes: apu.componentes.map((c, j) => (j === i ? { ...c, ...cambios } : c)) });

  const nombreRef = (c: ComponenteAPU) => {
    const refId = c.ref.id;
    if (c.ref.tipo === "insumo") {
      const i = catalogo.insumos.find((x) => x.id === refId);
      return i ? { texto: i.descripcion, unidad: i.unidad, precio: i.precio } : { texto: "¿?", unidad: "", precio: 0 };
    }
    const a = catalogo.apus.find((x) => x.id === refId);
    let precio = 0;
    try {
      precio = costoAPU(refId, catalogo).total;
    } catch {
      // El error de cálculo ya se muestra a nivel del análisis.
    }
    return a ? { texto: `[Sub] ${a.descripcion}`, unidad: a.unidad, precio } : { texto: "¿?", unidad: "", precio: 0 };
  };

  return (
    <div className={`apu ${apu.validado ? "" : "sin-validar"}`}>
      <button className="cabecera-apu" onClick={onAbrir}>
        <span>
          <strong>{apu.codigo}</strong> · {apu.descripcion} ({apu.unidad})
        </span>
        <span>
          {!apu.validado && <span className="etiqueta">sin validar</span>}
          {costo ? formatoPesos.format(costo.total) : <span className="error">{error}</span>}
        </span>
      </button>
      {abierto && (
        <div className="detalle-apu">
          <div className="grilla-datos">
            <label>
              Código
              <input value={apu.codigo} onChange={(e) => onCambiar({ codigo: e.target.value })} />
            </label>
            <label>
              Rubro
              <input value={apu.rubro} onChange={(e) => onCambiar({ rubro: e.target.value })} />
            </label>
            <label className="ancho">
              Descripción
              <input value={apu.descripcion} onChange={(e) => onCambiar({ descripcion: e.target.value })} />
            </label>
            <label>
              Unidad
              <input value={apu.unidad} onChange={(e) => onCambiar({ unidad: e.target.value })} />
            </label>
          </div>
          <table>
            <thead>
              <tr>
                <th>Componente</th>
                <th className="num">Cantidad</th>
                <th>Un.</th>
                <th className="num">Desp. %</th>
                <th className="num">Precio</th>
                <th className="num">Parcial</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {apu.componentes.map((c, i) => {
                const ref = nombreRef(c);
                const desp = 1 + (c.desperdicio ?? 0) / 100;
                return (
                  <tr key={i}>
                    <td>{ref.texto}</td>
                    <td className="num">
                      <input
                        type="number"
                        step="any"
                        className="cantidad"
                        value={c.cantidad}
                        onChange={(e) => cambiarComponente(i, { cantidad: Number(e.target.value) })}
                      />
                    </td>
                    <td>{ref.unidad}</td>
                    <td className="num">
                      <input
                        type="number"
                        step="1"
                        className="cantidad corta"
                        value={c.desperdicio ?? 0}
                        onChange={(e) => cambiarComponente(i, { desperdicio: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num">{formatoPesos.format(ref.precio)}</td>
                    <td className="num">{formatoPesos.format(c.cantidad * desp * ref.precio)}</td>
                    <td>
                      <button
                        className="icono"
                        onClick={() => onCambiar({ componentes: apu.componentes.filter((_, j) => j !== i) })}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {costo && (
            <p className="tenue">
              Materiales {formatoPesos.format(costo.material)} · Mano de obra {formatoPesos.format(costo.mano_obra)} ·
              Equipos {formatoPesos.format(costo.equipo)}
              {apu.componentes.map((c) => {
                // Rendimiento por jornada de 8 h: la forma en que un maestro mayor de obras lo controla.
                const refId = c.ref.id;
                const mo = c.ref.tipo === "insumo" && catalogo.insumos.find((i) => i.id === refId);
                return mo && mo.tipo === "mano_obra" && mo.unidad === "h" && c.cantidad > 0
                  ? ` · ${mo.descripcion.split(" (")[0]}: ${formatoNumero.format(8 / c.cantidad)} ${apu.unidad}/jornada`
                  : "";
              })}
            </p>
          )}
          <div className="agregar">
            <select value={nuevoRef} onChange={(e) => setNuevoRef(e.target.value)}>
              <option value="">Agregar componente…</option>
              <optgroup label="Insumos">
                {catalogo.insumos.map((i) => (
                  <option key={i.id} value={`insumo:${i.id}`}>
                    {i.descripcion} ({i.unidad})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Subanálisis">
                {catalogo.apus
                  .filter((a) => a.id !== apu.id)
                  .map((a) => (
                    <option key={a.id} value={`apu:${a.id}`}>
                      {a.descripcion} ({a.unidad})
                    </option>
                  ))}
              </optgroup>
            </select>
            <button
              disabled={!nuevoRef}
              onClick={() => {
                const [tipo, id] = nuevoRef.split(":") as ["insumo" | "apu", string];
                onCambiar({ componentes: [...apu.componentes, { ref: { tipo, id }, cantidad: 1 }] });
                setNuevoRef("");
              }}
            >
              Agregar
            </button>
          </div>
          <div className="grilla-datos validacion">
            <label className="ancho">
              Fuente de los rendimientos
              <input
                value={apu.fuente}
                placeholder="Ej.: revisado por Arq. … / publicación …"
                onChange={(e) => onCambiar({ fuente: e.target.value })}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={apu.validado}
                onChange={(e) => {
                  if (e.target.checked && !apu.fuente.trim()) {
                    alert("Indicá quién o qué fuente validó los rendimientos antes de marcarlo como validado.");
                    return;
                  }
                  onCambiar({ validado: e.target.checked });
                }}
              />
              Validado por un profesional
            </label>
          </div>
          {apu.notas && <p className="tenue">Notas: {apu.notas}</p>}
        </div>
      )}
    </div>
  );
}
