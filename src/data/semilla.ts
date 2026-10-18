import type { APU, Catalogo, Insumo, Presupuesto } from "../domain/types";

/*
 * Catálogo inicial de demostración.
 *
 * IMPORTANTE: los precios son de EJEMPLO y los consumos/rendimientos son
 * valores ORIENTATIVOS. Ningún análisis viene marcado como validado: antes de
 * usar esto con un cliente real, un arquitecto o MMO tiene que revisar cada
 * APU y cargar precios de compra reales (listas de corralón, convenio UOCRA).
 */

const FECHA = "2026-10-01";
const EJEMPLO = "Precio de ejemplo — reemplazar con lista real";

const insumo = (
  id: string,
  descripcion: string,
  unidad: string,
  tipo: Insumo["tipo"],
  precio: number,
  fuente = EJEMPLO,
): Insumo => ({ id, codigo: id, descripcion, unidad, tipo, precio, fechaPrecio: FECHA, fuente });

export const insumosSemilla: Insumo[] = [
  // Materiales
  insumo("MAT-CEM", "Cemento portland, bolsa 50 kg", "bolsa", "material", 11500),
  insumo("MAT-CAL", "Cal hidráulica, bolsa 25 kg", "bolsa", "material", 6200),
  insumo("MAT-ARG", "Arena gruesa", "m³", "material", 42000),
  insumo("MAT-PIE", "Piedra partida 6-20", "m³", "material", 68000),
  insumo("MAT-CAS", "Cascote de ladrillo", "m³", "material", 25000),
  insumo("MAT-LCO", "Ladrillo común", "u", "material", 190),
  insumo("MAT-LH18", "Ladrillo hueco 18×18×33", "u", "material", 1250),
  insumo("MAT-LH12", "Ladrillo hueco 12×18×33", "u", "material", 980),
  insumo("MAT-HIE", "Hierro ADN 420 (barras)", "kg", "material", 1900),
  insumo("MAT-ALA", "Alambre negro recocido", "kg", "material", 3400),
  insumo("MAT-FEN", "Fenólico 18 mm para encofrado", "m²", "material", 21000),
  insumo("MAT-CER", "Cerámico de piso 1ª calidad", "m²", "material", 16500),
  insumo("MAT-ADH", "Adhesivo cementicio, bolsa 30 kg", "bolsa", "material", 9800),
  insumo("MAT-PAS", "Pastina", "kg", "material", 2600),
  insumo("MAT-LAT", "Pintura látex interior", "l", "material", 7200),
  insumo("MAT-FIJ", "Fijador sellador al agua", "l", "material", 4800),
  insumo("MAT-MEM", "Membrana asfáltica 4 mm con aluminio", "m²", "material", 9500),
  insumo("MAT-IMP", "Imprimación asfáltica", "l", "material", 5200),
  // Mano de obra (valor hora con cargas sociales)
  insumo("MO-OF", "Oficial (hora con cargas sociales)", "h", "mano_obra", 9800),
  insumo("MO-AY", "Ayudante (hora con cargas sociales)", "h", "mano_obra", 8200),
  // Equipos
  insumo("EQ-HOR", "Hormigonera 150 l (alquiler)", "h", "equipo", 3500),
];

const ORIENTATIVO = "Valores orientativos — pendiente de validación profesional";

const apu = (
  id: string,
  rubro: string,
  descripcion: string,
  unidad: string,
  componentes: APU["componentes"],
  notas?: string,
): APU => ({ id, codigo: id, rubro, descripcion, unidad, componentes, validado: false, fuente: ORIENTATIVO, notas });

const ins = (id: string, cantidad: number, desperdicio?: number) => ({
  ref: { tipo: "insumo" as const, id },
  cantidad,
  desperdicio,
});
const sub = (id: string, cantidad: number, desperdicio?: number) => ({
  ref: { tipo: "apu" as const, id },
  cantidad,
  desperdicio,
});

export const apusSemilla: APU[] = [
  // Subanálisis (materiales compuestos)
  apu("SUB-MOR-AS", "Subanálisis", "Mortero de asiento 1/4:1:4 (cemento:cal:arena)", "m³", [
    ins("MAT-CEM", 1.3),
    ins("MAT-CAL", 6),
    ins("MAT-ARG", 1.05),
    ins("MO-AY", 5),
  ]),
  apu("SUB-MOR-13", "Subanálisis", "Mortero cementicio 1:3", "m³", [
    ins("MAT-CEM", 9),
    ins("MAT-ARG", 1.05),
    ins("MO-AY", 5),
  ]),
  apu("SUB-H21", "Subanálisis", "Hormigón H-21 elaborado en obra", "m³", [
    ins("MAT-CEM", 7),
    ins("MAT-ARG", 0.65),
    ins("MAT-PIE", 0.75),
    ins("MO-AY", 4),
    ins("EQ-HOR", 1.5),
  ]),
  apu("SUB-HCAS", "Subanálisis", "Hormigón pobre de cascote", "m³", [
    ins("MAT-CEM", 2),
    ins("MAT-CAL", 4),
    ins("MAT-ARG", 0.5),
    ins("MAT-CAS", 1),
    ins("MO-AY", 4),
  ]),

  // Trabajos
  apu("01-EXC", "Movimiento de suelos", "Excavación manual para zapatas y vigas de fundación", "m³", [
    ins("MO-AY", 6),
  ]),
  apu("02-HA-VF", "Estructura de hormigón armado", "Hormigón armado en vigas de fundación", "m³", [
    sub("SUB-H21", 1, 5),
    ins("MAT-HIE", 90, 8),
    ins("MAT-ALA", 1),
    ins("MAT-FEN", 2),
    ins("MO-OF", 10),
    ins("MO-AY", 10),
  ], "Encofrado: ~8 m² de fenólico por m³ con 4 usos."),
  apu("03-MAMP-H18", "Mampostería", "Muro de ladrillo hueco 18×18×33", "m²", [
    ins("MAT-LH18", 15.5, 5),
    sub("SUB-MOR-AS", 0.02),
    ins("MO-OF", 1.3),
    ins("MO-AY", 1.3),
  ], "Rendimiento implícito: ~6 m²/día por pareja oficial + ayudante."),
  apu("03-MAMP-H12", "Mampostería", "Tabique de ladrillo hueco 12×18×33", "m²", [
    ins("MAT-LH12", 15.5, 5),
    sub("SUB-MOR-AS", 0.013),
    ins("MO-OF", 1.1),
    ins("MO-AY", 1.1),
  ]),
  apu("03-MAMP-C15", "Mampostería", "Muro de ladrillo común de 15 cm", "m²", [
    ins("MAT-LCO", 60, 5),
    sub("SUB-MOR-AS", 0.04),
    ins("MO-OF", 1.6),
    ins("MO-AY", 1.6),
  ]),
  apu("04-CPISO", "Contrapisos y carpetas", "Contrapiso de hormigón pobre, espesor 10 cm", "m²", [
    sub("SUB-HCAS", 0.1, 5),
    ins("MO-OF", 0.4),
    ins("MO-AY", 0.4),
  ]),
  apu("04-CARP", "Contrapisos y carpetas", "Carpeta cementicia, espesor 2 cm", "m²", [
    sub("SUB-MOR-13", 0.022, 5),
    ins("MO-OF", 0.5),
    ins("MO-AY", 0.5),
  ]),
  apu("05-REV-GR", "Revoques", "Revoque grueso interior a la cal", "m²", [
    sub("SUB-MOR-AS", 0.02, 10),
    ins("MO-OF", 0.8),
    ins("MO-AY", 0.6),
  ]),
  apu("06-PISO-CER", "Pisos y revestimientos", "Piso cerámico colocado con adhesivo", "m²", [
    ins("MAT-CER", 1, 10),
    ins("MAT-ADH", 0.17),
    ins("MAT-PAS", 0.3),
    ins("MO-OF", 0.8),
    ins("MO-AY", 0.4),
  ]),
  apu("07-PINT-LAT", "Pinturas", "Látex interior sobre muros, fijador + 2 manos", "m²", [
    ins("MAT-FIJ", 0.1, 5),
    ins("MAT-LAT", 0.25, 10),
    ins("MO-OF", 0.3),
  ]),
  apu("08-MEMB", "Cubiertas", "Membrana asfáltica 4 mm con aluminio, incl. imprimación", "m²", [
    ins("MAT-IMP", 0.3),
    ins("MAT-MEM", 1.15),
    ins("MO-OF", 0.3),
    ins("MO-AY", 0.3),
  ], "1,15 m² de membrana por m² cubre solapes."),
];

export const catalogoSemilla: Catalogo = { insumos: insumosSemilla, apus: apusSemilla };

export const presupuestoSemilla: Presupuesto = {
  id: "demo",
  nombre: "Ampliación: dormitorio de 12 m²",
  cliente: "Cliente de ejemplo",
  ubicacion: "CABA",
  fecha: FECHA,
  coeficientes: { gastosGenerales: 15, gastosFinancieros: 2, beneficio: 10, iva: 21 },
  version: 1,
  items: [
    { id: "i1", apuId: "01-EXC", cantidad: 3.2 },
    { id: "i2", apuId: "02-HA-VF", cantidad: 1.6 },
    { id: "i3", apuId: "03-MAMP-H18", cantidad: 34 },
    { id: "i4", apuId: "04-CPISO", cantidad: 12 },
    { id: "i5", apuId: "04-CARP", cantidad: 12 },
    { id: "i6", apuId: "05-REV-GR", cantidad: 60 },
    { id: "i7", apuId: "06-PISO-CER", cantidad: 12 },
    { id: "i8", apuId: "07-PINT-LAT", cantidad: 72 },
    { id: "i9", apuId: "08-MEMB", cantidad: 14 },
  ],
};
