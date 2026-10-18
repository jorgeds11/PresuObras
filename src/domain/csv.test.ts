import { describe, expect, it } from "vitest";
import { conciliar, parsearListaPrecios, parsearNumero } from "./csv";
import { insumosSemilla } from "../data/semilla";

describe("parsearNumero", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["$ 2.500", 2500],
    ["11500", 11500],
    ["0,5", 0.5],
    ["1,234.5", 1234.5],
  ])("%s → %d", (texto, esperado) => {
    expect(parsearNumero(texto)).toBeCloseTo(esperado);
  });
});

describe("parsearListaPrecios", () => {
  it("lee CSV con ; encabezados con acentos y comillas", () => {
    const csv = `Código;Descripción;Unidad;Precio\nMAT-CEM;"Cemento; bolsa 50 kg";bolsa;"12.300,00"\nX;Sin precio;u;abc`;
    const r = parsearListaPrecios(csv);
    expect(r.filas).toEqual([{ codigo: "MAT-CEM", descripcion: "Cemento; bolsa 50 kg", unidad: "bolsa", precio: 12300 }]);
    expect(r.errores).toHaveLength(1);
  });

  it("informa columnas faltantes", () => {
    expect(parsearListaPrecios("a,b\n1,2").errores[0]).toMatch(/descripcion, precio/);
  });
});

describe("conciliar", () => {
  it("cruza por código y por descripción, y calcula la variación", () => {
    const r = conciliar(insumosSemilla, [
      { codigo: "MAT-CEM", descripcion: "otra cosa", unidad: "", precio: 12650 },
      { codigo: "", descripcion: "ARENA GRUESA", unidad: "", precio: 42000 },
      { codigo: "ZZZ", descripcion: "Producto nuevo", unidad: "", precio: 1 },
    ]);
    expect(r.cambios.map((c) => c.insumo.id)).toEqual(["MAT-CEM", "MAT-ARG"]);
    expect(r.cambios[0].variacion).toBeCloseTo(10);
    expect(r.sinCoincidencia).toHaveLength(1);
  });
});
