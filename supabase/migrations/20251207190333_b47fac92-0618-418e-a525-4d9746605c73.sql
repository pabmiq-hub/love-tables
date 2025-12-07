-- Add gender parity preference column to events table
ALTER TABLE public.events 
ADD COLUMN gender_parity boolean DEFAULT false;