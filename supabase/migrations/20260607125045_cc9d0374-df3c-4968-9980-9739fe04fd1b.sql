
-- 1. Storage: remove broad logo policies, keep ownership-scoped
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
-- Also remove duplicate public read policy
DROP POLICY IF EXISTS "Public read access to organizer logos" ON storage.objects;

-- 2. participant_selections: remove anonymous INSERT (edge function uses service role)
DROP POLICY IF EXISTS "Participants can add selections once" ON public.participant_selections;

-- 3. SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated for internal-only functions
REVOKE EXECUTE ON FUNCTION public.increment_participants(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_module(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_event_limits(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_organizer_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_organizer_status(uuid) FROM anon, authenticated, public;
-- is_super_admin and is_event_organizer remain executable by authenticated since they are referenced by RLS policies
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_event_organizer(uuid, uuid) FROM anon, public;
