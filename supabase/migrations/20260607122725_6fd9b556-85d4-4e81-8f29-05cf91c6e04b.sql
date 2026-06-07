
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS payment_reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_reminder_first_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS payment_reminder_second_hours integer;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS payment_reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_last_reminder_at timestamp with time zone;
