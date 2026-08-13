CREATE OR REPLACE VIEW public.events_public AS
 SELECT id, name, date, status, language, event_time, event_location,
    organizer_profile_id, organizer_profile_id AS organizer_id, module,
    current_round, rounds, custom_age_ranges, custom_genders, custom_preferences,
    custom_dating_preferences, registration_requirements_enabled, slot_quotas,
    quota_waitlist_enabled, registration_subtitle, registration_description,
    professional_config, custom_registration_form, registration_open,
    waitlist_enabled, wrapped_enabled, wrapped_questions, languages_enabled,
    available_languages, selection_deadline_hours, selection_closed_at,
    scheduled_email_at, checkin_opens_minutes_before, checkin_open,
    repeat_request_enabled, crush_enabled, super_like_enabled, round_duration,
    table_size, participants_count, round_started_at, round_paused_at,
    round_elapsed_seconds, group_rounds, draft_round, payment_tracking_enabled,
    public_preliminary_tables_available AS has_preliminary_tables,
    social_game
   FROM events;

ALTER VIEW public.events_public SET (security_invoker = off);
GRANT SELECT ON public.events_public TO anon, authenticated;