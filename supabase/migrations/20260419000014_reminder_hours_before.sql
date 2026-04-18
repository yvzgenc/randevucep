ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer NOT NULL DEFAULT 24;

COMMENT ON COLUMN business_settings.reminder_hours_before
  IS 'Hours before appointment to send reminder. Supported: 2, 4, 12, 24, 48';
