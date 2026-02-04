-- Fase 1: Sistema de códigos de verificación y cuotas

-- 1.1 Modificar tabla participants - añadir columnas de verificación
ALTER TABLE public.participants 
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS is_returning_participant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_email_sent_at TIMESTAMPTZ;

-- Crear índice único para búsqueda por código de verificación
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_verification_code 
  ON public.participants(verification_code) 
  WHERE verification_code IS NOT NULL;

-- 1.2 Modificar tabla events - añadir configuración de cuotas
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_requirements_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS slot_quotas JSONB DEFAULT '[]'::jsonb;

-- Comentario explicativo del formato de slot_quotas:
-- [
--   { "gender": "Hombre", "ageRange": "25-32", "maxSlots": 10 },
--   { "gender": "Mujer", "ageRange": "25-32", "maxSlots": 10 }
-- ]