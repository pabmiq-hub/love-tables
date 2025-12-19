-- Add columns for custom event preferences
ALTER TABLE public.events 
ADD COLUMN custom_age_ranges jsonb NULL,
ADD COLUMN custom_genders jsonb NULL,
ADD COLUMN custom_preferences jsonb NULL,
ADD COLUMN custom_dating_preferences jsonb NULL;