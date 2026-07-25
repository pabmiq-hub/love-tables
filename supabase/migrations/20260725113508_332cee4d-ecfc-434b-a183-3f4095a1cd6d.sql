-- Restrict anon SELECT on events/organizers to only public views
DROP POLICY IF EXISTS "Anon can read public event safe fields" ON public.events;
DROP POLICY IF EXISTS "Anon can read public organizer safe fields" ON public.organizers;

-- Restrict participant INSERT: only service_role (edge function register-participant)
DROP POLICY IF EXISTS "Participants can be added to events" ON public.participants;
REVOKE INSERT ON public.participants FROM anon, authenticated;