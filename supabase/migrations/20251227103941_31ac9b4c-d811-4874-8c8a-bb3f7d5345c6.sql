-- Add current_round column to events table for tracking round progress
ALTER TABLE events ADD COLUMN current_round integer DEFAULT 0;