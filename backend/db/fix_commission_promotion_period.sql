-- One-time data correction: double commission_rate for promotion period bookings.
-- During the 50%-off promotion, service prices were halved but barbers deserved
-- full commission — the effective rate was 2x the nominal rate.

-- Part 1: All completed bookings before May 13, 2026 (entire promotion period)
UPDATE booking_services bsv
SET commission_rate = bsv.commission_rate * 2
FROM bookings bk
WHERE bsv.booking_id = bk.id
  AND bk.status = 'completed'
  AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') < '2026-05-13';

-- Part 2: Creambath (service id 30000000-0000-0000-0000-000000000014) on May 13+
-- where price was never updated from discounted ~47,500 to full 95,000.
-- Barbers still deserve full commission on those rows.
UPDATE booking_services bsv
SET commission_rate = bsv.commission_rate * 2
FROM bookings bk
WHERE bsv.booking_id = bk.id
  AND bk.status = 'completed'
  AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= '2026-05-13'
  AND bsv.service_id = '30000000-0000-0000-0000-000000000014'
  AND bsv.price_charged <= 50000;
