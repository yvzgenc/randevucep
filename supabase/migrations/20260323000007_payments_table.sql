-- Migration: payments_table
-- Stores payment attempts and their outcomes.
-- Subscription updates happen ONLY via verified payment callbacks,
-- never directly from client code.

CREATE TABLE IF NOT EXISTS public.payments (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id              bigint NOT NULL
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider                 text   NOT NULL DEFAULT 'iyzico',
  -- Provider's unique payment identifier (used for idempotency)
  provider_payment_id      text,
  -- Provider's conversation / session reference
  provider_conversation_id text,
  plan_name                text   NOT NULL,
  amount                   numeric(10,2) NOT NULL,
  currency                 text   NOT NULL DEFAULT 'TRY',
  -- pending | success | failed | canceled
  status                   text   NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','canceled')),
  -- Full raw payload from provider for audit / debugging
  payload_json             jsonb,
  paid_at                  timestamptz,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL
);

-- Unique index: one row per provider payment id (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_unique
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- RLS: owners can read their own payment history; no client writes
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_owner_read ON public.payments
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
