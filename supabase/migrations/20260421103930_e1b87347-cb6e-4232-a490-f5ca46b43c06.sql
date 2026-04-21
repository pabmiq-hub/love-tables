-- Add test mode columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_test_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_config jsonb;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;

-- Index to filter quickly
CREATE INDEX IF NOT EXISTS idx_events_is_test_event ON public.events(is_test_event);
CREATE INDEX IF NOT EXISTS idx_participants_is_fake ON public.participants(is_fake);

-- Register the new feature
INSERT INTO public.features (code, name, description, module, category)
VALUES (
  'test_events',
  'Eventos de prueba',
  'Permite crear eventos con participantes ficticios para testear el comportamiento sin afectar las analíticas globales ni el CRM.',
  'core',
  'enterprise'
)
ON CONFLICT (code) DO NOTHING;

-- Assign feature only to enterprise plans (by name match: enterprise/empresa)
INSERT INTO public.plan_features (plan_id, feature_code, is_limited, limit_value)
SELECT sp.id, 'test_events', false, NULL
FROM public.subscription_plans sp
WHERE LOWER(sp.name) IN ('enterprise', 'empresa')
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_features pf
    WHERE pf.plan_id = sp.id AND pf.feature_code = 'test_events'
  );