-- Add SMS/WhatsApp notification settings to business_settings
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_reminder_enabled           boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN business_settings.sms_notifications_enabled
  IS 'Send booking confirmation/cancellation SMS to customers';

COMMENT ON COLUMN business_settings.whatsapp_notifications_enabled
  IS 'Send WhatsApp messages via Twilio WhatsApp sandbox or approved number';

COMMENT ON COLUMN business_settings.sms_reminder_enabled
  IS 'Include SMS in the daily reminder cron job';
