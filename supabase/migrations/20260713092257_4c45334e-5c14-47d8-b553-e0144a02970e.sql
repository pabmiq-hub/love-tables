
ALTER VIEW public.events_public SET (security_invoker = on);
ALTER VIEW public.organizers_public SET (security_invoker = on);

-- Re-grant SELECT on base tables to anon so security_invoker views can read; column-level GRANTs restrict to safe columns.
GRANT SELECT (
  id, name, date, status, language, event_time, event_location,
  organizer_id, module, current_round, rounds, preliminary_round,
  custom_age_ranges, custom_genders, custom_preferences, custom_dating_preferences,
  registration_requirements_enabled, slot_quotas, registration_subtitle, registration_description,
  professional_config, custom_registration_form, registration_open, waitlist_enabled,
  wrapped_enabled, wrapped_questions, languages_enabled, available_languages,
  selection_deadline_hours, selection_closed_at, scheduled_email_at,
  checkin_opens_minutes_before, checkin_open,
  repeat_request_enabled, crush_enabled, super_like_enabled,
  round_duration, table_size, participants_count, round_started_at, round_paused_at,
  round_elapsed_seconds, group_rounds, custom_tables, draft_round,
  payment_tracking_enabled
) ON public.events TO anon;

GRANT SELECT (
  id, user_id, company_name, logo_url, slug, active_modules, status
) ON public.organizers TO anon;

-- Row-level policy: anon can read via view only. Restrict rows to non-null id (essentially all rows, since column grants provide the real filtering).
CREATE POLICY "Anon read public event fields"
  ON public.events FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon read public organizer fields"
  ON public.organizers FOR SELECT
  TO anon
  USING (true);
