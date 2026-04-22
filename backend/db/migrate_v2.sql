-- Migration to add commission_rate and other missing columns to production
-- Run this on your VPS: psql -U postgres -d bercut -f backend/db/migrate_v2.sql

-- Add commission_rate to barber_services if missing
ALTER TABLE barber_services ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);

-- Add commission_rate to branch_services if missing
ALTER TABLE branch_services ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);

-- Add added_mid_cut to booking_services if missing
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS added_mid_cut BOOLEAN NOT NULL DEFAULT false;

-- Ensure barbers has commission_rate (it should, but just in case)
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) NOT NULL DEFAULT 35.00;

-- Optional: If you haven't updated booking_services recently, you might need these too
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS paid_with_points BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS bleach_step SMALLINT;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS bleach_with_color BOOLEAN;

-- Add auto_cancel_minutes and escalation settings to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS auto_cancel_minutes SMALLINT NOT NULL DEFAULT 15;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS barber_escalation_interval_minutes SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS barber_escalation_max_count SMALLINT NOT NULL DEFAULT 5;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS speaker_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add escalation tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escalation_count SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escalation_stopped_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escalation_stopped_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escalation_stop_reason VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_not_arrived_at TIMESTAMPTZ;
