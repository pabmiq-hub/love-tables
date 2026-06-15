
-- 1. crush_enabled flag on events (default false, opt-in per event)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS crush_enabled boolean NOT NULL DEFAULT false;

-- 2. crush_requests table
CREATE TABLE IF NOT EXISTS public.crush_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  token text NOT NULL,
  scheduled_round integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT crush_requests_one_per_event UNIQUE (event_id, requester_id),
  CONSTRAINT crush_requests_no_self CHECK (requester_id <> target_id)
);

CREATE INDEX IF NOT EXISTS crush_requests_event_status_idx ON public.crush_requests (event_id, status);
CREATE INDEX IF NOT EXISTS crush_requests_target_idx ON public.crush_requests (target_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crush_requests TO authenticated;
GRANT ALL ON public.crush_requests TO service_role;

ALTER TABLE public.crush_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read crush_requests"
  ON public.crush_requests FOR SELECT
  USING (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can update crush_requests"
  ON public.crush_requests FOR UPDATE
  USING (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete crush_requests"
  ON public.crush_requests FOR DELETE
  USING (public.is_event_organizer(auth.uid(), event_id));
-- INSERT happens only via edge functions (service role), so no insert policy for users.
