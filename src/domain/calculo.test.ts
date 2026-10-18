import { describe, expect, it } from "vitest";
import { calcularPresupuesto, coeficienteDePase, costoAPU, ErrorCalculo } from "./calculo";
import type { Catalogo, Presupuesto } from "./types";
import { catalogoSemilla, presupuestoSemilla } from "../data/semilla";

const catalogo: Catalogo = {
  insumos: [
    { id: "cem", codigo: "cem", descripcion: "Cemento", unidad: "bolsa", tipo: "material", precio: 100, fechaPrecio: "", fuente: "" },
    { id: "of", codigo: "of", descripcion: "Oficial", unidad: "h", tipo: "mano_obra", precio: 50, fechaPrecio: "", fuente: "" },
    { id: "eq", codigo: "eq", descripcion: "Hormigonera", unidad: "h", tipo: "equipo", precio: 10, fechaPrecio: "", fuente: "" },
  ],
  apus: [
    {
      id: "mor", codigo: "mor", rubro: "Sub", descripcion: "Mortero", unidad: "m³", validado: true, fuente: "",
      componentes: [
        { ref: { tipo: "insumo", id: "cem" }, cantidad: 2 },
        { ref: { tipo: "insumo", id: "eq" }, cantidad: 1 },
      ],
    },
    {
      id: "muro", codigo: "muro", rubro: "Mampostería", descripcion: "Muro", unidad: "m²", validado: false, fuente: "",
      componentes: [
        { ref: { tipo: "insumo", id: "cem" }, cantidad: 1, desperdicio: 10 },
        { ref: { tipo: "insumo", id: "of" }, cantidad: 2, desperdicio: 50 },
        { ref: { tipo: "apu", id: "mor" }, cantidad: 0.5 },
      ],
    },
  ],
};

describe("costoAPU", () => {
  it("suma componentes, aplica desperdicio solo a materiales y resuelve subanálisis", () => {
    const c = costoAPU("muro", catalogo);
    // cemento 1 × 1,1 × 100 = 110; mortero 0,5 × 200 = 100
    expect(c.material).toBeCloseTo(210);
    // oficial 2 × 50, sin desperdicio
    expect(c.mano_obra).toBeCloseTo(100);
    // hormigonera del mortero 0,5 × 10
    expect(c.equipo).toBeCloseTo(5);
    expect(c.total).toBeCloseTo(315);
  });

  it("detecta referencias circulares", () => {
    const circular: Catalogo = {
      insumos: [],
      apus: [
        { id: "a", codigo: "a", rubro: "", descripcion: "", unidad: "", validado: false, fuente: "", componentes: [{ ref: { tipo: "apu", id: "b" }, cantidad: 1 }] },
        { id: "b", codigo: "b", rubro: "", descripcion: "", unidad: "", validado: false, fuente: "", componentes: [{ ref: { tipo: "apu", id: "a" }, cantidad: 1 }] },
      ],
    };
    expect(() => costoAPU("a", circular)).toThrow(ErrorCalculo);
  });
});

describe("coeficienteDePase", () => {
  it("encadena GG + GF, beneficio e IVA", () => {
    const c = { gastosGenerales: 15, gastosFinancieros: 5, beneficio: 10, iva: 21 };
    expect(coeficienteDePase(c, false)).toBeCloseTo(1.2 * 1.1);
    expect(coeficienteDePase(c)).toBeCloseTo(1.2 * 1.1 * 1.21);
  });
});

describe("calcularPresupuesto", () => {
  const p: Presupuesto = {
    id: "p", nombre: "", cliente: "", ubicacion: "", fecha: "", version: 1,
    coeficientes: { gastosGenerales: 10, gastosFinancieros: 0, beneficio: 10, iva: 21 },
    items: [{ id: "1", apuId: "muro", cantidad: 10 }],
  };

  it("arma el resumen con coeficientes y cuenta ítems sin validar", () => {
    const r = calcularPresupuesto(p, catalogo);
    expect(r.costoDirecto).toBeCloseTo(3150);
    expect(r.gastosGenerales).toBeCloseTo(315);
    expect(r.beneficio).toBeCloseTo(346.5);
    expect(r.subtotalSinIva).toBeCloseTo(3811.5);
    expect(r.total).toBeCloseTo(3811.5 * 1.21);
    expect(r.itemsSinValidar).toBe(1);
    expect(r.rubros[0].incidencia).toBeCloseTo(1);
    // La suma de líneas con coeficiente coincide con el subtotal sin IVA.
    expect(r.rubros[0].subtotalPrecio).toBeCloseTo(r.subtotalSinIva);
  });

  it("calcula el presupuesto de ejemplo sin errores", () => {
    const r = calcularPresupuesto(presupuestoSemilla, catalogoSemilla);
    expect(r.total).toBeGreaterThan(0);
    expect(r.rubros.reduce((s, x) => s + x.incidencia, 0)).toBeCloseTo(1);
  });
});
