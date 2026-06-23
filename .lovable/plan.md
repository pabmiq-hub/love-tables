
Tres mejoras independientes en el panel del participante y en la lógica de matches/mesas.

---

## 1. Selecciones por ronda en el panel del participante

Actualmente `ParticipantSelect.tsx` muestra a todos los compañeros de mesa en una sola lista (suma de todas las rondas) con un único botón "Enviar selecciones". Se rediseña por ronda:

- Calcular, a partir de `tablesData`, un mapa `roundNumber → compañeros de mesa de esa ronda` para el participante verificado.
- Mostrar **una sección desplegable (`Collapsible`) por ronda**, ordenadas por número (sólo se muestran rondas en las que el participante haya estado sentado y la ronda ya haya ocurrido — `round <= currentRound`).
- Cada sección lleva su propio cabezal con: `Ronda N · X personas · Y seleccionadas` y un check verde cuando todas las personas de la ronda tienen una decisión guardada.
- Dentro de cada ronda, por cada persona:
  - Si **no hay selección previa**: checkboxes 😊 Amistad / 💕 Romance (igual que ahora, respetando `canShowDating`) + botones Super Like / Flechazo / Repetir si aplica.
  - Si **hay selección previa**: muestra la insignia con el tipo seleccionado y un **icono lápiz** (`Pencil`) que activa modo edición para esa persona (mismos checkboxes precargados con `previousSelectionType`; desmarcar ambos = eliminar la selección).
- Pie de cada ronda con dos botones:
  - **"Enviar selecciones de esta ronda"** — sólo envía las selecciones nuevas + ediciones de esa ronda concreta.
  - **"No he conectado con nadie de esta ronda"** — marca la ronda como revisada sin selecciones.
- Estado por ronda (`reviewedRounds: Set<number>`) persistido en `localStorage` con clave `reviewed_rounds_${eventId}_${participantId}` para que al recargar siga marcada como revisada.
- Una ronda con el botón "no he conectado" pulsado queda colapsada y mostrada como completada; el usuario puede reabrirla y editar.
- Cuando todas las rondas estén o enviadas o marcadas como "no conecté", se ofrece el resumen final (`step="done"`).
- Se reutiliza `submit-selections` (envía sólo las nuevas de la ronda) y `update-selection` (edita una por una). Sin cambios de schema.

---

## 2. Super Like y Flechazo despliegan match automáticamente

Cambia la lógica de matches en `supabase/functions/send-match-emails/index.ts` (cálculo de `matchesByParticipant`) y se replica el mismo criterio en `MatchesDashboard.tsx` (panel admin) para que ambos vean lo mismo.

Reglas nuevas, manteniendo la actual (selección recíproca = match):

- **Super Like recibido** (`is_super_like = true` en la selección del emisor hacia el receptor): si el receptor selecciona al emisor con `friendship`, `dating` o `both`, hay match. El tipo del match es:
  - Si el receptor marcó `friendship` → match de amistad.
  - Si el receptor marcó `dating` → match de romance (si son compatibles según `dating_preference`; si no, baja a amistad).
  - Si `both` → ambos.
- **Flechazo (`crush_requests`)**: si el destinatario del flechazo selecciona al emisor con `dating` o `both`, se genera match de romance aunque el destinatario **no haya aceptado** la solicitud (sólo si son compatibles bilateralmente; en caso contrario se baja a amistad como ya hace `areDatingCompatible`). Si selecciona `friendship`, sólo se crea match de amistad si el emisor también ha seleccionado friendship/both (regla actual). No se crea match si el destinatario no ha seleccionado al emisor en absoluto.
- Estos matches "asimétricos" se marcan con `isSuperMatch=true` para mantener el estilo visual ⭐ en los correos.

Implementación:

- Cargar `crush_requests` (todas las del evento) junto a `participant_selections` en `send-match-emails` y en `MatchesDashboard`.
- Al construir el mapa de matches, iterar también:
  - Selecciones con `is_super_like=true` → forzar match con el receptor según su selección recíproca (si existe en cualquier tipo).
  - Filas de `crush_requests` (cualquier `status`) → si la selección del destinatario hacia el emisor existe con `dating`/`both`, añadir match romance con compatibilidad bilateral.
- Deduplicar por par ordenado antes de notificar.

---

## 3. Mesas: priorizar paridad de género y luego cercanía por fecha de nacimiento

Hoy, dentro de una franja de edad única (p. ej. todos +18), `generateFixedHostTables`/`generateAllRotateTables` en `src/pages/EventDetail.tsx` toman los participantes en orden de la franja sin ordenar por edad real (solo por `age_range`), de modo que se mezclan personas con diferencias de edad grandes aunque caben en la misma franja.

Cambios sin tocar la paridad ya existente:

- Añadir un helper `sortParticipantsByBirthDate(participants)` que ordena por `date_of_birth` ascendente; los que no tengan DOB van al final con su orden original.
- En `mergeSmallAgeGroups` (y donde se aplane la lista `sortedParticipants`), tras agrupar por `age_range`, ordenar **cada grupo internamente por DOB** antes del flatten. Esto asegura que cuando sólo hay un grupo de edad (caso del usuario), el iterador externo recorre la lista ya ordenada por edad y la asignación greedy a mesas mantiene edades parecidas juntas.
- La paridad de género sigue siendo la restricción dura: `wouldMaintainGenderBalance` se evalúa antes de añadir a la mesa, de modo que la edad sólo influye en el orden de evaluación, no rompe la paridad.
- Mismo cambio aplicado en el algoritmo del modo `all_rotate` y en `fixed_host`.
- No se modifica `preliminaryRoundAssign.ts` ni `b2bTableGenerator.ts` (B2B no es social).

Riesgo: con DOBs ausentes el resultado es equivalente al actual.

---

## Detalles técnicos

**Archivos editados**
- `src/pages/ParticipantSelect.tsx` — UI desplegable por ronda + flujo de envío por ronda + edición inline con lápiz.
- `supabase/functions/send-match-emails/index.ts` — nueva lógica de matches (super like/flechazo).
- `src/components/event/MatchesDashboard.tsx` — mismo criterio en el panel admin (revisar primero si calcula matches internamente o llama a la edge function).
- `src/pages/EventDetail.tsx` — añadir orden por DOB dentro de cada grupo de edad en `mergeSmallAgeGroups` y en los dos generadores.

**Edge functions**: sólo se reedita `send-match-emails`. Se mantiene `submit-selections` y `update-selection` intactas (la UI por ronda ya encaja con el modo incremental que ya soportan).

**Sin cambios de schema**: `participant_selections.is_super_like` y `crush_requests.requester_id/target_id` ya existen.

**Compatibilidad con eventos en curso**: las mejoras sólo afectan a futuras generaciones (mesas) y a próximos cálculos de matches; los datos guardados no se migran.
