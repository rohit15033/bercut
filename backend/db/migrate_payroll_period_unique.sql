-- Prevent duplicate periods for the same branch + date range
ALTER TABLE payroll_periods
  ADD CONSTRAINT payroll_periods_branch_from_to_unique
    UNIQUE (branch_id, period_from, period_to);
