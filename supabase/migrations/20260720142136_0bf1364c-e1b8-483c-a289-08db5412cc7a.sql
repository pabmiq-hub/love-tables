ALTER VIEW public.events_public SET (security_invoker = false);
ALTER VIEW public.organizers_public SET (security_invoker = false);

DROP POLICY IF EXISTS "Anon can read public event safe fields" ON public.events;
DROP POLICY IF EXISTS "Anon can read public organizer safe fields" ON public.organizers;

REVOKE SELECT ON public.events FROM anon;
REVOKE SELECT ON public.organizers FROM anon;

GRANT SELECT ON public.events_public TO anon;
GRANT SELECT ON public.organizers_public TO anon;