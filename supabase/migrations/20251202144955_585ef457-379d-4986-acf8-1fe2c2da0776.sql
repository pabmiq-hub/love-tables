-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 3,
  table_size INTEGER NOT NULL DEFAULT 4,
  round_duration INTEGER NOT NULL DEFAULT 300,
  participants_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  tables JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  age_range TEXT,
  preferred_age_range TEXT,
  preference TEXT,
  dating_preference TEXT,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participant selections table (for match selections)
CREATE TABLE public.participant_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  selector_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  selected_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, selector_id, selected_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_selections ENABLE ROW LEVEL SECURITY;

-- Public read policies (events and participants need to be accessible via QR codes)
CREATE POLICY "Events are publicly readable" 
  ON public.events FOR SELECT USING (true);

CREATE POLICY "Participants are publicly readable" 
  ON public.participants FOR SELECT USING (true);

CREATE POLICY "Selections are publicly readable" 
  ON public.participant_selections FOR SELECT USING (true);

-- Public insert policies (participants can join events and make selections)
CREATE POLICY "Anyone can create events" 
  ON public.events FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update events" 
  ON public.events FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete events" 
  ON public.events FOR DELETE USING (true);

CREATE POLICY "Anyone can add participants" 
  ON public.participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update participants" 
  ON public.participants FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete participants" 
  ON public.participants FOR DELETE USING (true);

CREATE POLICY "Anyone can add selections" 
  ON public.participant_selections FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_participants_event_id ON public.participants(event_id);
CREATE INDEX idx_selections_event_id ON public.participant_selections(event_id);
CREATE INDEX idx_selections_selector_id ON public.participant_selections(selector_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();