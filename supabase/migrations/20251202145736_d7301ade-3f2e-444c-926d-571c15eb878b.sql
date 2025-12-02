-- 1. Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Add organizer_id to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id);

-- 4. Create function to check if user owns an event
CREATE OR REPLACE FUNCTION public.is_event_organizer(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = _event_id
      AND organizer_id = _user_id
  )
$$;

-- 5. Drop old permissive RLS policies on events
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.events;
DROP POLICY IF EXISTS "Anyone can update events" ON public.events;
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;

-- 6. Create secure RLS policies for events
CREATE POLICY "Events are publicly readable"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events"
ON public.events FOR UPDATE
TO authenticated
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events"
ON public.events FOR DELETE
TO authenticated
USING (auth.uid() = organizer_id);

-- 7. Drop old permissive RLS policies on participants
DROP POLICY IF EXISTS "Anyone can add participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can delete participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can update participants" ON public.participants;
DROP POLICY IF EXISTS "Participants are publicly readable" ON public.participants;

-- 8. Create secure RLS policies for participants
CREATE POLICY "Participants are readable for event access"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Participants can be added to events"
ON public.participants FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id)
);

CREATE POLICY "Organizers can update participants"
ON public.participants FOR UPDATE
TO authenticated
USING (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organizers can delete participants"
ON public.participants FOR DELETE
TO authenticated
USING (public.is_event_organizer(auth.uid(), event_id));

-- 9. Drop old permissive RLS policies on participant_selections
DROP POLICY IF EXISTS "Anyone can add selections" ON public.participant_selections;
DROP POLICY IF EXISTS "Selections are publicly readable" ON public.participant_selections;

-- 10. Create secure RLS policies for participant_selections
CREATE POLICY "Organizers can read selections"
ON public.participant_selections FOR SELECT
TO authenticated
USING (public.is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Participants can add selections"
ON public.participant_selections FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id)
);

-- 11. RLS policy for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 12. Auto-assign admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();