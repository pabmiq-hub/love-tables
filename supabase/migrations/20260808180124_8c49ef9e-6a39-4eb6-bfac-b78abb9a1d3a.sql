GRANT INSERT ON public.participants TO authenticated;

DROP POLICY IF EXISTS "Organizers can insert participants" ON public.participants;
CREATE POLICY "Organizers can insert participants"
ON public.participants
FOR INSERT
TO authenticated
WITH CHECK (public.is_event_organizer(auth.uid(), event_id));