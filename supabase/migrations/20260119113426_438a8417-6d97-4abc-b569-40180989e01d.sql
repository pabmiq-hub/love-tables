-- Add column to store original inscriptions count before event starts
ALTER TABLE public.events 
ADD COLUMN original_participants_count integer DEFAULT NULL;