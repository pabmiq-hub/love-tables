
ALTER TABLE public.events
ADD COLUMN registration_subtitle text DEFAULT NULL,
ADD COLUMN registration_description text DEFAULT NULL;
