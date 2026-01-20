-- Add professional configuration column to events table
-- This stores B2B-specific settings for professional networking events
ALTER TABLE events ADD COLUMN IF NOT EXISTS professional_config JSONB;

-- The professional_config structure will be:
-- {
--   "rotation_type": "client_fixed" | "provider_fixed",
--   "sectors": ["Tecnología", "Finanzas", ...],
--   "predefined_needs": ["CRM", "ERP", ...],
--   "predefined_solutions": ["Software", "Consultoría", ...]
-- }

-- Add comment to document the column
COMMENT ON COLUMN events.professional_config IS 'Configuration for professional networking events: rotation_type, sectors, predefined_needs, predefined_solutions';