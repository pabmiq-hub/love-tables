
-- Remove broad listing of organizer-logos bucket; getPublicUrl on a public bucket still works
DROP POLICY IF EXISTS "Anyone can view organizer logos" ON storage.objects;

-- Revoke EXECUTE on trigger-only / RLS-only functions from authenticated as well
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_generate_organizer_slug() FROM anon, authenticated, public;
