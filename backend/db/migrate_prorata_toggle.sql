-- Move pro-rata off deduction setting from barber profile to payroll entry
ALTER TABLE payroll_entries
  ADD COLUMN IF NOT EXISTS off_use_prorata BOOLEAN NOT NULL DEFAULT false;
