-- Idempotent: adds ot_excluded_service_ids column to payroll_settings if not already present
ALTER TABLE payroll_settings
  ADD COLUMN IF NOT EXISTS ot_excluded_service_ids UUID[] NOT NULL DEFAULT '{}';
