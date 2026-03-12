

## Problem Analysis

Two issues to solve:

1. **Inaccurate selection progress**: The `SelectionProgress` component counts anyone with *any* selection in `participant_selections` as "responded". But some participants selected from all rounds (old behavior) while others only selected from the current round (new behavior). The `selection_submitted_at` timestamp is set on every submission, so it doesn't distinguish partial vs complete submissions.

2. **Participants forgetting to submit**: Need a "No conecté con nadie" button so participants can explicitly mark a round/session as complete without selecting anyone, and this gets tracked as a real submission.

## Solution

### 1. Fix progress tracking — use `selection_submitted_at` as the source of truth

Currently `SelectionProgress` determines "responded" by checking if a participant has any rows in `participant_selections`. Instead, it should use the `selection_submitted_at` field on the `participants` table, which is already set when someone submits. This is more accurate because:
- It reflects *intentional* submission, not just having old data
- It works with the "no conecté con nadie" flow (we set it even for empty submissions)

**Changes to `SelectionProgress.tsx`**:
- Determine "responded" via `participant.selection_submitted_at` being non-null instead of checking the selections array for matching `selector_id`
- Keep the selections prop for the count display but base the responded/pending split on the timestamp

### 2. Add "No conecté con nadie" option in participant panel

**Changes to `ParticipantAccess.tsx`**:
- Add a secondary button below the main submit button: "No conecté con nadie en esta ronda" (or a general "No conecté con nadie")
- When clicked, call `submit-selections` with an empty selections array — the edge function already handles this case but currently does NOT set `selection_submitted_at`. We need to fix that.

**Changes to `submit-selections/index.ts`**:
- When `selections` is an empty array, still update `selection_submitted_at` on the participant so they get marked as "completed" in the admin progress tracker
- Return success with a clear message

### 3. Visual improvements to SelectionProgress

- Show a third state in the pending list: participants who have *some* selections but haven't formally "completed" (have selections but no `selection_submitted_at` — legacy edge case)
- Add a "Parcial" badge for participants who have some selections but may not have completed all rounds

## Files to modify

1. **`src/components/event/SelectionProgress.tsx`** — Use `selection_submitted_at` for responded/pending split
2. **`src/pages/ParticipantAccess.tsx`** — Add "No conecté con nadie" button
3. **`supabase/functions/submit-selections/index.ts`** — Set `selection_submitted_at` even for empty submissions

