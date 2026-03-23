-- Migration: subscription_trial
-- Adds trial_ends_at to subscriptions and backfills existing rows.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

UPDATE public.subscriptions
SET trial_ends_at = started_at + INTERVAL '14 days'
WHERE trial_ends_at IS NULL
  AND status = 'active'
  AND ends_at IS NULL;

-- One active subscription per business
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_business_id_unique
  ON public.subscriptions (business_id);
