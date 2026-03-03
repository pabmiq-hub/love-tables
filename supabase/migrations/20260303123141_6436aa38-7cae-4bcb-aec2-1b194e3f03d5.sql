
-- Fix the phone uniqueness constraint to allow multiple NULL phones
ALTER TABLE global_participants DROP CONSTRAINT unique_organizer_phone;
ALTER TABLE global_participants ADD CONSTRAINT unique_organizer_phone UNIQUE NULLS DISTINCT (organizer_id, phone);
