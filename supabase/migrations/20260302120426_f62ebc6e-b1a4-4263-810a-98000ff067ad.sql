
CREATE TABLE public.organizer_verified_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  domain text NOT NULL,
  resend_domain_id text,
  status text NOT NULL DEFAULT 'pending',
  dns_records jsonb DEFAULT '[]'::jsonb,
  sender_email text,
  sender_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organizer_id)
);

ALTER TABLE public.organizer_verified_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read own verified domains"
  ON public.organizer_verified_domains FOR SELECT
  TO authenticated
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can insert own verified domains"
  ON public.organizer_verified_domains FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can update own verified domains"
  ON public.organizer_verified_domains FOR UPDATE
  TO authenticated
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can delete own verified domains"
  ON public.organizer_verified_domains FOR DELETE
  TO authenticated
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Super admin can manage verified domains"
  ON public.organizer_verified_domains FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
