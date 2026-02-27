

## Problem

The admin dashboard has three stat cards with incorrect data:

1. **"Participantes totales"**: Sums `participants_count` from all events (155), but doesn't deduplicate recurring participants. The `global_participants` table already tracks 76 unique participants -- this is the correct source.
2. **"Conexiones realizadas"**: Hardcoded to `0`. There are 362 encounter records in `participant_encounters` that should be counted.
3. No general statistics section exists for event insights.

## Plan

### 1. Fix dashboard stats with real data from the database

**File:** `src/pages/AdminDashboard.tsx`

- Add a `loadStats` function that queries:
  - `global_participants` count (unique participants) filtered by organizer
  - `participant_encounters` count (unique pairs, not individual records) filtered by organizer
- Replace `totalParticipants` calculation (line 144) with the DB value.
- Replace hardcoded `0` in "Conexiones realizadas" with the DB value.
- Keep "Eventos totales" as-is (from events array length).

### 2. Add a general statistics section below the stats cards

**File:** `src/pages/AdminDashboard.tsx`

Add a new card section with:
- **Participantes que repiten**: Count of global_participants with `events_attended > 1`
- **Media de participantes por evento**: Total participants / number of events
- **Eventos completados vs activos**: Breakdown by status
- **Tasa de selección**: Percentage of participants who submitted selections (from `participants.selection_submitted_at IS NOT NULL`)

These will be fetched in the same `loadStats` query to minimize DB calls.

### Summary of changes

| File | Change |
|---|---|
| `AdminDashboard.tsx` | Query real stats from `global_participants` and `participant_encounters`, add statistics section |

No database migrations needed -- all data already exists in the correct tables.

