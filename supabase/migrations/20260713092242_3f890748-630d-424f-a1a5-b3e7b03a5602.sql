
-- Drop anon USING(true) policies on events and organizers, expose safe subsets via views.

DROP POLICY IF EXISTS "Anon can read events" ON public.events;
DROP POLICY IF EXISTS "Anon can read organizer by slug" ON public.organizers;

REVOKE SELECT ON public.events FROM anon;
REVOKE SELECT ON public.organizers FROM anon;

-- Public view of events: excludes admin-only fields (tables JSON, test_config, email_template, etc.)
CREATE OR REPLACE VIEW public.events_public AS
SELECT
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
FROM public.events;

GRANT SELECT ON public.events_public TO anon, authenticated;

-- Public view of organizers: excludes contact_email, contact_phone, stripe_customer_id, plan_id, subscription_*
CREATE OR REPLACE VIEW public.organizers_public AS
SELECT
  id, user_id, company_name, logo_url, slug, active_modules, status
FROM public.organizers;

GRANT SELECT ON public.organizers_public TO anon, authenticated;
