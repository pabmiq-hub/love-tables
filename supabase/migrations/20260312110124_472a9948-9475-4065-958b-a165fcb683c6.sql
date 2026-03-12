ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS checkin_opens_minutes_before integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS checkin_open boolean DEFAULT false;