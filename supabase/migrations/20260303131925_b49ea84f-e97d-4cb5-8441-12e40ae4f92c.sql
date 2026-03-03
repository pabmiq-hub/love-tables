
-- Create organizer_templates table
CREATE TABLE public.organizer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create template_versions table
CREATE TABLE public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.organizer_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizer_templates
CREATE POLICY "Organizers can read own templates"
ON public.organizer_templates FOR SELECT
TO authenticated
USING (
  organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Organizers can insert own templates"
ON public.organizer_templates FOR INSERT
TO authenticated
WITH CHECK (
  organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Organizers can update own templates"
ON public.organizer_templates FOR UPDATE
TO authenticated
USING (
  organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Organizers can delete own templates"
ON public.organizer_templates FOR DELETE
TO authenticated
USING (
  organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

-- RLS policies for template_versions
CREATE POLICY "Users can read versions of own templates"
ON public.template_versions FOR SELECT
TO authenticated
USING (
  template_id IN (
    SELECT id FROM public.organizer_templates
    WHERE organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can insert versions of own templates"
ON public.template_versions FOR INSERT
TO authenticated
WITH CHECK (
  template_id IN (
    SELECT id FROM public.organizer_templates
    WHERE organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  )
  OR is_super_admin(auth.uid())
);

-- Add updated_at trigger
CREATE TRIGGER update_organizer_templates_updated_at
  BEFORE UPDATE ON public.organizer_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert templates feature
INSERT INTO public.features (code, name, module, category, description)
VALUES ('templates', 'Plantillas', 'core', 'management', 'Gestión de plantillas de formularios, emails y eventos');

-- Assign templates feature to Enterprise plan
INSERT INTO public.plan_features (plan_id, feature_code)
SELECT id, 'templates' FROM public.subscription_plans WHERE name = 'enterprise';
