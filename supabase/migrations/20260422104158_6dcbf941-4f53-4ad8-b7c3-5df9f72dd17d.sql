
-- Inclusions: pairs of participants that MUST sit together at every round
CREATE TABLE public.participant_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  participant_1_id uuid NOT NULL,
  participant_2_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate (unordered) pairs per event
CREATE UNIQUE INDEX participant_inclusions_unique_pair
  ON public.participant_inclusions (
    event_id,
    LEAST(participant_1_id, participant_2_id),
    GREATEST(participant_1_id, participant_2_id)
  );

CREATE INDEX participant_inclusions_event_idx ON public.participant_inclusions (event_id);

ALTER TABLE public.participant_inclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read inclusions"
  ON public.participant_inclusions FOR SELECT
  USING (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can create inclusions"
  ON public.participant_inclusions FOR INSERT
  WITH CHECK (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete inclusions"
  ON public.participant_inclusions FOR DELETE
  USING (public.is_event_organizer(auth.uid(), event_id));
