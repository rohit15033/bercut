ALTER TABLE chair_overrides
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chair_overrides_barber ON chair_overrides(barber_id);
