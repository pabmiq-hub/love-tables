
-- Fix search_path on generate_slug
CREATE OR REPLACE FUNCTION public.generate_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
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
