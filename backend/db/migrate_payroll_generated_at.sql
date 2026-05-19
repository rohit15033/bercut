ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

-- backfill from created_at for existing rows
UPDATE payroll_periods SET generated_at = created_at WHERE generated_at IS NULL;
