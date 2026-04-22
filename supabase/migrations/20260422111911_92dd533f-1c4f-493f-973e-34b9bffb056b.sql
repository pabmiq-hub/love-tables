-- 1. Modo de generación de rondas
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS tables_generation_mode text NOT NULL DEFAULT 'upfront'
CHECK (tables_generation_mode IN ('upfront', 'per_round'));

-- 2. Tabla repeat_requests
CREATE TABLE IF NOT EXISTS public.repeat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','fulfilled')),
  token text NOT NULL UNIQUE,
  scheduled_round integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  CHECK (requester_id <> target_id)
);

-- Una solicitud por participante por evento
CREATE UNIQUE INDEX IF NOT EXISTS repeat_requests_unique_per_requester
  ON public.repeat_requests (event_id, requester_id);

CREATE INDEX IF NOT EXISTS repeat_requests_event_idx ON public.repeat_requests (event_id);
CREATE INDEX IF NOT EXISTS repeat_requests_target_idx ON public.repeat_requests (target_id);
CREATE INDEX IF NOT EXISTS repeat_requests_status_idx ON public.repeat_requests (status);

ALTER TABLE public.repeat_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read repeat_requests"
ON public.repeat_requests
FOR SELECT
USING (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can update repeat_requests"
ON public.repeat_requests
FOR UPDATE
USING (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete repeat_requests"
ON public.repeat_requests
FOR DELETE
USING (is_event_organizer(auth.uid(), event_id));

-- INSERT lo hacen las edge functions con service_role (bypass RLS)