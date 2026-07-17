-- Replace public event view so anon reads go through a sanitized owner-executed view
DROP VIEW IF EXISTS public.events_public;

CREATE VIEW public.events_public AS
SELECT
  id,
  name,
  date,
  status,
  language,
  event_time,
  event_location,
  organizer_id,
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
  (
    COALESCE((preliminary_round ->> 'enabled')::boolean, false)
    AND jsonb_typeof(preliminary_round -> 'tables') = 'array'
    AND jsonb_array_length(preliminary_round -> 'tables') > 0
  ) AS has_preliminary_tables
FROM public.events;

DROP VIEW IF EXISTS public.organizers_public;

CREATE VIEW public.organizers_public AS
SELECT
  id,
  user_id,
  company_name,
  logo_url,
  slug,
  active_modules,
  status
FROM public.organizers;

-- Public visitors can read only the sanitized views
GRANT SELECT ON public.events_public TO anon, authenticated, service_role;
GRANT SELECT ON public.organizers_public TO anon, authenticated, service_role;

-- Prevent anonymous users from reading the full base tables directly
DROP POLICY IF EXISTS "Anon read public event fields" ON public.events;
DROP POLICY IF EXISTS "Anon read public organizer fields" ON public.organizers;

REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.organizers FROM anon;

-- Keep internal authenticated/service access intact
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;