
-- Add registration_open and waitlist_enabled to events
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false;

-- Create waitlist table
CREATE TABLE public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  gender text,
  birth_date date,
  age_range text,
  preference text,
  dating_preference text,
  preferred_age_range text,
  is_returning_participant boolean DEFAULT false,
  -- B2B fields
  entity_type text,
  company_name text,
  sector text,
  company_size text,
  needs text[],
  solutions text[],
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  promoted_at timestamptz,
  UNIQUE(event_id, email)
);

-- Enable RLS
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anon can insert waitlist entries"
  ON public.event_waitlist FOR INSERT
  TO public
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_waitlist.event_id));

CREATE POLICY "Organizers can read waitlist"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can update waitlist"
  ON public.event_waitlist FOR UPDATE
  TO authenticated
  USING (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete waitlist"
  ON public.event_waitlist FOR DELETE
  TO authenticated
  USING (is_event_organizer(auth.uid(), event_id));
