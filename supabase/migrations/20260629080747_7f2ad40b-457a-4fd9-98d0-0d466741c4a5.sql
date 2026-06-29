ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_tables JSONB;

INSERT INTO public.features (code, name, description, category)
SELECT 'custom_table_layout', 'Mesas personalizadas', 'Configurar manualmente el número de mesas y la capacidad de cada una', 'social'
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE code = 'custom_table_layout');

INSERT INTO public.plan_features (plan_id, feature_code)
SELECT sp.id, 'custom_table_layout'
FROM public.subscription_plans sp
WHERE sp.name = 'enterprise'
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_features pf
    WHERE pf.plan_id = sp.id AND pf.feature_code = 'custom_table_layout'
  );