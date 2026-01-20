
-- =============================================
-- FASE 1A: EXPAND ENUM ROLES
-- =============================================
-- This must be committed before using the new values
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'organizer';
