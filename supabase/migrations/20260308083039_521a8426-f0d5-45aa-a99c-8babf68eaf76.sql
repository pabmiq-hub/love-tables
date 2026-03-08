
-- Add slug column to organizers
ALTER TABLE public.organizers ADD COLUMN slug text UNIQUE;

-- Create function to generate slug from company_name
CREATE OR REPLACE FUNCTION public.generate_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(trim(input));
  result := translate(result, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiioooooouuuunc');
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '[\s]+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Backfill existing organizers with slugs
UPDATE public.organizers 
SET slug = generate_slug(COALESCE(company_name, contact_email))
WHERE slug IS NULL;

-- Handle duplicates by appending a suffix
DO $$
DECLARE
  rec RECORD;
  counter INT;
  new_slug TEXT;
BEGIN
  FOR rec IN 
    SELECT id, slug FROM organizers 
    WHERE slug IN (SELECT slug FROM organizers GROUP BY slug HAVING COUNT(*) > 1)
    ORDER BY created_at
  LOOP
    counter := (SELECT COUNT(*) FROM organizers WHERE slug LIKE rec.slug || '%' AND id != rec.id AND created_at < (SELECT created_at FROM organizers WHERE id = rec.id));
    IF counter > 0 THEN
      new_slug := rec.slug || '-' || counter;
      UPDATE organizers SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Now make it NOT NULL
ALTER TABLE public.organizers ALTER COLUMN slug SET NOT NULL;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.auto_generate_organizer_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_slug(COALESCE(NEW.company_name, NEW.contact_email));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM organizers WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_organizer_slug
  BEFORE INSERT OR UPDATE ON public.organizers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_organizer_slug();

-- Allow anon to look up organizer by slug for participant pages
CREATE POLICY "Anon can read organizer by slug"
  ON public.organizers
  FOR SELECT
  TO anon
  USING (true);
