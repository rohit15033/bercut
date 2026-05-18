-- Prevent duplicate periods for the same branch + date range
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_branch_from_to_unique'
  ) THEN
    ALTER TABLE payroll_periods
      ADD CONSTRAINT payroll_periods_branch_from_to_unique
        UNIQUE (branch_id, period_from, period_to);
  END IF;
END $$;
