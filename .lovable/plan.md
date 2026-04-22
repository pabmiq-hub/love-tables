

# Plan: 5 ajustes para Modo Lúdico, QR, Inclusiones, Rondas dinámicas y nueva función "Repetir"

## 1. Modo lúdico — estimación correcta de mesas

**Problema:** En Slow Friending [Abril2026] hay 55 inscritos y mesas de 5 → deberían estimarse 11 mesas, pero el editor calcula sobre `totalRounds` o usa fórmulas raras.

**Cambio:**
- En `EventSettingsEditor.tsx` y `CreateEvent.tsx`, recalcular `estimatedTables = Math.max(1, Math.ceil(participantsCount / tableSize))` ignorando `totalRounds` para el conteo de mesas.
- Mostrar en el editor: "Estimación: **X** mesas (Y inscritos ÷ Z por mesa)".
- En `EventSettingsEditor`, leer `participantsCount` real desde `eventData.participants_count` (ya disponible en props).

## 2. Nuevo QR: Panel del participante (`/access`)

**Cambio en `EventDetail.tsx`:**
- En el dropdown "Códigos QR", añadir una tercera opción **siempre visible** (estados `pending`, `active`, `completed`):
  - `QR Registro` → `/event/:id/join`
  - `QR Check-in` → `/event/:id/checkin`
  - **`QR Panel del participante`** → `/event/:id/access` *(nuevo, ya existe `EventQRCode type="access"`)*
- Reutilizar `EventQRCode` con `type="access"` (ya implementado).

## 3. Inclusiones (opuesto de Exclusiones)

**Nueva tabla:** `participant_inclusions`
```sql
CREATE TABLE participant_inclusions (
  id uuid PK,
  event_id uuid FK events,
  participant_1_id uuid FK participants,
  participant_2_id uuid FK participants,
  reason text,
  created_at timestamptz default now()
);
```
+ índice único `(event_id, LEAST(p1,p2), GREATEST(p1,p2))` y RLS por `is_event_organizer`.

**Nuevo componente:** `InclusionsManager.tsx` (clon adaptado de `ExclusionsManager.tsx`, color verde, icono `UserPlus`).

**Botón en `EventDetail.tsx`:** "Inclusiones" junto a "Exclusiones" (mismo gating: `hasFeature('avoid_encounters')`).

**Algoritmo (`generateSmartTables` + `generateB2BTables`):**
- Tras cargar exclusiones, cargar también `inclusions` y construir un grafo de "componentes obligatorios" (Union-Find).
- Antes del fill normal, sentar a cada componente **junto** en la misma mesa de cada ronda (validando que `tableSize` lo permita; si no, advertencia).
- Si el componente excede `tableSize`, mostrar warning y degradar a "best effort" en `relaxConstraints`.

## 4. Generación de rondas "just-in-time" (al acabar la ronda anterior)

**Problema:** Hoy todas las rondas se generan en el `Iniciar evento`, así que las bajas a mitad de evento dejan huecos en futuras rondas.

**Cambio en flujo:**
- Añadir flag opcional `events.tables_generation_mode` ENUM: `'upfront'` (actual, default) | `'per_round'` (nuevo).
- En el editor de evento (`EventSettingsEditor`), añadir toggle "Generar cada ronda al finalizar la anterior" (recomendado para eventos largos / con bajas frecuentes).
- En `'per_round'`:
  - `Iniciar evento`: solo se genera **Ronda 1** con los participantes con check-in.
  - `onCompleteRound(roundNumber)` (línea ~4262): si `mode='per_round'` y `nextRound <= eventData.rounds`, llamar a `generateSmartTables(checkedInActives, 1, ...)` con `existingEncounters` reconstruido (igual que `handleAddRound`), y **excluir participantes con `cancelled_at` o `dropped_at`** posterior al inicio.
  - Persistir la nueva ronda en `eventData.tables`.
- Reutilizar la lógica de `handleAddRound` (líneas 2333-2422), extrayéndola a un helper compartido `generateSingleRound(roundNumber, baseEncounters)`.

## 5. Nueva funcionalidad: "Repetir" (volver a coincidir con un participante)

**UX (panel del participante `/access`):**
- En cada tarjeta de mesa de una ronda terminada, junto a los botones "Amistad / Romance", añadir un botón **"🔁 Repetir"** (deshabilitado tras usarlo una vez por evento).
- Al pulsarlo: dialog de confirmación → llamada a edge function `request-repeat`.
- Indicador "Has usado tu repetición" + estado de la solicitud (`pendiente / aceptada / rechazada / caducada`).

**Tabla:** `repeat_requests`
```sql
CREATE TABLE repeat_requests (
  id uuid PK,
  event_id uuid FK,
  requester_id uuid FK participants,
  target_id uuid FK participants,
  status text CHECK (status IN ('pending','accepted','declined','expired','fulfilled')),
  token text UNIQUE NOT NULL,           -- HMAC para enlace en email
  scheduled_round int,                  -- ronda en que se materializa (null hasta aceptar)
  created_at, accepted_at, expires_at
);
```
+ Constraint único `(event_id, requester_id)` para garantizar **1 repetición por evento por participante**.

**Edge functions nuevas:**
- `request-repeat`: valida (1 por evento, target ≠ requester, target con check-in, mismo evento) → INSERT pending → envía email al target con botón Aceptar/Rechazar (HMAC token, mismo patrón que `participant-cancellation-flow`).
- `respond-repeat`: endpoint público (token-based) → acepta/rechaza.

**Materialización (cuando target acepta):**
- Determinar `currentRound` del evento.
- Si `current_round < total_rounds`:
  - **Si la siguiente ronda aún no está generada** (modo `per_round`): marcar el par como **inclusión temporal** sólo para esa ronda → cuando `generateSingleRound(nextRound)` corra, los sentará juntos.
  - **Si ya está generada** (modo `upfront`): re-generar la siguiente ronda con la inclusión añadida (botón confirmar al organizador, o automático si activa "auto-aplicar repeticiones").
- Si `current_round >= total_rounds`: marcar `status='expired'` y enviar email "no fue posible" al requester.

**Comunicaciones nuevas (sección Ajustes de comunicación → plantillas):**
- `repeat_request_received` (al target con botón Aceptar/Rechazar).
- `repeat_request_accepted` (al requester: "te sentarás con X en la ronda Y").
- `repeat_request_expired` (al requester: "ya no fue posible aplicar tu repetición").

**Gating:** feature flag `repeat_request` solo en plan Pro/Enterprise (configurable por Super Admin en "Gestión de Features").

## Detalles técnicos

- **Migraciones SQL:** 3 nuevas tablas (`participant_inclusions`, `repeat_requests`, columna `tables_generation_mode`) con RLS por `is_event_organizer` para administración y políticas públicas para edge functions con service-role.
- **Algoritmo:** Union-Find sencillo para inclusiones; integrado en ambos `generateFixedHostTables` y `generateAllRotateTables` antes del bucle de seating.
- **Helpers compartidos:**
  - `src/lib/inclusions.ts` (carga + grupos).
  - `src/lib/roundGeneration.ts` (extrae `generateSingleRound` desde `EventDetail.handleAddRound`).
- **Lifecycle del repeat request:**
  - Cron `pg_cron` cada 5 min: marca `expired` si `current_round >= rounds` o `expires_at < now()`.
  - Al materializarse en una ronda → `status='fulfilled'`.
- **Memoria a actualizar:** crear `mem://features/social-module/repeat-request` y `mem://features/social-module/inclusions-system`; actualizar `mem://features/social-module/dynamic-round-management` con el modo per-round.

## Orden de implementación sugerido

1. Fix estimación Modo Lúdico + nuevo QR Panel (rápido, sin migración).
2. Inclusiones (migración + UI + algoritmo).
3. Modo `per_round` para rondas (toggle + refactor de `generateSingleRound`).
4. Función "Repetir" completa (tabla + 2 edge functions + UI panel + 3 plantillas + cron).

