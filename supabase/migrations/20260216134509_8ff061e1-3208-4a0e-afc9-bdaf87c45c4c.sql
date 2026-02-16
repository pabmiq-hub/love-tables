
-- Add selection deadline configuration to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS selection_deadline_hours integer DEFAULT 48;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS selection_closed_at timestamptz DEFAULT null;
