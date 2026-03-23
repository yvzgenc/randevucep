-- Migration: admin_security_fix
--
-- Creates admin_users allowlist table and two SECURITY DEFINER RPC
-- functions for the super-admin panel. Both functions check the caller's
-- JWT email against admin_users before returning any data.
--
-- Security model (dual-layer):
--   App layer: isAdminEmail() checks ADMIN_EMAILS env var before page render.
--   DB layer:  function body checks admin_users table via auth.jwt() ->> 'email'.
--
-- NOTE: No admin emails are seeded here intentionally.
-- To add an admin, run manually in Supabase SQL editor or psql:
--   INSERT INTO public.admin_users (email) VALUES ('you@example.com');
-- See: supabase/seeds/admin_users.sql for a template.

-- ── Admin allowlist table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  email      text PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- No RLS policies → only SECURITY DEFINER functions and service-role can read
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ── admin_list_businesses ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_list_businesses();

CREATE FUNCTION public.admin_list_businesses()
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
  is_active       boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  -- DB-level guard: caller must be in admin_users
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = v_email) THEN
    RETURN; -- silently return empty set — no information leak
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.business_type,
    b.slug,
    b.city,
    b.created_at,
    u.email     AS owner_email,
    s.plan_name,
    s.status    AS sub_status,
    s.trial_ends_at,
    b.is_active
  FROM businesses b
  LEFT JOIN users u ON u.business_id = b.id AND u.role = 'owner'
  LEFT JOIN subscriptions s ON s.business_id = b.id
  WHERE b.onboarding_completed = true
  ORDER BY b.created_at DESC;
END;
$$;

-- ── admin_get_business ────────────────────────────────────────────────────────
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = v_email) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.business_type,
    b.slug,
    b.city,
    b.phone,
    b.is_active,
    b.created_at,
    u.email      AS owner_email,
    b.owner_id,
    s.plan_name,
    s.id         AS sub_id,
    s.status     AS sub_status,
    s.trial_ends_at,
    s.billing_period,
    s.ends_at
  FROM businesses b
  LEFT JOIN users u ON u.business_id = b.id AND u.role = 'owner'
  LEFT JOIN subscriptions s ON s.business_id = b.id
  WHERE b.id = p_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_businesses()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_business(bigint) TO authenticated;
