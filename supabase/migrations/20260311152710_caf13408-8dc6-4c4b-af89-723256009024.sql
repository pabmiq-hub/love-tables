
ALTER TABLE events ADD COLUMN super_like_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE participant_selections ADD COLUMN is_super_like boolean NOT NULL DEFAULT false;
