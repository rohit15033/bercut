-- Essential Seed (Minimum data for production)
-- Run on VPS: psql -U bercut_user -d bercut -h 127.0.0.1 -f db/essential_seed.sql

-- 1. Global Settings (Loyalty points, etc.)
INSERT INTO global_settings (points_earn_rate, points_redemption_rate, points_expiry_months)
VALUES (0.0001, 10000, 12)
ON CONFLICT DO NOTHING;
-- 2. Payroll Settings
INSERT INTO payroll_settings (late_deduction_per_minute, late_grace_period_minutes, inexcused_off_flat_deduction)
VALUES (2000, 5, 150000)
ON CONFLICT DO NOTHING;

-- 4. Default Feedback Tags
INSERT INTO feedback_tags (label, context, sort_order) VALUES
('Friendly', 'good', 1),
('Clean', 'good', 2),
('Skillful', 'good', 3),
('Late', 'bad', 4),
('Untidy', 'bad', 5)
ON CONFLICT DO NOTHING;
