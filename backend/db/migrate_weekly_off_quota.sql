-- Rename off_quota_per_month → off_quota_per_week (default 1 = one free excused off per calendar week)
ALTER TABLE payroll_settings RENAME COLUMN off_quota_per_month TO off_quota_per_week;
ALTER TABLE payroll_settings ALTER COLUMN off_quota_per_week SET DEFAULT 1;
UPDATE payroll_settings SET off_quota_per_week = 1 WHERE off_quota_per_week = 4;
