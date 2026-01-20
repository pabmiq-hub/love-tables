
-- =============================================
-- FASE 1B: ESTRUCTURA SaaS MULTI-TENANT
-- =============================================

-- 1. Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  max_events INTEGER,
  max_participants_per_event INTEGER,
  max_active_events INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create modules table
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_plans TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create features table
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL DEFAULT 'core',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create plan_features table
CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE NOT NULL,
  feature_code TEXT NOT NULL,
  is_limited BOOLEAN DEFAULT false,
  limit_value INTEGER,
  UNIQUE(plan_id, feature_code)
);

-- 5. Create organizers table
CREATE TABLE public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  plan_id UUID REFERENCES subscription_plans(id),
  trial_ends_at TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  active_modules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'suspended', 'cancelled'))
);

-- 6. Add module column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'social';

-- 7. Add professional fields to participants table
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS needs TEXT[];
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS solutions TEXT[];
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS business_interests TEXT[];

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Function: get_organizer_id
CREATE OR REPLACE FUNCTION public.get_organizer_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM organizers WHERE user_id = _user_id
$$;

-- Function: get_organizer_status
CREATE OR REPLACE FUNCTION public.get_organizer_status(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM organizers WHERE user_id = _user_id
$$;

-- Function: has_feature
CREATE OR REPLACE FUNCTION public.has_feature(_user_id UUID, _feature_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT plan_id INTO v_plan_id FROM organizers WHERE user_id = _user_id AND status = 'active';
  IF v_plan_id IS NULL THEN RETURN false; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM plan_features
    WHERE plan_id = v_plan_id AND feature_code = _feature_code
  );
END;
$$;

-- Function: has_module
CREATE OR REPLACE FUNCTION public.has_module(_user_id UUID, _module_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN is_super_admin(_user_id) THEN true
      ELSE _module_code = ANY(active_modules)
    END
  FROM organizers WHERE user_id = _user_id
$$;

-- Function: check_event_limits
CREATE OR REPLACE FUNCTION public.check_event_limits(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_events INTEGER;
  v_current_events INTEGER;
  v_organizer_id UUID;
BEGIN
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT o.id, sp.max_active_events
  INTO v_organizer_id, v_max_events
  FROM organizers o
  JOIN subscription_plans sp ON o.plan_id = sp.id
  WHERE o.user_id = _user_id AND o.status = 'active';
  
  IF v_max_events IS NULL THEN RETURN true; END IF;
  
  SELECT COUNT(*) INTO v_current_events
  FROM events
  WHERE organizer_id = v_organizer_id AND status IN ('pending', 'active');
  
  RETURN v_current_events < v_max_events;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

-- Subscription Plans
CREATE POLICY "Plans readable by all authenticated"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Plans writable by super_admin"
ON public.subscription_plans FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Modules
CREATE POLICY "Modules readable by all authenticated"
ON public.modules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Modules writable by super_admin"
ON public.modules FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Features
CREATE POLICY "Features readable by all authenticated"
ON public.features FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Features writable by super_admin"
ON public.features FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Plan Features
CREATE POLICY "Plan features readable by all authenticated"
ON public.plan_features FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Plan features writable by super_admin"
ON public.plan_features FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Organizers
CREATE POLICY "Super admin can view all organizers"
ON public.organizers FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Super admin can manage all organizers"
ON public.organizers FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Organizers can update their own profile"
ON public.organizers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_organizers_updated_at
BEFORE UPDATE ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED DATA
-- =============================================

-- Subscription plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, max_events, max_participants_per_event, max_active_events, is_default, sort_order) VALUES
('free', 'Gratuito', 'Plan básico para empezar', 0, 0, 3, 20, 1, true, 1),
('professional', 'Profesional', 'Para organizadores activos', 29, 290, NULL, 100, 10, false, 2),
('enterprise', 'Empresa', 'Solución empresarial completa', 0, 0, NULL, NULL, NULL, false, 3);

-- Modules
INSERT INTO public.modules (code, name, description, requires_plans) VALUES
('social', 'Módulo Social', 'Speed dating con preferencias personales, edad, género', ARRAY['free', 'professional', 'enterprise']),
('professional', 'Módulo Profesional', 'Networking B2B con matching cliente-proveedor', ARRAY['professional', 'enterprise']);

-- Features
INSERT INTO public.features (code, name, description, module, category) VALUES
('qr_checkin', 'Check-in con QR', 'Registro de participantes mediante código QR', 'core', 'participants'),
('manual_participants', 'Participantes manuales', 'Añadir participantes manualmente', 'core', 'participants'),
('voting_system', 'Sistema de votación', 'Participantes pueden votar sus preferencias', 'core', 'matching'),
('manual_matches', 'Matches manuales', 'Crear matches manualmente', 'core', 'matching'),
('basic_emails', 'Emails básicos', 'Envío de emails de matches', 'core', 'communication'),
('excel_import', 'Importación Excel', 'Importar participantes desde archivo Excel', 'core', 'participants'),
('auto_emails', 'Emails automáticos', 'Programación y automatización de emails', 'core', 'communication'),
('analytics', 'Dashboard analytics', 'Estadísticas detalladas del evento', 'core', 'analytics'),
('custom_branding', 'Marca personalizada', 'Personalizar colores y logo', 'core', 'branding'),
('avoid_encounters', 'Evitar coincidencias', 'Sistema inteligente de exclusiones', 'core', 'matching'),
('gender_matching', 'Matching por género', 'Emparejamiento basado en género', 'social', 'matching'),
('age_preferences', 'Preferencias de edad', 'Filtros por rango de edad', 'social', 'matching'),
('dating_preferences', 'Preferencias románticas', 'Configuración de preferencias personales', 'social', 'matching'),
('sector_matching', 'Matching por sector', 'Emparejamiento por sector empresarial', 'professional', 'matching'),
('client_provider_roles', 'Roles cliente/proveedor', 'Definir tipo de entidad en networking', 'professional', 'matching'),
('business_intro_emails', 'Emails de presentación', 'Emails formales de introducción B2B', 'professional', 'communication');

-- Free plan features
INSERT INTO public.plan_features (plan_id, feature_code) 
SELECT sp.id, f.code
FROM subscription_plans sp, (VALUES 
  ('qr_checkin'), ('manual_participants'), ('voting_system'), ('basic_emails'),
  ('gender_matching'), ('age_preferences'), ('dating_preferences')
) AS f(code)
WHERE sp.name = 'free';

-- Professional plan features
INSERT INTO public.plan_features (plan_id, feature_code) 
SELECT sp.id, f.code
FROM subscription_plans sp, (VALUES 
  ('qr_checkin'), ('manual_participants'), ('voting_system'), ('basic_emails'),
  ('gender_matching'), ('age_preferences'), ('dating_preferences'),
  ('excel_import'), ('auto_emails'), ('analytics'), ('avoid_encounters'),
  ('sector_matching'), ('client_provider_roles'), ('business_intro_emails')
) AS f(code)
WHERE sp.name = 'professional';

-- Enterprise plan features
INSERT INTO public.plan_features (plan_id, feature_code) 
SELECT sp.id, f.code
FROM subscription_plans sp, (VALUES 
  ('qr_checkin'), ('manual_participants'), ('voting_system'), ('basic_emails'),
  ('gender_matching'), ('age_preferences'), ('dating_preferences'),
  ('excel_import'), ('auto_emails'), ('analytics'), ('custom_branding'), ('avoid_encounters'),
  ('sector_matching'), ('client_provider_roles'), ('business_intro_emails'), ('manual_matches')
) AS f(code)
WHERE sp.name = 'enterprise';

-- Performance indexes
CREATE INDEX idx_organizers_user_id ON public.organizers(user_id);
CREATE INDEX idx_organizers_status ON public.organizers(status);
CREATE INDEX idx_organizers_plan_id ON public.organizers(plan_id);
CREATE INDEX idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX idx_plan_features_feature_code ON public.plan_features(feature_code);
CREATE INDEX idx_events_module ON public.events(module);
