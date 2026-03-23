-- Migration: appointments_reminder_sent_at
-- Adds reminder_sent_at to appointments for idempotent reminder tracking.
-- Also adds customer_email to store the email collected at booking time.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_email   text;

COMMENT ON COLUMN public.appointments.reminder_sent_at IS
  'Set when upcoming_reminder notification is sent. Prevents duplicate reminders.';

COMMENT ON COLUMN public.appointments.customer_email IS
  'Optional email collected at booking time for notifications.';
