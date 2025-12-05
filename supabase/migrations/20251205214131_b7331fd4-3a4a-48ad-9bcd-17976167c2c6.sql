-- Add timestamp to track when participants submitted their selections
ALTER TABLE public.participants 
ADD COLUMN selection_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Drop the overly permissive SELECT policy on participants
DROP POLICY IF EXISTS "Participants are readable for event access" ON public.participants;

-- Create restrictive SELECT policy - only organizers can read participant data
CREATE POLICY "Organizers can read participants"
ON public.participants
FOR SELECT
USING (is_event_organizer(auth.uid(), event_id));

-- Drop the weak INSERT policy on participant_selections
DROP POLICY IF EXISTS "Participants can add selections" ON public.participant_selections;

-- Create a more restrictive INSERT policy that prevents duplicate submissions
-- Uses a subquery to check the participant hasn't already submitted
CREATE POLICY "Participants can add selections once"
ON public.participant_selections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events WHERE id = event_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM participant_selections ps 
    WHERE ps.event_id = participant_selections.event_id 
    AND ps.selector_id = participant_selections.selector_id
  )
);