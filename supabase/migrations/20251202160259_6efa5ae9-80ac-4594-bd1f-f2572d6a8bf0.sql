-- Add phone column to participants
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add selection_type to participant_selections (friendship, dating, or both)
ALTER TABLE public.participant_selections ADD COLUMN IF NOT EXISTS selection_type TEXT DEFAULT 'friendship';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_selections_type ON public.participant_selections(selection_type);