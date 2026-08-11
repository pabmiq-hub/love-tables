-- 1) Restrict organizer_branding: no unconditional anon read on the base table
DROP POLICY IF EXISTS "Anon can read branding" ON public.organizer_branding;

CREATE OR REPLACE VIEW public.organizer_branding_public
WITH (security_invoker = off) AS
SELECT
  b.organizer_id,
  b.is_white_label,
  b.primary_color,
  b.secondary_color,
  b.background_color,
  b.font_family,
  b.custom_welcome_text,
  b.custom_footer_text,
  b.hide_konektum_branding
FROM public.organizer_branding b;

REVOKE ALL ON public.organizer_branding_public FROM anon, authenticated;
GRANT SELECT ON public.organizer_branding_public TO anon, authenticated;
GRANT ALL ON public.organizer_branding_public TO service_role;

REVOKE SELECT ON public.organizer_branding FROM anon;

-- 2) Organizer/super-admin policies must require an authenticated session
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles = '{public}'
      AND (
        COALESCE(qual, '') LIKE '%is_event_organizer%'
        OR COALESCE(with_check, '') LIKE '%is_event_organizer%'
        OR COALESCE(qual, '') LIKE '%is_super_admin%'
        OR COALESCE(with_check, '') LIKE '%is_super_admin%'
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 3) These SECURITY DEFINER helpers are no longer callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.is_event_organizer(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_organizer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;