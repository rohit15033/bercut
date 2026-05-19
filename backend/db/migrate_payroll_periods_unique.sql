-- Add unique constraint on payroll_periods to prevent duplicate generation
-- Uses COALESCE approach for compatibility with PostgreSQL < 15
CREATE UNIQUE INDEX IF NOT EXISTS payroll_periods_branch_from_to_key
  ON payroll_periods (COALESCE(branch_id::text, ''), period_from, period_to);
