import type { ValorIndice } from "./types";

/** Busca el valor de un índice para un período YYYY-MM. */
export function valorIndice(serie: ValorIndice[], indice: string, periodo: string): number | undefined {
  return serie.find((v) => v.indice === indice && v.periodo === periodo)?.valor;
}

/**
 * Factor de redeterminación entre dos períodos: índice actual / índice base.
 * Un presupuesto de $100 con base 1000 y actual 1150 pasa a $115.
 */
export function factorAjuste(serie: ValorIndice[], indice: string, periodoBase: string, periodoActual: string): number {
  const base = valorIndice(serie, indice, periodoBase);
  const actual = valorIndice(serie, indice, periodoActual);
  if (base === undefined) throw new Error(`Falta el valor de ${indice} para ${periodoBase}`);
  if (actual === undefined) throw new Error(`Falta el valor de ${indice} para ${periodoActual}`);
  if (base <= 0) throw new Error(`Valor base inválido para ${indice} ${periodoBase}`);
  return actual / base;
}

/** Variación porcentual entre dos períodos (15 = +15 %). */
export function variacionPorcentual(serie: ValorIndice[], indice: string, periodoBase: string, periodoActual: string): number {
  return (factorAjuste(serie, indice, periodoBase, periodoActual) - 1) * 100;
}
