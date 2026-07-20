ALTER VIEW public.events_public SET (security_invoker = on);
ALTER VIEW public.organizers_public SET (security_invoker = on);

DROP POLICY IF EXISTS "Anon can read public event safe fields" ON public.events;
DROP POLICY IF EXISTS "Anon can read public organizer safe fields" ON public.organizers;

REVOKE SELECT ON public.events FROM anon;
REVOKE SELECT ON public.organizers FROM anon;

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

GRANT SELECT (
  id,
  company_name,
  logo_url,
  slug,
  status
) ON public.organizers TO anon;

CREATE POLICY "Anon can read public event safe fields"
ON public.events
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can read public organizer safe fields"
ON public.organizers
FOR SELECT
TO anon
USING (true);

GRANT SELECT ON public.events_public TO anon;
GRANT SELECT ON public.organizers_public TO anon;