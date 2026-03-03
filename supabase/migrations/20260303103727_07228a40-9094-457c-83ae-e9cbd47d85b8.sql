
-- Fix critical security: organizers should only see their own events
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;

-- Authenticated users (organizers) can only see their own events + super admins see all
CREATE POLICY "Organizers can read own events"
ON public.events
FOR SELECT
TO authenticated
USING (organizer_id = auth.uid() OR is_super_admin(auth.uid()));

-- Anonymous users can read events (needed for participant-facing pages)
CREATE POLICY "Anon can read events"
ON public.events
FOR SELECT
TO anon
USING (true);
