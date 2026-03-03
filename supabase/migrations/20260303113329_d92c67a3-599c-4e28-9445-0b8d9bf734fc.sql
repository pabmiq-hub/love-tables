
CREATE TABLE public.organizer_resend_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  resend_api_key text NOT NULL,
  sender_email text NOT NULL,
  sender_name text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organizer_id)
);

ALTER TABLE public.organizer_resend_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read own resend config"
  ON public.organizer_resend_config
  FOR SELECT
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can insert own resend config"
  ON public.organizer_resend_config
  FOR INSERT
  WITH CHECK (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can update own resend config"
  ON public.organizer_resend_config
  FOR UPDATE
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can delete own resend config"
  ON public.organizer_resend_config
  FOR DELETE
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Super admin can manage resend config"
  ON public.organizer_resend_config
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
