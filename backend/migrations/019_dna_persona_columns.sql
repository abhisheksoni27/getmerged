-- Migration 019: Persona columns on contributor_profiles.
-- Nullable; old rows stay valid. New columns support the public contributor
-- identity card (persona headline + stars pulled in).
ALTER TABLE contributor_profiles ADD COLUMN persona VARCHAR(64) NULL;
ALTER TABLE contributor_profiles ADD COLUMN stars_pulled_in INT NULL;
ALTER TABLE contributor_profiles ADD COLUMN updated_persona_at DATETIME NULL;
CREATE INDEX idx_contributor_profiles_persona ON contributor_profiles(persona);
