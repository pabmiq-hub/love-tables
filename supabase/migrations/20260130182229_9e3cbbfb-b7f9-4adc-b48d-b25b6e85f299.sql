-- Create organizer_features table for granular feature overrides
CREATE TABLE public.organizer_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE NOT NULL,
  feature_code TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organizer_id, feature_code)
);

-- Enable RLS
ALTER TABLE public.organizer_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super_admin can manage
CREATE POLICY "Super admin can manage organizer features"
ON public.organizer_features
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Organizers can read their own feature overrides
CREATE POLICY "Organizers can read their own feature overrides"
ON public.organizer_features
FOR SELECT
USING (
  organizer_id IN (
    SELECT id FROM public.organizers WHERE user_id = auth.uid()
  )
);