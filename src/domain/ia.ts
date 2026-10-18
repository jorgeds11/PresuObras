import * as z from "zod/v4";

/*
 * Contrato entre la app y el asistente IA.
 *
 * La IA NO inventa análisis de precio ni rendimientos: solo puede elegir
 * análisis existentes del catálogo (por código) y estimar cantidades a partir
 * de la descripción de la obra. Lo que no encuentra en el catálogo lo devuelve
 * como "faltante" para que el profesional decida.
 */

export interface EntradaCatalogoIA {
  codigo: string;
  rubro: string;
  descripcion: string;
  unidad: string;
}

export interface SolicitudGenerar {
  descripcionObra: string;
  catalogo: EntradaCatalogoIA[];
}

export const PropuestaIASchema = z.object({
  items: z.array(
    z.object({
      codigo: z.string().describe("Código exacto de un análisis del catálogo"),
      cantidad: z.number().describe("Cantidad en la unidad del análisis"),
      calculo: z.string().describe("Cómo se obtuvo la cantidad, p. ej. '(4+3)×2×2,6 − aberturas 3,2 = 33,2 m²'"),
    }),
  ),
  faltantes: z.array(
    z.object({
      descripcion: z.string(),
      unidad: z.string(),
      motivo: z.string().describe("Por qué hace falta y no hay un análisis adecuado en el catálogo"),
    }),
  ),
  supuestos: z.array(z.string()).describe("Supuestos tomados por falta de datos (alturas, espesores, etc.)"),
});

export type PropuestaIA = z.infer<typeof PropuestaIASchema>;
