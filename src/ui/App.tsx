import { useState } from "react";
import { useEstado, nuevoId } from "../store/store";
import type { Presupuesto } from "../domain/types";
import { PresupuestoView } from "./PresupuestoView";
import { CatalogoView } from "./CatalogoView";
import { InsumosView } from "./InsumosView";
import { IndicesView } from "./IndicesView";

type Pestana = "presupuesto" | "catalogo" | "insumos" | "indices";

const PESTANAS: [Pestana, string][] = [
  ["presupuesto", "Presupuesto"],
  ["catalogo", "Análisis de precios"],
  ["insumos", "Insumos y precios"],
  ["indices", "Índices"],
];

export function App() {
  const [estado, setEstado, reiniciar] = useEstado();
  const [pestana, setPestana] = useState<Pestana>("presupuesto");
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [actualId, setActualId] = useState(estado.presupuestos[0]?.id);
  const actual = estado.presupuestos.find((p) => p.id === actualId) ?? estado.presupuestos[0];

  const nuevoPresupuesto = () => {
    const p: Presupuesto = {
      id: nuevoId(),
      nombre: "Presupuesto nuevo",
      cliente: "",
      ubicacion: "",
      fecha: new Date().toISOString().slice(0, 10),
      coeficientes: { gastosGenerales: 15, gastosFinancieros: 2, beneficio: 10, iva: 21 },
      items: [],
      version: 1,
    };
    setEstado((e) => ({ ...e, presupuestos: [...e.presupuestos, p] }));
    setActualId(p.id);
    setPestana("presupuesto");
  };

  return (
    <div className="app">
      <header className="barra no-print">
        <h1>PresuObras</h1>
        <nav>
          {PESTANAS.map(([id, texto]) => (
            <button key={id} className={pestana === id ? "activa" : ""} onClick={() => setPestana(id)}>
              {texto}
            </button>
          ))}
        </nav>
        {confirmarReinicio ? (
          <span className="confirmar">
            ¿Borrar tus datos y volver al ejemplo?
            <button
              onClick={() => {
                reiniciar();
                setConfirmarReinicio(false);
              }}
            >
              Sí, borrar
            </button>
            <button className="secundario" onClick={() => setConfirmarReinicio(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button className="secundario" onClick={() => setConfirmarReinicio(true)}>
            Restablecer datos
          </button>
        )}
      </header>

      <main>
        {pestana === "presupuesto" && (
          <>
            <div className="selector no-print">
              <select value={actual?.id} onChange={(e) => setActualId(e.target.value)}>
                {estado.presupuestos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (v{p.version})
                  </option>
                ))}
              </select>
              <button onClick={nuevoPresupuesto}>+ Nuevo presupuesto</button>
            </div>
            {actual && <PresupuestoView presupuesto={actual} estado={estado} setEstado={setEstado} />}
          </>
        )}
        {pestana === "catalogo" && <CatalogoView estado={estado} setEstado={setEstado} />}
        {pestana === "insumos" && <InsumosView estado={estado} setEstado={setEstado} />}
        {pestana === "indices" && <IndicesView estado={estado} setEstado={setEstado} presupuesto={actual} />}
      </main>
    </div>
  );
}
