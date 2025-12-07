-- Add rotation_mode column to events table
ALTER TABLE public.events 
ADD COLUMN rotation_mode text NOT NULL DEFAULT 'fixed_host';

-- Add comment explaining the values
COMMENT ON COLUMN public.events.rotation_mode IS 'Table rotation mode: fixed_host (one stays) or all_rotate (everyone moves)';