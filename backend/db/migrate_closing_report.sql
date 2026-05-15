-- Add closing report config to whatsapp_settings
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS closing_time TIME NOT NULL DEFAULT '21:00';
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS closing_report_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS closing_group_1 TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS closing_group_2 TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_closing_report TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS monitoring_report_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS monitoring_group_1 TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS monitoring_group_2 TEXT;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS tpl_monitoring_report TEXT;

-- Track per-branch whether today's report was already sent
ALTER TABLE branches ADD COLUMN IF NOT EXISTS closing_report_sent_date DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS monitoring_report_sent_date DATE;
