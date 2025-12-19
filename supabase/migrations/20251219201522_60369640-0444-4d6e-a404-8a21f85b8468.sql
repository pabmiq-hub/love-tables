-- Add email column to participants
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS email TEXT;

-- Add email tracking columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS emails_sent_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS email_template JSONB;