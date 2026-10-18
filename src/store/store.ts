import type React from "react";
import { useEffect, useState } from "react";
import type { Catalogo, Presupuesto, ValorIndice } from "../domain/types";
import { catalogoSemilla, presupuestoSemilla } from "../data/semilla";

/*
 * Persistencia local (localStorage). La forma del estado está pensada para
 * pasar a Firestore sin cambios: una colección por clave de primer nivel.
 */

export interface VersionGuardada {
  presupuestoId: string;
  version: number;
  guardado: string;
  presupuesto: Presupuesto;
  /** Copia del catálogo al momento de guardar, para que la versión no cambie si suben los precios. */
  catalogo: Catalogo;
}

export interface Estado {
  catalogo: Catalogo;
  presupuestos: Presupuesto[];
  versiones: VersionGuardada[];
  indices: ValorIndice[];
}

const CLAVE = "presuobras:v1";

const inicial = (): Estado => ({
  catalogo: catalogoSemilla,
  presupuestos: [presupuestoSemilla],
  versiones: [],
  indices: [],
});

function cargar(): Estado {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado ? { ...inicial(), ...JSON.parse(guardado) } : inicial();
  } catch {
    return inicial();
  }
}

export function useEstado() {
  const [estado, setEstado] = useState<Estado>(cargar);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin almacenamiento disponible (modo privado): la app sigue funcionando en memoria.
    }
  }, [estado]);
  const reiniciar = () => setEstado(inicial());
  return [estado, setEstado, reiniciar] as const;
}

export const nuevoId = () => crypto.randomUUID().slice(0, 8);

export type SetEstado = React.Dispatch<React.SetStateAction<Estado>>;
