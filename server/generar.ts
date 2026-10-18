import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { PropuestaIASchema, type PropuestaIA, type SolicitudGenerar } from "../src/domain/ia";

export class SolicitudInvalida extends Error {}

const client = new Anthropic();

const SYSTEM = `Sos un asistente de cómputo y presupuesto de obras para arquitectos y constructores en Argentina.

A partir de la descripción de una obra, armás la lista de ítems a presupuestar usando EXCLUSIVAMENTE los análisis de precio del catálogo que te pasan.

Reglas:
- Usá solo códigos que figuren en el catálogo, escritos exactamente igual.
- No inventes precios, consumos ni rendimientos: esos ya están en los análisis y los revisa un profesional.
- Estimá cada cantidad en la unidad del análisis y explicá el cálculo en "calculo" (medidas, descuentos de aberturas, etc.).
- Si la obra necesita un trabajo que no tiene un análisis adecuado en el catálogo, no lo fuerces en otro código: ponelo en "faltantes".
- Si faltan datos (altura de muros, espesores, terminaciones), tomá un supuesto razonable y anotalo en "supuestos".
- No incluyas subanálisis (rubro "Subanálisis"): ya están dentro de los análisis que los usan.`;

function validarSolicitud(cuerpo: unknown): SolicitudGenerar {
  const s = cuerpo as Partial<SolicitudGenerar> | null;
  if (!s || typeof s.descripcionObra !== "string" || s.descripcionObra.trim().length < 10) {
    throw new SolicitudInvalida("Describí la obra con un poco más de detalle.");
  }
  if (!Array.isArray(s.catalogo) || s.catalogo.length === 0) {
    throw new SolicitudInvalida("El catálogo está vacío.");
  }
  return { descripcionObra: s.descripcionObra, catalogo: s.catalogo };
}

export async function generarPropuesta(cuerpo: unknown): Promise<PropuestaIA> {
  const { descripcionObra, catalogo } = validarSolicitud(cuerpo);
  const listado = catalogo
    .filter((a) => a.rubro !== "Subanálisis")
    .map((a) => `${a.codigo} | ${a.rubro} | ${a.descripcion} | ${a.unidad}`)
    .join("\n");

  const respuesta = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: betaZodOutputFormat(PropuestaIASchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `<catalogo>\ncódigo | rubro | descripción | unidad\n${listado}\n</catalogo>\n\n<obra>\n${descripcionObra}\n</obra>`,
      },
    ],
  });

  if (respuesta.stop_reason === "refusal") throw new Error("El modelo rechazó la solicitud.");
  if (respuesta.stop_reason === "max_tokens") throw new Error("La respuesta quedó truncada.");
  const propuesta = respuesta.parsed_output;
  if (!propuesta) throw new Error("La respuesta no respetó el formato esperado.");

  // Defensa adicional: cualquier código que no exista en el catálogo pasa a faltantes.
  const codigos = new Map(catalogo.map((a) => [a.codigo, a]));
  const items = propuesta.items.filter((i) => codigos.has(i.codigo) && i.cantidad > 0);
  const descartados = propuesta.items.filter((i) => !codigos.has(i.codigo));
  return {
    items,
    faltantes: [
      ...propuesta.faltantes,
      ...descartados.map((i) => ({ descripcion: i.codigo, unidad: "", motivo: `Código inexistente en el catálogo. ${i.calculo}` })),
    ],
    supuestos: propuesta.supuestos,
  };
}
