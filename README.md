# PresuObras

Presupuestos de obra para arquitectos y constructores en Argentina: análisis de precios unitarios (APU), rubros, coeficiente de pase, PDF para el cliente, importación de listas de corralón, índices de ajuste y un asistente IA que arma la lista de ítems a partir de una descripción de la obra.

## Principio de diseño

**La IA no inventa rendimientos ni precios.** Un error en un APU base (por ejemplo, un oficial que levanta 12 m² de muro por día cuando son 6) se multiplica en cada presupuesto. Por eso:

- Los rendimientos y consumos viven en el catálogo de APU y los revisa una persona del rubro. Cada APU tiene un campo `validado` y una `fuente`. Para marcarlo como validado hay que indicar quién o qué lo validó.
- El asistente IA solo **elige análisis existentes por código** y **estima cantidades**, explicando el cálculo. Lo que no encuentra en el catálogo lo devuelve como "faltante". El servidor descarta cualquier código que no exista.
- El presupuesto avisa cuántos ítems usan APU sin validar.

El catálogo incluido (`src/data/semilla.ts`) es **de demostración**: los precios son de ejemplo y los rendimientos, orientativos. Ninguno viene validado.

## Qué incluye (v0.1)

| Módulo | Estado |
|---|---|
| Insumos (materiales, mano de obra, equipos) con fecha y fuente del precio | ✔ |
| APU con desperdicio y subanálisis (morteros, hormigones), con detección de referencias circulares | ✔ |
| Rendimiento por jornada calculado a partir de las horas, para revisar rápido | ✔ |
| Presupuesto por rubros, incidencia de cada rubro, desglose materiales / MO / equipos | ✔ |
| Coeficiente de pase: GG + gastos financieros, beneficio, IVA | ✔ |
| Versiones guardadas (con copia del catálogo, para que no cambien al actualizar precios) | ✔ |
| PDF para el cliente (Imprimir → Guardar como PDF) | ✔ |
| Importar lista de corralón en CSV (formato argentino `1.234,56`), con vista previa y alerta de subas > 20 % | ✔ |
| Índices (CAC, ICC-INDEC, IIC CABA): carga manual y redeterminación | ✔ |
| Asistente IA (Claude) que propone ítems y cantidades desde una descripción | ✔ |
| Persistencia | localStorage (pensado para pasar a Firestore) |

## Cómo correrlo

```bash
npm install
cp .env.example .env      # completar ANTHROPIC_API_KEY para usar el asistente IA
npm run dev               # web en http://localhost:5173 + API en :8787
```

Sin clave de API, todo funciona salvo el asistente IA.

```bash
npm test                  # tests del motor de cálculo, CSV e índices
npm run build             # typecheck + build de producción
```

## Estructura

```
src/domain/     Lógica pura y testeada: cálculo de APU y presupuesto, CSV, índices, contrato con la IA
src/data/       Catálogo de demostración
src/store/      Estado y persistencia local
src/ui/         Interfaz React
server/         Endpoint POST /api/generar que llama a Claude con salida estructurada
```

## Próximos pasos sugeridos

1. **Conseguir un primer usuario del rubro** (arquitecto, MMO o constructor) que use la app en una obra real.
2. Con esa persona, **llevar el catálogo a ~150 ítems frecuentes** y validar consumos y rendimientos contra publicaciones del sector.
3. Reemplazar los precios de ejemplo por listas reales de 2–3 corralones y el convenio UOCRA vigente.
4. Revisar si OneEstimate tiene precios argentinos confiables: si no, ese es el diferencial.
5. Migrar la persistencia a Firebase (Auth + Firestore) para usar desde varios dispositivos.
6. Cómputo asistido desde planos en PDF (con revisión manual obligatoria).
