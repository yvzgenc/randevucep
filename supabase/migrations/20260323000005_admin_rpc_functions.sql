-- Migration: admin_rpc_functions
-- Creates SECURITY DEFINER RPC functions for the super-admin panel.
-- These bypass RLS intentionally; callers must verify admin access in app code.

CREATE OR REPLACE FUNCTION public.admin_list_businesses()
RETURNS TABLE (
  id              bigint,
  name            text,
  business_type   text,
  slug            text,
  city            text,
  created_at      timestamptz,
  owner_email     text,
  plan_name       text,
  sub_status      text,
  trial_ends_at   timestamptz,
  online_booking  boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.name,
    b.business_type,
    b.slug,
    b.city,
    b.created_at,
    u.email               AS owner_email,
    s.plan_name,
    s.status              AS sub_status,
    s.trial_ends_at,
    b.is_active           AS online_booking
  FROM businesses b
  LEFT JOIN users u
    ON u.business_id = b.id
   AND u.role = 'owner'
  LEFT JOIN subscriptions s
    ON s.business_id = b.id
  WHERE b.onboarding_completed = true
  ORDER BY b.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_business(p_id bigint)
RETURNS TABLE (
  id              bigint,
  name            text,
  business_type   text,
  slug            text,
  city            text,
  phone           text,
  is_active       boolean,
  created_at      timestamptz,
  owner_email     text,
  owner_id        text,
  plan_name       text,
  sub_id          bigint,
  sub_status      text,
  trial_ends_at   timestamptz,
  billing_period  text,
  ends_at         timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.name,
    b.business_type,
    b.slug,
    b.city,
    b.phone,
    b.is_active,
    b.created_at,
    u.email               AS owner_email,
    b.owner_id,
    s.plan_name,
    s.id                  AS sub_id,
    s.status              AS sub_status,
    s.trial_ends_at,
    s.billing_period,
    s.ends_at
  FROM businesses b
  LEFT JOIN users u
    ON u.business_id = b.id
   AND u.role = 'owner'
  LEFT JOIN subscriptions s
    ON s.business_id = b.id
  WHERE b.id = p_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_businesses()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_business(bigint) TO authenticated;
