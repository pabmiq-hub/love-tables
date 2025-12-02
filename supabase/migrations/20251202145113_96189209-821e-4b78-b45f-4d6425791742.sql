-- Create function to increment participant count
CREATE OR REPLACE FUNCTION public.increment_participants(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET participants_count = participants_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;