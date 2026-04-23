-- Align whatsapp_settings columns with the application code
-- The schema uses is_enabled / fonnte_api_key / template_* but code expects enabled / fonnte_token / tpl_*

-- Add the columns the code expects
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS enabled             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS fonnte_token        TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_booking_confirmed TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_booking_reminder  TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_payment_receipt   TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_feedback_request  TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_points_earned     TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_kasbon_deducted   TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_barber_new_booking TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_barber_escalation  TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Copy existing data from old columns to new ones (if any data exists)
UPDATE whatsapp_settings SET
  enabled              = COALESCE(is_enabled, false),
  fonnte_token         = COALESCE(fonnte_api_key, fonnte_token),
  tpl_booking_confirmed = COALESCE(template_booking_confirmation, tpl_booking_confirmed),
  tpl_payment_receipt   = COALESCE(template_receipt, tpl_payment_receipt),
  tpl_booking_reminder  = COALESCE(template_late_customer_reminder, tpl_booking_reminder),
  tpl_barber_new_booking = COALESCE(template_barber_new_booking, tpl_barber_new_booking),
  tpl_barber_escalation  = COALESCE(template_barber_escalation, tpl_barber_escalation)
WHERE fonnte_token IS NULL AND fonnte_api_key IS NOT NULL;

-- Ensure at least one row exists
INSERT INTO whatsapp_settings (enabled) VALUES (false)
  ON CONFLICT DO NOTHING;
