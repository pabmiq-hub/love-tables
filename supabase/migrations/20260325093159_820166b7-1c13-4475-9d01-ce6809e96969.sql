
-- Add preliminary_round column to events table
ALTER TABLE public.events ADD COLUMN preliminary_round jsonb DEFAULT null;

-- Insert feature for preliminary round
INSERT INTO public.features (code, name, description, module, category)
VALUES ('preliminary_round', 'Ronda Preliminar', 'Permite crear mesas de relleno mientras los participantes llegan, sin tener en cuenta preferencias', 'social', 'event_management');

-- Link feature to enterprise plan
INSERT INTO public.plan_features (plan_id, feature_code)
SELECT sp.id, 'preliminary_round'
FROM public.subscription_plans sp
WHERE sp.name = 'enterprise';
