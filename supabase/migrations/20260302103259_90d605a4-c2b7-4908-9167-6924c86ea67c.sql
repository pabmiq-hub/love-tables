
-- Create organizer_email_connections table
CREATE TABLE public.organizer_email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail',
  email_address text NOT NULL,
  refresh_token text NOT NULL,
  access_token text,
  token_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organizer_id, provider)
);

-- Enable RLS
ALTER TABLE public.organizer_email_connections ENABLE ROW LEVEL SECURITY;

-- Organizers can read their own connections
CREATE POLICY "Organizers can read own email connections"
ON public.organizer_email_connections
FOR SELECT
TO authenticated
USING (
  organizer_id IN (
    SELECT id FROM public.organizers WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Organizers can delete their own connections
CREATE POLICY "Organizers can delete own email connections"
ON public.organizer_email_connections
FOR DELETE
TO authenticated
USING (
  organizer_id IN (
    SELECT id FROM public.organizers WHERE user_id = auth.uid()
  )
);

-- Only service role / edge functions insert/update (no direct client insert)
-- Super admin can manage all
CREATE POLICY "Super admin can manage email connections"
ON public.organizer_email_connections
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
