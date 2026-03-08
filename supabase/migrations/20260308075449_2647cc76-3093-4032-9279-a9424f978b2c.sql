
CREATE TABLE public.organizer_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  is_white_label boolean NOT NULL DEFAULT false,
  primary_color text DEFAULT '#8B5CF6',
  secondary_color text DEFAULT '#EC4899',
  background_color text DEFAULT '#FFFFFF',
  font_family text DEFAULT 'Outfit',
  custom_welcome_text text,
  custom_footer_text text,
  hide_konektum_branding boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organizer_id)
);

ALTER TABLE public.organizer_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read own branding"
  ON public.organizer_branding FOR SELECT
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can update own branding"
  ON public.organizer_branding FOR UPDATE
  USING (organizer_id IN (SELECT id FROM organizers WHERE user_id = auth.uid()));

CREATE POLICY "Super admin can manage all branding"
  ON public.organizer_branding FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Anon can read branding"
  ON public.organizer_branding FOR SELECT
  USING (true);

CREATE TRIGGER update_organizer_branding_updated_at
  BEFORE UPDATE ON public.organizer_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
