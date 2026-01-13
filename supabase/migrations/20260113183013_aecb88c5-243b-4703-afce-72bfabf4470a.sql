-- Create table for participant exclusions (pairs that should never be at the same table)
CREATE TABLE public.participant_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_1_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate exclusions (order-independent)
  CONSTRAINT unique_exclusion_pair UNIQUE (event_id, participant_1_id, participant_2_id),
  -- Prevent self-exclusion
  CONSTRAINT no_self_exclusion CHECK (participant_1_id != participant_2_id)
);

-- Enable RLS
ALTER TABLE public.participant_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only event organizers can manage exclusions
CREATE POLICY "Organizers can read exclusions"
ON public.participant_exclusions
FOR SELECT
USING (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can create exclusions"
ON public.participant_exclusions
FOR INSERT
WITH CHECK (is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete exclusions"
ON public.participant_exclusions
FOR DELETE
USING (is_event_organizer(auth.uid(), event_id));

-- Index for faster queries
CREATE INDEX idx_exclusions_event_id ON public.participant_exclusions(event_id);
CREATE INDEX idx_exclusions_participants ON public.participant_exclusions(participant_1_id, participant_2_id);