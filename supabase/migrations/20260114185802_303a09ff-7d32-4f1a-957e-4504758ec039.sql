-- Add timer persistence columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS round_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS round_paused_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS round_elapsed_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN public.events.round_started_at IS 'Timestamp when the current round timer was started';
COMMENT ON COLUMN public.events.round_paused_at IS 'Timestamp when the current round timer was paused (null if running)';
COMMENT ON COLUMN public.events.round_elapsed_seconds IS 'Total elapsed seconds before pause (for calculating remaining time after resume)';