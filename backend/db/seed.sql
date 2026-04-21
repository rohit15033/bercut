-- Bercut Barber Shop — Seed Data
-- Realistic Bali-based data for development/staging.
-- Run after schema.sql: psql -U postgres -d bercut -f seed.sql

-- ── Global Settings ───────────────────────────────────────────────────────
INSERT INTO global_settings (points_earn_rate, points_redemption_rate, points_expiry_months, points_expiry_warning_days)
VALUES (0.0001, 10000, 12, 30) ON CONFLICT DO NOTHING;

-- ── Payroll Settings ──────────────────────────────────────────────────────
INSERT INTO payroll_settings (late_deduction_per_minute, late_grace_period_minutes, inexcused_off_flat_deduction, excused_off_flat_deduction, off_quota_per_month, ot_commission_enabled, ot_threshold_time, ot_bonus_pct)
VALUES (2000, 5, 150000, 150000, 4, false, '19:00', 5.00) ON CONFLICT DO NOTHING;

-- ── WhatsApp Settings ────────────────────────────────────────────────────
INSERT INTO whatsapp_settings (provider, is_enabled, template_booking_confirmation, template_barber_new_booking, template_barber_escalation, template_late_customer_reminder, template_client_not_arrived)
VALUES ('fonnte', false,
  'Hi {customer_name}! Booking at Bercut {branch} confirmed. #{booking_number}, {service}, {time}.',
  'Reservasi baru! {customer_name} - {service} jam {time}. Booking #{booking_number}.',
  '[ESKALASI] {customer_name} menunggu. Booking #{booking_number}. Segera mulai layanan.',
  'Hi {customer_name}, barber {barber_name} siap. Silakan ke kursi {chair} di Bercut {branch}.',
  'Dari {barber_name}: {customer_name} (#{booking_number}) belum datang. Queue #{queue_position} di {branch}.'
) ON CONFLICT DO NOTHING;

-- ── Owner User ────────────────────────────────────────────────────────────
-- IMPORTANT: Replace password_hash before production deploy
INSERT INTO users (id, email, password_hash, name, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner@bercut.id',
  '$2b$10$REPLACE_THIS_HASH_BEFORE_PRODUCTION_DEPLOY', 'Raynand Bercut', 'owner', true)
ON CONFLICT (email) DO NOTHING;

-- ── Branches ─────────────────────────────────────────────────────────────
INSERT INTO branches (id, name, address, city, timezone, is_head_office, online_booking_slug) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Head Office',     'Jl. Sunset Road No. 1, Seminyak', 'Seminyak', 'Asia/Makassar', true,  NULL),
  ('10000000-0000-0000-0000-000000000002', 'Bercut Seminyak', 'Jl. Oberoi No. 88, Seminyak',     'Seminyak', 'Asia/Makassar', false, 'seminyak'),
  ('10000000-0000-0000-0000-000000000003', 'Bercut Kuta',     'Jl. Legian No. 55, Kuta',         'Kuta',     'Asia/Makassar', false, 'kuta'),
  ('10000000-0000-0000-0000-000000000004', 'Bercut Ubud',     'Jl. Monkey Forest No. 12, Ubud',  'Ubud',     'Asia/Makassar', false, 'ubud')
ON CONFLICT DO NOTHING;

-- ── Barbers — Seminyak ───────────────────────────────────────────────────
INSERT INTO barbers (id, branch_id, name, specialty, specialty_id, phone, pin_hash, commission_rate, base_salary, pay_type, avatar_url, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Guntur', 'Fade Specialist',   'Spesialis Fade',    '+6281234567801', '$2b$10$ph', 40, 3500000, 'salary_plus_commission', '/assets/barber-guntur.jpg', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Adi',   'Hair Color Expert', 'Ahli Warna Rambut', '+6281234567802', '$2b$10$ph', 40, 3500000, 'salary_plus_commission', '/assets/barber-adi.jpg',    2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Reza',  'Beard Stylist',     'Stylist Jenggot',   '+6281234567803', '$2b$10$ph', 40, 3000000, 'salary_plus_commission', '/assets/barber-reza.jpg',   3),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Dion',  'Classic Cuts',      'Potongan Klasik',   '+6281234567804', '$2b$10$ph', 40, 3000000, 'salary_plus_commission', '/assets/barber-dion.jpg',   4),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Bagas', 'Fade Specialist',   'Spesialis Fade',    '+6281234567805', '$2b$10$ph', 40, 3000000, 'salary_plus_commission', '/assets/barber-bagas.jpg',  1)
ON CONFLICT DO NOTHING;

-- ── Services ─────────────────────────────────────────────────────────────
INSERT INTO services (id, name, name_id, category, base_price, duration_minutes, badge, description, sort_order, image_url, mutex_group) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Fade & Style',           'Fade & Style',            'haircut',    120000,  45, NULL,        'Precision fade with your preferred style',    1,  '/assets/haircut.png',              NULL),
  ('30000000-0000-0000-0000-000000000002', 'Skin Fade',              'Skin Fade',               'haircut',    140000,  50, 'POPULER',   'Zero-skin fade, sharp taper',                 2,  '/assets/skinfade.png',             NULL),
  ('30000000-0000-0000-0000-000000000003', 'Hair Tattoo',            'Tato Rambut',             'haircut',    160000,  60, NULL,        'Artistic razor designs on the scalp',         3,  '/assets/hairtattoo.png',           NULL),
  ('30000000-0000-0000-0000-000000000004', 'Head Shaving',           'Cukur Kepala',            'haircut',    110000,  40, NULL,        'Full head clean shave',                       4,  '/assets/headshaving.png',          NULL),
  ('30000000-0000-0000-0000-000000000005', 'Kids Haircut',           'Potong Rambut Anak',      'haircut',     80000,  30, NULL,        'Gentle cut for children under 12',            5,  '/assets/kidshaircut.png',          NULL),
  ('30000000-0000-0000-0000-000000000006', 'Beard Trim',             'Cukur Jenggot',           'beard',       75000,  25, NULL,        'Shape and trim your beard to perfection',      6,  NULL,                               'beard_service'),
  ('30000000-0000-0000-0000-000000000007', 'Beard Shaving',          'Cukur Bersih Jenggot',    'beard',       85000,  30, NULL,        'Full beard shave with hot towel',              7,  NULL,                               'beard_service'),
  ('30000000-0000-0000-0000-000000000008', 'Nose Wax',               'Wax Hidung',              'treatment',   95000,  15, NULL,        'Quick and thorough nose hair removal',         8,  '/assets/nosewax.png',              NULL),
  ('30000000-0000-0000-0000-000000000009', 'Ear Wax',                'Wax Telinga',             'treatment',   95000,  15, NULL,        'Clean and painless ear hair removal',          9,  '/assets/earwax.png',               'ear_treatment'),
  ('30000000-0000-0000-0000-000000000010', 'Ear Candle',             'Lilin Telinga',           'treatment',   75000,  20, NULL,        'Holistic ear cleaning with beeswax candle',  10,  '/assets/earcandle.png',            'ear_treatment'),
  ('30000000-0000-0000-0000-000000000011', 'Black Mask',             'Masker Wajah',            'treatment',   85000,  20, 'HITS',      'Deep-pore cleansing black mask',             11,  '/assets/blackmask.png',            NULL),
  ('30000000-0000-0000-0000-000000000012', 'Nose Blackhead Remover', 'Pembersih Komedo Hidung', 'treatment',   85000,  20, NULL,        'Suction blackhead extraction',               12,  '/assets/noseblackheadremover.png', NULL),
  ('30000000-0000-0000-0000-000000000013', 'Face Scrub',             'Scrub Wajah',             'treatment',   85000,  20, NULL,        'Exfoliating facial scrub',                   13,  '/assets/facescrub.png',            NULL),
  ('30000000-0000-0000-0000-000000000014', 'Creambath',              'Creambath',               'treatment',   95000,  25, NULL,        'Scalp massage with nourishing cream',        14,  '/assets/creambath.png',            NULL),
  ('30000000-0000-0000-0000-000000000015', 'Hair Coloring',          'Pewarnaan Rambut',        'hair_color', 350000,  90, NULL,        'Full hair color change (includes toner)',     15,  '/assets/haircoloring.png',         NULL),
  ('30000000-0000-0000-0000-000000000016', 'Hair Bleach',            'Bleaching Rambut',        'hair_color', 260000,  90, NULL,        'Lightening with 1-3 bleach steps',           16,  '/assets/Hairbleach.png',           NULL),
  ('30000000-0000-0000-0000-000000000017', 'Hair Highlight',         'Highlight Rambut',        'hair_color', 400000, 100, NULL,        'Partial color for dimension',                17,  '/assets/hairhighlight.png',        NULL),
  ('30000000-0000-0000-0000-000000000018', 'Beard Color',            'Warna Jenggot',           'hair_color', 150000,  40, NULL,        'Beard coloring and styling',                 18,  '/assets/beardcolor.png',           NULL),
  ('30000000-0000-0000-0000-000000000019', 'Mask Cut Package',       'Paket Mask Cut',          'package',    195000,  65, 'HEMAT',     'Fade & Style + Black Mask',                  19,  NULL,                               NULL),
  ('30000000-0000-0000-0000-000000000020', 'Prestige Package',       'Paket Prestige',          'package',    220000,  75, 'POPULER',   'Fade & Style + Beard Trim + Wash',           20,  NULL,                               NULL),
  ('30000000-0000-0000-0000-000000000021', 'Luxury Package',         'Paket Luxury',            'package',    560000, 130, 'BEST VALUE','Fade + Mask + Nose Wax + Ear + Creambath',   21,  NULL,                               NULL),
  ('30000000-0000-0000-0000-000000000022', 'President Package',      'Paket President',         'package',    640000, 155, 'VIP',       'Full luxury treatment + Beard',              22,  NULL,                               NULL)
ON CONFLICT DO NOTHING;

-- ── Expense Categories ───────────────────────────────────────────────────
INSERT INTO expense_categories (key, label, color, bg, sort_order) VALUES
  ('petty_cash', 'Petty Cash', '#111110', '#F2F0EB', 1),
  ('supplies',   'Supplies',   '#1a5276', '#d6eaf8', 2),
  ('utilities',  'Utilities',  '#145a32', '#d5f5e3', 3),
  ('equipment',  'Equipment',  '#6e2f8e', '#e8daef', 4),
  ('marketing',  'Marketing',  '#7d6608', '#fef9e7', 5),
  ('other',      'Other',      '#616a6b', '#f2f3f4', 6)
ON CONFLICT (key) DO NOTHING;

-- ── Inventory Items ───────────────────────────────────────────────────────
INSERT INTO inventory_items (id, name, unit, category) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Mineral Water 600ml', 'botol',  'beverage'),
  ('40000000-0000-0000-0000-000000000002', 'Teh Botol Sosro',     'botol',  'beverage'),
  ('40000000-0000-0000-0000-000000000003', 'Kopi Tubruk',         'gelas',  'beverage'),
  ('40000000-0000-0000-0000-000000000004', 'Pomade Medium Hold',  'pcs',    'product'),
  ('40000000-0000-0000-0000-000000000005', 'Hair Spray',          'botol',  'product'),
  ('40000000-0000-0000-0000-000000000006', 'Beard Oil 30ml',      'botol',  'product'),
  ('40000000-0000-0000-0000-000000000007', 'Neck Paper',          'pcs',    'service_consumable'),
  ('40000000-0000-0000-0000-000000000008', 'Razor Blade',         'pcs',    'service_consumable'),
  ('40000000-0000-0000-0000-000000000009', 'Black Mask Pack',     'pcs',    'service_consumable'),
  ('40000000-0000-0000-0000-000000000010', 'Wax Strip',           'pcs',    'service_consumable'),
  ('40000000-0000-0000-0000-000000000011', 'Ear Candle Unit',     'pcs',    'service_consumable'),
  ('40000000-0000-0000-0000-000000000012', 'Creambath Sachet',    'pcs',    'service_consumable')
ON CONFLICT DO NOTHING;

-- ── Inventory Stock — Seminyak ────────────────────────────────────────────
INSERT INTO inventory_stock (item_id, branch_id, current_stock, reorder_threshold, price, kiosk_visible) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 48, 10, 8000,   true),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 36, 10, 8000,   true),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 20, 10, 12000,  true),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 15,  5, 85000,  true),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',  8,  5, 55000,  true),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 12,  5, 120000, true),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 200, 50, NULL,  false),
  ('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 100, 20, NULL,  false),
  ('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002',  25,  5, NULL,  false),
  ('40000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002',  50, 10, NULL,  false),
  ('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002',  30,  5, NULL,  false),
  ('40000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002',  20,  5, NULL,  false)
ON CONFLICT DO NOTHING;

-- ── Chairs — Seminyak ────────────────────────────────────────────────────
INSERT INTO chairs (id, branch_id, label, barber_id, sort_order) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Chair 1', '20000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Chair 2', '20000000-0000-0000-0000-000000000002', 2),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Chair 3', '20000000-0000-0000-0000-000000000003', 3),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Chair 4', '20000000-0000-0000-0000-000000000004', 4)
ON CONFLICT DO NOTHING;

-- ── Feedback Tags ────────────────────────────────────────────────────────
INSERT INTO feedback_tags (label, context, sort_order) VALUES
  ('Great haircut!',       'good',    1), ('Love the style',       'good',    2),
  ('Friendly barber',      'good',    3), ('Clean & comfortable',  'good',    4),
  ('Great value',          'good',    5), ('Could be tidier',      'bad',     1),
  ('Waited too long',      'bad',     2), ('Not my style',         'bad',     3),
  ('Just okay',            'neutral', 1), ('Would try again',      'neutral', 2)
ON CONFLICT DO NOTHING;

-- ── Kiosk Settings — Seminyak ────────────────────────────────────────────
INSERT INTO kiosk_settings (branch_id, welcome_cta, welcome_cta_id, welcome_subtitle, welcome_subtitle_id, upsell_enabled, session_timeout_secs)
VALUES ('10000000-0000-0000-0000-000000000002',
  'Book Now', 'Pesan Sekarang',
  'No. 1 Barber in The Island of Paradise', 'Barber Terbaik di Pulau Dewata',
  true, 60)
ON CONFLICT DO NOTHING;

-- ── Demo Kiosk Token ─────────────────────────────────────────────────────
INSERT INTO kiosk_tokens (branch_id, token_hash, device_name, is_active, created_by)
VALUES ('10000000-0000-0000-0000-000000000002',
  encode(sha256('BERCUT-DEMO-0001'::bytea), 'hex'),
  'Dev Kiosk', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
