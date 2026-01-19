-- Create email_logs table for tracking individual email sends
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'match', 'reminder', 'selection_request'
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_email_logs_event_id ON public.email_logs(event_id);
CREATE INDEX idx_email_logs_participant_id ON public.email_logs(participant_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Organizers can read email logs for their events
CREATE POLICY "Organizers can read email logs"
ON public.email_logs
FOR SELECT
USING (is_event_organizer(auth.uid(), event_id));

-- Organizers can insert email logs (through edge functions with service role)
CREATE POLICY "Service role can manage email logs"
ON public.email_logs
FOR ALL
USING (true)
WITH CHECK (true);