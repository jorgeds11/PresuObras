import { describe, expect, it } from "vitest";
import { factorAjuste, variacionPorcentual } from "./indices";
import type { ValorIndice } from "./types";

const serie: ValorIndice[] = [
  { indice: "CAC", periodo: "2026-08", valor: 1000 },
  { indice: "CAC", periodo: "2026-09", valor: 1150 },
];

describe("índices", () => {
  it("calcula factor y variación", () => {
    expect(factorAjuste(serie, "CAC", "2026-08", "2026-09")).toBeCloseTo(1.15);
    expect(variacionPorcentual(serie, "CAC", "2026-08", "2026-09")).toBeCloseTo(15);
  });

  it("falla si falta un período", () => {
    expect(() => factorAjuste(serie, "CAC", "2026-07", "2026-09")).toThrow(/2026-07/);
  });
});
