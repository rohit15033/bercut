-- Snapshot OT-adjusted commission into booking_services at payment time.
-- Adds commission_amount, commission_rate_applied, is_ot_service columns.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS and filters backfill with WHERE commission_amount IS NULL.

ALTER TABLE booking_services
  ADD COLUMN IF NOT EXISTS commission_amount       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate_applied NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_ot_service           BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing completed bookings using base commission_rate already stored.
-- is_ot_service stays false for backfill (historical OT threshold is unrecoverable).
-- commission_rate_applied = commission_rate (base rate snapshotted by previous migration).
-- commission_amount = ROUND(price_charged * commission_rate / 100).
UPDATE booking_services bsv
SET
  commission_rate_applied = bsv.commission_rate,
  commission_amount       = ROUND(bsv.price_charged * bsv.commission_rate / 100),
  is_ot_service           = false
FROM bookings bk
WHERE bk.id = bsv.booking_id
  AND bk.status = 'completed'
  AND bsv.commission_amount IS NULL
  AND bsv.commission_rate IS NOT NULL;
