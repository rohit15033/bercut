ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS performance_from date,
  ADD COLUMN IF NOT EXISTS performance_to   date,
  ADD COLUMN IF NOT EXISTS attendance_from  date,
  ADD COLUMN IF NOT EXISTS attendance_to    date;
