import { formatoNumero, formatoPesos, type ResumenPresupuesto } from "../domain/calculo";
import type { Presupuesto } from "../domain/types";

/** Vista para el cliente: se imprime (Imprimir → Guardar como PDF) y se puede previsualizar en pantalla. */
export function Impresion({
  presupuesto: p,
  resumen: r,
  enPantalla = false,
}: {
  presupuesto: Presupuesto;
  resumen: ResumenPresupuesto;
  /** Muestra la vista del cliente también en pantalla, además de al imprimir. */
  enPantalla?: boolean;
}) {
  return (
    <article className={`solo-print impresion ${enPantalla ? "en-pantalla" : ""}`}>
      <header>
        <h1>Presupuesto</h1>
        <p className="obra">{p.nombre}</p>
        <dl className="datos">
          {p.cliente && (
            <>
              <dt>Cliente</dt>
              <dd>{p.cliente}</dd>
            </>
          )}
          {p.ubicacion && (
            <>
              <dt>Ubicación</dt>
              <dd>{p.ubicacion}</dd>
            </>
          )}
          <dt>Fecha</dt>
          <dd>{new Date(p.fecha + "T12:00:00").toLocaleDateString("es-AR")}</dd>
          <dt>Versión</dt>
          <dd>{p.version}</dd>
        </dl>
      </header>

      <table>
        <thead>
          <tr>
            <th>Ítem</th>
            <th>Descripción</th>
            <th>Un.</th>
            <th className="num">Cant.</th>
            <th className="num">P. unitario</th>
            <th className="num">Importe</th>
          </tr>
        </thead>
        {r.rubros.map((rubro, i) => (
          <tbody key={rubro.rubro}>
            <tr className="rubro">
              <td>{i + 1}</td>
              <td colSpan={4}>{rubro.rubro}</td>
              <td className="num">{formatoPesos.format(rubro.subtotalPrecio)}</td>
            </tr>
            {rubro.lineas.map((l, j) => (
              <tr key={l.itemId}>
                <td>
                  {i + 1}.{j + 1}
                </td>
                <td>{l.apu.descripcion}</td>
                <td>{l.apu.unidad}</td>
                <td className="num">{formatoNumero.format(l.cantidad)}</td>
                <td className="num">{formatoPesos.format(l.unitarioPrecio)}</td>
                <td className="num">{formatoPesos.format(l.subtotalPrecio)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <dl className="totales">
        <dt>Subtotal</dt>
        <dd>{formatoPesos.format(r.subtotalSinIva)}</dd>
        <dt>IVA ({p.coeficientes.iva} %)</dt>
        <dd>{formatoPesos.format(r.iva)}</dd>
        <dt className="total">Total</dt>
        <dd className="total">{formatoPesos.format(r.total)}</dd>
      </dl>

      <footer>
        Precios válidos por 15 días desde la fecha de emisión. Sujetos a redeterminación según índice de costo de la
        construcción.
      </footer>
    </article>
  );
}
