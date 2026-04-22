-- Add group_id to support groups of 3+ participants
-- All rows belonging to the same group share the same group_id.
-- A group of N participants is stored as N*(N-1)/2 pairwise rows
-- so the existing pair-based seating algorithm keeps working unchanged.

ALTER TABLE public.participant_inclusions
  ADD COLUMN IF NOT EXISTS group_id uuid;

ALTER TABLE public.participant_exclusions
  ADD COLUMN IF NOT EXISTS group_id uuid;

-- Backfill: legacy rows (pairs of 2) get a unique group_id each so they
-- continue to behave as standalone pairs in the UI.
UPDATE public.participant_inclusions
SET group_id = gen_random_uuid()
WHERE group_id IS NULL;

UPDATE public.participant_exclusions
SET group_id = gen_random_uuid()
WHERE group_id IS NULL;

-- Helpful indexes for grouping queries
CREATE INDEX IF NOT EXISTS idx_participant_inclusions_group
  ON public.participant_inclusions(event_id, group_id);

CREATE INDEX IF NOT EXISTS idx_participant_exclusions_group
  ON public.participant_exclusions(event_id, group_id);