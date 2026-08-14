CREATE TABLE public.event_series (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_series TO authenticated;
GRANT ALL ON public.event_series TO service_role;

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their own series"
ON public.event_series FOR ALL TO authenticated
USING (organizer_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (organizer_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_event_series_updated_at
BEFORE UPDATE ON public.event_series
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.event_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_series_id ON public.events(series_id);

-- Resolve the shared series link to the current (not yet closed) event
CREATE OR REPLACE FUNCTION public.get_series_current_event(_slug text)
RETURNS TABLE (event_id uuid, series_name text, organizer_slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, s.name, o.slug
  FROM public.event_series s
  JOIN public.events e ON e.series_id = s.id
  LEFT JOIN public.organizers o ON o.user_id = e.organizer_id
  WHERE lower(s.slug) = lower(_slug)
    AND e.status IN ('pending', 'active')
    AND COALESCE(e.is_test_event, false) = false
  ORDER BY e.date ASC, e.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_series_current_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_series_current_event(text) TO anon, authenticated, service_role;