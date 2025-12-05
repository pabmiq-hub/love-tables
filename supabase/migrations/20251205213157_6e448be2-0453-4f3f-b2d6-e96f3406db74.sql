-- Add checked_in column to participants
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false;