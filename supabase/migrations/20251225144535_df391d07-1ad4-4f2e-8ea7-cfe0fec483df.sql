-- Add scheduled email sending capability
ALTER TABLE public.events 
ADD COLUMN scheduled_email_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.events.scheduled_email_at IS 'When set, emails will be sent at this scheduled time instead of immediately';