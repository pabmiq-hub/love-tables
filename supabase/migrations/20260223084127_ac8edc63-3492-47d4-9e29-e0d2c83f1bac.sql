
ALTER TABLE public.events
ADD COLUMN event_time text DEFAULT NULL,
ADD COLUMN event_location text DEFAULT NULL;
