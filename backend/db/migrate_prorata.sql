ALTER TABLE barbers
  ADD COLUMN IF NOT EXISTS off_deduction_type VARCHAR(10) NOT NULL DEFAULT 'flat'
    CHECK (off_deduction_type IN ('flat', 'prorata'));
