
-- Add CRM columns to global_participants
ALTER TABLE public.global_participants 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS source_notes text;

-- Create remarketing_campaigns table
CREATE TABLE public.remarketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  target_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipients_filter jsonb DEFAULT '{}',
  recipients_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.remarketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read own campaigns" ON public.remarketing_campaigns
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can insert own campaigns" ON public.remarketing_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can update own campaigns" ON public.remarketing_campaigns
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can delete own campaigns" ON public.remarketing_campaigns
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id) OR is_super_admin(auth.uid()));

-- Create remarketing_recipients table
CREATE TABLE public.remarketing_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.remarketing_campaigns(id) ON DELETE CASCADE,
  global_participant_id uuid REFERENCES public.global_participants(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.remarketing_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read own recipients" ON public.remarketing_recipients
  FOR SELECT TO authenticated
  USING (campaign_id IN (
    SELECT id FROM remarketing_campaigns WHERE auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id)
  ) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can insert own recipients" ON public.remarketing_recipients
  FOR INSERT TO authenticated
  WITH CHECK (campaign_id IN (
    SELECT id FROM remarketing_campaigns WHERE auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id)
  ) OR is_super_admin(auth.uid()));

CREATE POLICY "Organizers can update own recipients" ON public.remarketing_recipients
  FOR UPDATE TO authenticated
  USING (campaign_id IN (
    SELECT id FROM remarketing_campaigns WHERE auth.uid() IN (SELECT user_id FROM organizers WHERE id = organizer_id)
  ) OR is_super_admin(auth.uid()));

-- Insert CRM feature
INSERT INTO public.features (code, name, description, module, category) 
VALUES ('crm', 'CRM de Usuarios', 'Gestión avanzada de usuarios y campañas de remarketing', 'core', 'management')
ON CONFLICT DO NOTHING;

-- Link CRM feature to Enterprise plan
INSERT INTO public.plan_features (plan_id, feature_code)
VALUES ('a585d8ef-a9e6-4feb-af91-5a70e870ceac', 'crm')
ON CONFLICT DO NOTHING;
