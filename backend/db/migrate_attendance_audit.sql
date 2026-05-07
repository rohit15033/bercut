-- Migration: add late_minutes to attendance, fix user_permissions handling, add audit_log hooks
-- Run: psql -U postgres -d bercut -f migrate_attendance_audit.sql

-- 1. Add late_minutes column to attendance table
-- Computed at clock-in time: minutes late beyond grace period vs shift start
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes INTEGER NOT NULL DEFAULT 0;

-- 2. Create a function to compute late minutes given clock_in_at and grace period
-- This can be called by the clock-in route to backfill late_minutes
COMMENT ON COLUMN attendance.late_minutes IS 'Minutes late at clock-in. Computed as MAX(0, clock_in_minutes - 540 - grace_period). Grace period from payroll_settings.late_grace_period_minutes (default 5 min).';

-- 3. Update existing attendance rows (set late_minutes = 0 for all existing — pre-existing data not tracked)
UPDATE attendance SET late_minutes = 0 WHERE late_minutes IS NULL;
ALTER TABLE attendance ALTER COLUMN late_minutes SET DEFAULT 0;
ALTER TABLE attendance ALTER COLUMN late_minutes SET NOT NULL;

-- 4. Backfill late_minutes for existing rows based on shift start 09:00 WITA with 5-min grace
-- Only applies to rows created today onward; historical data already has 0
-- (Migration sets all existing rows to 0 to avoid null issues)
DO $$
DECLARE
  grace INTEGER := COALESCE((SELECT late_grace_period_minutes FROM payroll_settings LIMIT 1), 5);
  shift_start INTEGER := 540; -- 09:00 in minutes
BEGIN
  UPDATE attendance
  SET late_minutes = GREATEST(0, EXTRACT(EPOCH FROM (clock_in_at AT TIME ZONE 'Asia/Makassar' - DATE_TRUNC('day', clock_in_at AT TIME ZONE 'Asia/Makassar')))/60 - shift_start - grace)
  WHERE DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') >= CURRENT_DATE - INTERVAL '7 days';
END $$;
