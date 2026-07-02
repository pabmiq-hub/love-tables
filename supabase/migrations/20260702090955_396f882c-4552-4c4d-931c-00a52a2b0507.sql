
-- 1) Events: idiomas + Wrapped
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS languages_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_languages text[] NOT NULL DEFAULT ARRAY['Castellano','Català','English','Portugués','Français']::text[],
  ADD COLUMN IF NOT EXISTS wrapped_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wrapped_questions jsonb;

-- 2) Participants: idiomas hablados + wrapped_profile
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS spoken_languages text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS wrapped_profile_id uuid;

-- 3) Wrapped profiles (una por email y organizador)
CREATE TABLE IF NOT EXISTS public.wrapped_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  email text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  hobbies_ranked text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizer_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wrapped_profiles TO authenticated;
GRANT ALL ON public.wrapped_profiles TO service_role;
ALTER TABLE public.wrapped_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own wrapped profiles"
  ON public.wrapped_profiles FOR ALL
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE TRIGGER trg_wrapped_profiles_updated_at
  BEFORE UPDATE ON public.wrapped_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Foreign key desde participants (nullable)
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_wrapped_profile_id_fkey;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_wrapped_profile_id_fkey
  FOREIGN KEY (wrapped_profile_id) REFERENCES public.wrapped_profiles(id) ON DELETE SET NULL;

-- 4) Wrapped table requests
CREATE TABLE IF NOT EXISTS public.wrapped_table_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  receiver_participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  compatibility_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (event_id, sender_participant_id, receiver_participant_id)
);

CREATE INDEX IF NOT EXISTS idx_wtr_event ON public.wrapped_table_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_wtr_receiver ON public.wrapped_table_requests(receiver_participant_id);
CREATE INDEX IF NOT EXISTS idx_wtr_sender ON public.wrapped_table_requests(sender_participant_id);

GRANT SELECT ON public.wrapped_table_requests TO authenticated;
GRANT ALL ON public.wrapped_table_requests TO service_role;
ALTER TABLE public.wrapped_table_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer of event can read wrapped table requests"
  ON public.wrapped_table_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = wrapped_table_requests.event_id
      AND e.organizer_id = auth.uid()
  ));
