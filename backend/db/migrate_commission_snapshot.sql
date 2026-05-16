-- Snapshot commission rate on booking_services so historical reports are immutable.
-- Backfill uses current barber_services / branch_services / barbers rate (best available).

ALTER TABLE booking_services
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);

-- Backfill existing rows
UPDATE booking_services bsv
SET commission_rate = COALESCE(
  (SELECT bs_barber.commission_rate
   FROM barber_services bs_barber
   JOIN bookings bk ON bk.id = bsv.booking_id
   WHERE bs_barber.barber_id = bk.barber_id AND bs_barber.service_id = bsv.service_id
   LIMIT 1),
  (SELECT bs_branch.commission_rate
   FROM branch_services bs_branch
   JOIN bookings bk ON bk.id = bsv.booking_id
   WHERE bs_branch.service_id = bsv.service_id AND bs_branch.branch_id = bk.branch_id
   LIMIT 1),
  (SELECT b.commission_rate
   FROM barbers b
   JOIN bookings bk ON bk.id = bsv.booking_id
   WHERE b.id = bk.barber_id
   LIMIT 1)
)
WHERE commission_rate IS NULL;
