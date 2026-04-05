ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS reminder_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS reminder_scheduled_at timestamp with time zone DEFAULT NULL;