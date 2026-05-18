-- Add shift_start_time to global_settings so attendance and payroll share one source of truth.
ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS shift_start_time TIME NOT NULL DEFAULT '10:00';
