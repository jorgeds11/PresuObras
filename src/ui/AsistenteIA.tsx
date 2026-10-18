import { useState } from "react";
import type { PropuestaIA, SolicitudGenerar } from "../domain/ia";
import type { Catalogo, ItemPresupuesto } from "../domain/types";

interface Props {
  catalogo: Catalogo;
  onAceptar: (items: Omit<ItemPresupuesto, "id">[]) => void;
}

/**
 * Arma una propuesta de ítems a partir de una descripción de obra.
 * Nada se agrega al presupuesto hasta que el usuario lo revisa y acepta.
 */
export function AsistenteIA({ catalogo, onAceptar }: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [propuesta, setPropuesta] = useState<PropuestaIA | null>(null);
  const [elegidos, setElegidos] = useState<boolean[]>([]);

  const porCodigo = new Map(catalogo.apus.map((a) => [a.codigo, a]));

  const generar = async () => {
    setCargando(true);
    setError("");
    setPropuesta(null);
    try {
      const cuerpo: SolicitudGenerar = {
        descripcionObra: descripcion,
        catalogo: catalogo.apus.map(({ codigo, rubro, descripcion, unidad }) => ({ codigo, rubro, descripcion, unidad })),
      };
      const res = await fetch("/api/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await res.json().catch(() => null);
      if (!datos) {
        throw new Error("El asistente IA necesita el servidor de la app (npm run dev); no está disponible en esta demo.");
      }
      if (!res.ok) throw new Error(datos.error ?? "Error al generar la propuesta");
      setPropuesta(datos);
      setElegidos(datos.items.map(() => true));
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "No se pudo conectar con el servidor del asistente IA. En esta demo no está disponible."
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setCargando(false);
    }
  };

  const aceptar = () => {
    if (!propuesta) return;
    onAceptar(
      propuesta.items
        .filter((_, i) => elegidos[i])
        .map((i) => ({ apuId: porCodigo.get(i.codigo)!.id, cantidad: i.cantidad, observacion: i.calculo })),
    );
    setPropuesta(null);
    setDescripcion("");
  };

  return (
    <details className="tarjeta asistente">
      <summary>Asistente IA: armar ítems desde una descripción de obra</summary>
      <textarea
        rows={4}
        placeholder="Ej.: Ampliación de un dormitorio de 3×4 m en planta baja, muros de ladrillo hueco de 18, altura 2,60 m, una puerta y una ventana, piso cerámico, techo de losa con membrana."
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <div className="acciones">
        <button onClick={generar} disabled={cargando || descripcion.trim().length < 10}>
          {cargando ? "Generando…" : "Generar propuesta"}
        </button>
        <span className="tenue">La IA solo elige análisis del catálogo y estima cantidades; no inventa precios ni rendimientos.</span>
      </div>
      {error && <p className="error">{error}</p>}

      {propuesta && (
        <div className="propuesta">
          <table>
            <thead>
              <tr>
                <th />
                <th>Ítem</th>
                <th className="num">Cantidad</th>
                <th>Cálculo</th>
              </tr>
            </thead>
            <tbody>
              {propuesta.items.map((item, i) => {
                const apu = porCodigo.get(item.codigo);
                return (
                  <tr key={i}>
                    <td>
                      <input
                        type="checkbox"
                        checked={elegidos[i]}
                        onChange={(e) => setElegidos(elegidos.map((v, j) => (j === i ? e.target.checked : v)))}
                      />
                    </td>
                    <td>
                      {item.codigo} · {apu?.descripcion}
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        step="any"
                        className="cantidad"
                        value={item.cantidad}
                        onChange={(e) =>
                          setPropuesta({
                            ...propuesta,
                            items: propuesta.items.map((x, j) => (j === i ? { ...x, cantidad: Number(e.target.value) } : x)),
                          })
                        }
                      />{" "}
                      {apu?.unidad}
                    </td>
                    <td className="tenue">{item.calculo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {propuesta.supuestos.length > 0 && (
            <>
              <h4>Supuestos</h4>
              <ul>
                {propuesta.supuestos.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {propuesta.faltantes.length > 0 && (
            <>
              <h4>Trabajos sin análisis en el catálogo</h4>
              <ul>
                {propuesta.faltantes.map((f, i) => (
                  <li key={i}>
                    <strong>{f.descripcion}</strong> {f.unidad && `(${f.unidad})`}: {f.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button onClick={aceptar} disabled={!elegidos.some(Boolean)}>
            Agregar ítems seleccionados
          </button>
        </div>
      )}
    </details>
  );
}
