
-- Allow authenticated users to upload files to organizer-logos bucket
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organizer-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organizer-logos');

-- Allow public read access to organizer logos
CREATE POLICY "Public read access to organizer logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organizer-logos');
