-- Add repeat_request feature
INSERT INTO public.features (code, name, description, module, category)
VALUES ('repeat_request', 'Solicitudes de Repetir', 'Permite a los participantes pedir volver a coincidir con alguien una vez por evento', 'social', 'engagement')
ON CONFLICT (code) DO NOTHING;

-- Enable for Pro and Enterprise plans by default
INSERT INTO public.plan_features (plan_id, feature_code)
SELECT id, 'repeat_request' FROM public.subscription_plans
WHERE name IN ('pro', 'enterprise')
ON CONFLICT DO NOTHING;

-- Cron job: expire stale repeat_requests every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-repeat-requests') THEN
    PERFORM cron.schedule(
      'expire-repeat-requests',
      '*/5 * * * *',
      $cron$
        UPDATE public.repeat_requests rr
        SET status = 'expired'
        WHERE rr.status = 'pending'
          AND (
            (rr.expires_at IS NOT NULL AND rr.expires_at < now())
            OR EXISTS (
              SELECT 1 FROM public.events e
              WHERE e.id = rr.event_id
                AND (e.status = 'completed' OR (e.current_round IS NOT NULL AND e.current_round >= e.rounds))
            )
          );
      $cron$
    );
  END IF;
END$$;