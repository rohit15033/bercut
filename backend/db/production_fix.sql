-- Production Fix Migration
-- Run this on VPS: psql -U bercut_user -d bercut -h 127.0.0.1 -f /var/www/bercut/backend/db/production_fix.sql

-- 1. Create missing package_services table
CREATE TABLE IF NOT EXISTS package_services (
  package_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, service_id)
);
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS or_group SMALLINT;

-- 2. Ensure barber_breaks has the right columns (renaming if old names exist)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barber_breaks' AND column_name='start_time') THEN
    ALTER TABLE barber_breaks RENAME COLUMN start_time TO started_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barber_breaks' AND column_name='end_time') THEN
    ALTER TABLE barber_breaks RENAME COLUMN end_time TO ended_at;
  END IF;
END $$;

-- 3. Add any other missing columns to barber_breaks
ALTER TABLE barber_breaks ADD COLUMN IF NOT EXISTS duration_minutes SMALLINT;
ALTER TABLE barber_breaks ADD COLUMN IF NOT EXISTS reason VARCHAR(30) DEFAULT 'lunch';

-- 4. Fix pgcrypto if missing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Add missing columns to services (for packages)
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS mutex_group VARCHAR(50);
