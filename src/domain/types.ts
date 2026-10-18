// Modelo de datos de PresuObras.
// Montos en pesos argentinos (ARS), sin IVA salvo donde se indica.

export type TipoInsumo = "material" | "mano_obra" | "equipo";

/** Recurso con precio propio: un material de corralón, una hora de oficial, un alquiler de equipo. */
export interface Insumo {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  tipo: TipoInsumo;
  /** Precio unitario de compra, sin IVA. */
  precio: number;
  /** Fecha ISO (YYYY-MM-DD) en que se cargó o actualizó el precio. */
  fechaPrecio: string;
  /** De dónde salió el precio: lista de corralón, convenio UOCRA, ejemplo, etc. */
  fuente: string;
}

/**
 * Componente de un análisis de precio. Referencia un insumo o, para
 * subanálisis como morteros y hormigones, otro APU.
 */
export interface ComponenteAPU {
  ref: { tipo: "insumo"; id: string } | { tipo: "apu"; id: string };
  /** Cantidad del recurso por unidad del APU (consumo o rendimiento). */
  cantidad: number;
  /** Desperdicio en porcentaje (5 = 5 %). Solo se aplica a materiales. */
  desperdicio?: number;
}

/** Análisis de precio unitario: cuánto de cada recurso lleva una unidad de trabajo. */
export interface APU {
  id: string;
  codigo: string;
  rubro: string;
  descripcion: string;
  unidad: string;
  componentes: ComponenteAPU[];
  /**
   * true solo cuando un profesional revisó consumos y rendimientos.
   * La IA nunca marca un APU como validado.
   */
  validado: boolean;
  /** Fuente de los rendimientos (publicación, profesional que revisó, etc.). */
  fuente: string;
  notas?: string;
}

export interface ItemPresupuesto {
  id: string;
  apuId: string;
  cantidad: number;
  /** Texto libre para aclarar el ítem en el PDF (ubicación, detalle). */
  observacion?: string;
}

/** Coeficientes de pase, en porcentaje. */
export interface Coeficientes {
  gastosGenerales: number;
  gastosFinancieros: number;
  beneficio: number;
  iva: number;
}

export interface Presupuesto {
  id: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  fecha: string;
  coeficientes: Coeficientes;
  items: ItemPresupuesto[];
  /** Número de versión; se incrementa al guardar una versión nueva. */
  version: number;
}

/** Valor mensual de un índice de costos (CAC, ICC-INDEC, IIC CABA, …). */
export interface ValorIndice {
  indice: string;
  /** Período YYYY-MM. */
  periodo: string;
  valor: number;
}

export interface Catalogo {
  insumos: Insumo[];
  apus: APU[];
}
