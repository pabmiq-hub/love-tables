-- Add game_mode feature
INSERT INTO public.features (code, name, description, module, category)
VALUES (
  'game_mode',
  'Modo lúdico',
  'Permite asignar dinámicas (juegos) a un grupo de mesas. Garantiza que ningún participante repita la misma dinámica entre rondas, incluida la ronda preliminar.',
  'social',
  'gameplay'
)
ON CONFLICT (code) DO NOTHING;

-- Grant feature to Enterprise plan
INSERT INTO public.plan_features (plan_id, feature_code, is_limited)
SELECT id, 'game_mode', false
FROM public.subscription_plans
WHERE name = 'enterprise'
ON CONFLICT DO NOTHING;

-- Add game_mode column to events (jsonb)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS game_mode jsonb;
