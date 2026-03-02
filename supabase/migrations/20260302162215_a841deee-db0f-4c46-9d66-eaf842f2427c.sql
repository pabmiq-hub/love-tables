
-- Add logo_url column to organizers table
ALTER TABLE public.organizers ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for organizer logos
INSERT INTO storage.buckets (id, name, public) VALUES ('organizer-logos', 'organizer-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the storage bucket
CREATE POLICY "Organizers can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organizer-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Organizers can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organizer-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Organizers can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organizer-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view organizer logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organizer-logos');
