-- Public-safe derived fields for participant-facing views
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_profile_id uuid,
  ADD COLUMN IF NOT EXISTS public_preliminary_tables_available boolean NOT NULL DEFAULT false;

UPDATE public.events e
SET
  organizer_profile_id = o.id,
  public_preliminary_tables_available = (
    COALESCE((e.preliminary_round ->> 'enabled')::boolean, false)
    AND jsonb_typeof(e.preliminary_round -> 'tables') = 'array'
    AND jsonb_array_length(e.preliminary_round -> 'tables') > 0
  )
FROM public.organizers o
WHERE o.user_id = e.organizer_id;

UPDATE public.events e
SET public_preliminary_tables_available = (
  COALESCE((e.preliminary_round ->> 'enabled')::boolean, false)
  AND jsonb_typeof(e.preliminary_round -> 'tables') = 'array'
  AND jsonb_array_length(e.preliminary_round -> 'tables') > 0
)
WHERE e.organizer_profile_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_event_public_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organizer_profile_id IS NULL OR NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
    SELECT id INTO NEW.organizer_profile_id
    FROM public.organizers
    WHERE user_id = NEW.organizer_id
    LIMIT 1;
  END IF;

  NEW.public_preliminary_tables_available := (
    COALESCE((NEW.preliminary_round ->> 'enabled')::boolean, false)
    AND jsonb_typeof(NEW.preliminary_round -> 'tables') = 'array'
    AND jsonb_array_length(NEW.preliminary_round -> 'tables') > 0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_event_public_fields_trigger ON public.events;
CREATE TRIGGER sync_event_public_fields_trigger
BEFORE INSERT OR UPDATE OF organizer_id, organizer_profile_id, preliminary_round
ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.sync_event_public_fields();

-- Replace public views as security-invoker views so underlying column grants apply
DROP VIEW IF EXISTS public.events_public;
CREATE VIEW public.events_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  date,
  status,
  language,
  event_time,
  event_location,
  organizer_profile_id,
  module,
  current_round,
  rounds,
  custom_age_ranges,
  custom_genders,
  custom_preferences,
  custom_dating_preferences,
  registration_requirements_enabled,
  slot_quotas,
  quota_waitlist_enabled,
  registration_subtitle,
  registration_description,
  professional_config,
  custom_registration_form,
  registration_open,
  waitlist_enabled,
  wrapped_enabled,
  wrapped_questions,
  languages_enabled,
  available_languages,
  selection_deadline_hours,
  selection_closed_at,
  scheduled_email_at,
  checkin_opens_minutes_before,
  checkin_open,
  repeat_request_enabled,
  crush_enabled,
  super_like_enabled,
  round_duration,
  table_size,
  participants_count,
  round_started_at,
  round_paused_at,
  round_elapsed_seconds,
  group_rounds,
  draft_round,
  payment_tracking_enabled,
  public_preliminary_tables_available AS has_preliminary_tables
FROM public.events;

DROP VIEW IF EXISTS public.organizers_public;
CREATE VIEW public.organizers_public
WITH (security_invoker = on) AS
SELECT
  id,
  company_name,
  logo_url,
  slug,
  status
FROM public.organizers;

GRANT SELECT ON public.events_public TO anon, authenticated, service_role;
GRANT SELECT ON public.organizers_public TO anon, authenticated, service_role;

-- Allow anonymous users to read rows, but only granted public-safe columns can be selected.
DROP POLICY IF EXISTS "Anon read public event fields" ON public.events;
DROP POLICY IF EXISTS "Anon can read public event safe fields" ON public.events;
CREATE POLICY "Anon can read public event safe fields"
ON public.events
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Anon read public organizer fields" ON public.organizers;
DROP POLICY IF EXISTS "Anon can read public organizer safe fields" ON public.organizers;
CREATE POLICY "Anon can read public organizer safe fields"
ON public.organizers
FOR SELECT
TO anon
USING (true);

REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.organizers FROM anon;

GRANT SELECT (
  id,
  name,
  date,
  status,
  language,
  event_time,
  event_location,
  organizer_profile_id,
  module,
  current_round,
  rounds,
  custom_age_ranges,
  custom_genders,
  custom_preferences,
  custom_dating_preferences,
  registration_requirements_enabled,
  slot_quotas,
  quota_waitlist_enabled,
  registration_subtitle,
  registration_description,
  professional_config,
  custom_registration_form,
  registration_open,
  waitlist_enabled,
  wrapped_enabled,
  wrapped_questions,
  languages_enabled,
  available_languages,
  selection_deadline_hours,
  selection_closed_at,
  scheduled_email_at,
  checkin_opens_minutes_before,
  checkin_open,
  repeat_request_enabled,
  crush_enabled,
  super_like_enabled,
  round_duration,
  table_size,
  participants_count,
  round_started_at,
  round_paused_at,
  round_elapsed_seconds,
  group_rounds,
  draft_round,
  payment_tracking_enabled,
  public_preliminary_tables_available
) ON public.events TO anon;

GRANT SELECT (id, company_name, logo_url, slug, status) ON public.organizers TO anon;

-- Keep internal authenticated/service access intact
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;