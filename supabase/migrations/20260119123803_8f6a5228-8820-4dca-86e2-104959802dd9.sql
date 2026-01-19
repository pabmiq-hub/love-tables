-- Create global_participants table to store unique participants per organizer
CREATE TABLE public.global_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  email TEXT,
  phone TEXT,
  display_name TEXT NOT NULL,
  events_attended INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_organizer_email UNIQUE NULLS NOT DISTINCT (organizer_id, email),
  CONSTRAINT unique_organizer_phone UNIQUE NULLS NOT DISTINCT (organizer_id, phone),
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Create participant_encounters table to track when participants meet at tables
CREATE TABLE public.participant_encounters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  global_participant_1_id UUID NOT NULL REFERENCES public.global_participants(id) ON DELETE CASCADE,
  global_participant_2_id UUID NOT NULL REFERENCES public.global_participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  table_number INTEGER NOT NULL,
  encountered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_participants CHECK (global_participant_1_id != global_participant_2_id),
  CONSTRAINT ordered_participant_ids CHECK (global_participant_1_id < global_participant_2_id)
);

-- Add global_participant_id to participants table
ALTER TABLE public.participants 
ADD COLUMN global_participant_id UUID REFERENCES public.global_participants(id) ON DELETE SET NULL;

-- Add avoid_previous_encounters option to events table
ALTER TABLE public.events
ADD COLUMN avoid_previous_encounters BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN avoid_encounters_mode TEXT NOT NULL DEFAULT 'preference';

-- Create indexes for performance
CREATE INDEX idx_global_participants_organizer ON public.global_participants(organizer_id);
CREATE INDEX idx_global_participants_email ON public.global_participants(organizer_id, email);
CREATE INDEX idx_global_participants_phone ON public.global_participants(organizer_id, phone);
CREATE INDEX idx_participant_encounters_participant1 ON public.participant_encounters(global_participant_1_id);
CREATE INDEX idx_participant_encounters_participant2 ON public.participant_encounters(global_participant_2_id);
CREATE INDEX idx_participant_encounters_event ON public.participant_encounters(event_id);
CREATE INDEX idx_participants_global ON public.participants(global_participant_id);

-- Enable RLS
ALTER TABLE public.global_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_encounters ENABLE ROW LEVEL SECURITY;

-- RLS policies for global_participants
CREATE POLICY "Organizers can read their global participants"
ON public.global_participants
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create global participants"
ON public.global_participants
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their global participants"
ON public.global_participants
FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their global participants"
ON public.global_participants
FOR DELETE
USING (auth.uid() = organizer_id);

-- RLS policies for participant_encounters
CREATE POLICY "Organizers can read their encounters"
ON public.participant_encounters
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create encounters"
ON public.participant_encounters
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their encounters"
ON public.participant_encounters
FOR DELETE
USING (auth.uid() = organizer_id);

-- Trigger for updated_at on global_participants
CREATE TRIGGER update_global_participants_updated_at
BEFORE UPDATE ON public.global_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();