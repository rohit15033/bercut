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

 -- ── Services (Images Removed) ─────────────────────────────────────────────
 INSERT INTO services (id, name, name_id, category, base_price, duration_minutes, badge, description, sort_order, image_url, mutex_group) VALUES
   ('30000000-0000-0000-0000-000000000001', 'Just a Haircut',           'Potong Rambut',            'haircut',    120000,  45, 'Popular',      'Classic haircut',               1,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000002', 'Skin Fade',               'Skin Fade',               'haircut',    140000,  50, NULL,   'Zero-skin fade, sharp taper',                 2,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000003', 'Hair Tattoo',             'Tato Rambut',             'haircut',    160000,  60, NULL,        'Artistic razor designs on the scalp',         3,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000004', 'Head Shaving',            'Cukur Kepala',            'haircut',    110000,  40, NULL,        'Full head clean shave',                       4,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000005', 'Kids Haircut',            'Potong Rambut Anak',      'haircut',     80000,  30, NULL,        'Gentle cut for children under 12',            5,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000006', 'Beard Trim',              'Cukur Jenggot',           'beard',       75000,  25, NULL,        'Shape and trim your beard to perfection',      6,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000007', 'Beard Shaving',           'Cukur Bersih Jenggot',    'beard',       85000,  30, NULL,        'Full beard shave with hot towel',              7,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000008', 'Nose Wax',                'Wax Hidung',               'treatment',   95000,  15, NULL,        'Quick and thorough nose hair removal',         8,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000009', 'Ear Wax',                 'Wax Telinga',             'treatment',   95000,  15, NULL,        'Clean and painless ear hair removal',          9,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000010', 'Ear Candle',              'Lilin Telinga',           'treatment',   75000,  20, NULL,        'Holistic ear cleaning with beeswax candle',  10,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000011', 'Black Mask',              'Masker Wajah',            'treatment',   85000,  20, 'HITS',      'Deep-pore cleansing black mask',             11,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000012', 'Nose Blackhead Remover',  'Pembersih Komedo Hidung', 'treatment',   85000,  20, NULL,        'Suction blackhead extraction',               12,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000013', 'Face Scrub',              'Scrub Wajah',             'treatment',   85000,  20, NULL,        'Exfoliating facial scrub',                   13,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000014', 'Creambath',               'Creambath',               'treatment',   95000,  25, NULL,        'Scalp massage with nourishing cream',        14,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000015', 'Hair Coloring',           'Pewarnaan Rambut',        'hair_color', 350000,  90, NULL,        'Full hair color change (includes toner)',     15,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000016', 'Hair Bleach',             'Bleaching Rambut',        'hair_color', 260000,  90, NULL,        'Lightening with 1-3 bleach steps',           16,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000017', 'Hair Highlight',          'Highlight Rambut',        'hair_color', 400000, 100, NULL,        'Partial color for dimension',                17,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000018', 'Beard Color',             'Warna Jenggot',           'hair_color', 150000,  40, NULL,        'Beard coloring and styling',                 18,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000019', 'Mask Cut Package',        'Paket Mask Cut',          'package',    195000,  65, 'HEMAT',     'Fade & Style + Black Mask',                  19,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000020', 'Prestige Package',        'Paket Prestige',          'package',    220000,  75, 'POPULER',   'Fade & Style + Beard Trim + Wash',           20,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000021', 'Luxury Package',          'Paket Luxury',            'package',    560000, 130, 'BEST VALUE','Fade + Mask + Nose Wax + Ear + Creambath',   21,  NULL,  NULL),
   ('30000000-0000-0000-0000-000000000022', 'President Package',       'Paket President',         'package',    640000, 155, 'VIP',        'Full luxury treatment + Beard',               22,  NULL,  NULL)
 ON CONFLICT DO NOTHING;

 -- ── Expense Categories ───────────────────────────────────────────────────
 INSERT INTO expense_categories (key, label, color, bg, sort_order) VALUES
   ('other',      'Other',      '#616a6b', '#f2f3f4', 1)
 ON CONFLICT (key) DO NOTHING;

 -- ── Feedback Tags ────────────────────────────────────────────────────────
 INSERT INTO feedback_tags (label, context, sort_order) VALUES
   ('Great haircut!',       'good',    1), ('Love the style',       'good',    2),
   ('Friendly barber',      'good',    3), ('Clean & comfortable',  'good',    4),
   ('Great value',          'good',    5), ('Could be tidier',      'bad',     1),
   ('Waited too long',      'bad',     2), ('Not my style',         'bad',     3),
   ('Just okay',            'neutral', 1), ('Would try again',      'neutral', 2)
 ON CONFLICT DO NOTHING;