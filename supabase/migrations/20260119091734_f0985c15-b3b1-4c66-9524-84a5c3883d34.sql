-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;

-- Create proper policies for edge functions using service role
-- Edge functions use service role which bypasses RLS, so we just need organizer policies
CREATE POLICY "Organizers can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete email logs"
ON public.email_logs
FOR DELETE
USING (is_event_organizer(auth.uid(), event_id));