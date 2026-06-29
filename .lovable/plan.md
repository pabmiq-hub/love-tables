# Mesas personalizadas (Enterprise · Social)

Nueva opción que permite definir manualmente cuántas mesas hay y la capacidad de cada una. Sustituye al "Tamaño de mesa" uniforme cuando se activa.

## 1. Gating y feature flag

- Añadir nueva feature `custom_table_layout` (solo plan Enterprise) en `plan_features`.
- En el cliente, mostrar la opción "Personalizar" únicamente si `hasFeature('custom_table_layout')` y el módulo del evento es Social. Si no, se mantiene el flujo actual (tamaño fijo).

## 2. UI en Ajustes del evento

En `EventSettingsEditor.tsx` (y replicado en `CreateEvent.tsx` para mantener paridad), junto al campo **Tamaño de mesa**:

- Botón secundario "Personalizar" (visible solo con la feature).
- Abre un **pop-up (`Dialog`)** con dos pasos:
  1. Input: **Número de mesas**.
  2. Lista de N inputs (uno por mesa) con la **capacidad de cada mesa** (default = el tamaño global actual).
- Acciones: "Guardar" persiste, "Cancelar" descarta.
- Tras guardar, el campo "Tamaño de mesa" muestra un resumen tipo `Personalizado · 5 mesas · 22 plazas` (deshabilitado, con botón "Editar"). Botón "Quitar personalización" vuelve al modo uniforme.

## 3. Persistencia

Nueva columna en `events`:
- `custom_tables` JSONB nullable: `{ enabled: boolean, tables: [{ capacity: number }] }` (orden = número de mesa 1..N).

Cuando `custom_tables.enabled = true`, esta config tiene prioridad sobre `table_size`.

## 4. Algoritmo de generación de mesas

En `generateSmartTables` (y los dos generadores en `EventDetail.tsx`: `generateFixedHostTables` y `generateAllRotateTables`):

- Si `custom_tables.enabled`:
  - Se crean exactamente las mesas configuradas con sus capacidades.
  - Reparto **proporcional**: se distribuyen los participantes presentes por mesa respetando la **capacidad máxima** de cada una, manteniendo las restricciones existentes (paridad de género, edad, game mode, exclusiones).
  - Si hay menos participantes que capacidad total, las mesas se llenan proporcionalmente al peso de su capacidad (`asignados_i = round(presentes * capacidad_i / sum_capacidades)`), respetando paridad.
- Misma lógica en `preliminaryRoundAssign.ts` y `checkin-participant` (edge function).

## 5. Rebalanceo por bajas durante el evento

Cuando un participante se da de baja después de iniciado el evento (handler ya existente `handle-participant-cancellation` + flujo manual desde el admin):

- Recalcular para las **rondas futuras** (no las ya jugadas) usando el algoritmo anterior con el conjunto actual de participantes activos.
- **Eliminación dinámica de mesas**: si tras la baja la suma de participantes activos cabe en menos mesas, se eliminan mesas empezando por las de mayor capacidad cuya retirada deje el resto cuadrado (ej.: 4 bajas en mesas de 4 → quitar 1 mesa de 4). La selección de qué mesa eliminar prefiere la de capacidad = nº de bajas; si no, la mesa con menos participantes asignados actualmente.
- Solo afecta a rondas con estado "pendiente". Las rondas ya generadas y publicadas no se tocan automáticamente, pero queda un botón "Regenerar próximas rondas" en el panel admin (ya existe el flujo de regeneración).

## 6. Detalles técnicos

**Archivos a editar / crear**
- Migration: añadir `events.custom_tables JSONB` + insertar feature `custom_table_layout` con asociación al plan Enterprise.
- `src/components/event/CustomTableLayoutEditor.tsx` (nuevo) — pop-up de 2 pasos.
- `src/components/event/EventSettingsEditor.tsx` — integración + gating con `useFeatures`.
- `src/pages/CreateEvent.tsx` — mismo control en creación.
- `src/pages/EventDetail.tsx` — `generateFixedHostTables` y `generateAllRotateTables` aceptan layout custom + función `rebalanceFutureRoundsAfterDropout(eventId)`.
- `src/lib/preliminaryRoundAssign.ts` — respetar capacidades por mesa.
- `supabase/functions/checkin-participant/index.ts` — idem.
- `supabase/functions/handle-participant-cancellation/index.ts` — disparar rebalanceo de rondas futuras cuando el evento ya está iniciado.
- `src/integrations/supabase/types.ts` — auto-regenerado tras migration.

**Sin cambios**: B2B (`b2bTableGenerator.ts`), módulo profesional, comunicaciones.

**Compatibilidad**: eventos existentes con `custom_tables = NULL` mantienen el comportamiento actual sin cambios.

**Riesgos**
- Si la suma de capacidades < participantes confirmados, mostrar warning al guardar y bloquear el inicio del evento hasta corregir.
- Paridad de género puede ser difícil con mesas de capacidades muy desiguales (ej. mesa de 3 + mesa de 5): el algoritmo prioriza paridad y, si no es posible, deja la mesa con desbalance mínimo (igual que hoy en última mesa residual).
