ALTER VIEW public.events_public SET (security_invoker = off);
ALTER VIEW public.organizers_public SET (security_invoker = off);
GRANT SELECT ON public.events_public TO anon, authenticated;
GRANT SELECT ON public.organizers_public TO anon, authenticated;