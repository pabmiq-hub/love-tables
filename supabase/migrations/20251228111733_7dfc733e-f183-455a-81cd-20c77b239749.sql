-- Add completed_rounds to track which rounds have been completed
ALTER TABLE events ADD COLUMN completed_rounds integer[] DEFAULT '{}';