-- Migration: admin_functions
-- SECURITY DEFINER functions for the admin panel.
-- Access is gated at application layer (isAdminEmail); DB layer verifies
-- the caller is a real authenticated user. No service-role key required.

-- ─── 1. admin_get_businesses ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_businesses(calling_user_id uuid)
RETURNS TABLE (
  id               bigint,
  name             text,
  slug             text,
  business_type    text,
  is_active        boolean,
  created_at       timestamptz,
  owner_id         uuid,
  owner_email      text,
  sub_id           bigint,
  sub_plan         text,
  sub_status       text,
  trial_ends_at    timestamptz,
  online_booking   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_email text;
BEGIN
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = calling_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  RETURN QUERY
  SELECT
    b.id, b.name, b.slug, b.business_type, b.is_active, b.created_at,
    b.owner_id,
    au.email        AS owner_email,
    s.id            AS sub_id,
    s.plan_name     AS sub_plan,
    s.status        AS sub_status,
    s.trial_ends_at,
    true            AS online_booking
  FROM public.businesses b
  LEFT JOIN public.subscriptions s ON s.business_id = b.id
  LEFT JOIN auth.users au          ON au.id = b.owner_id
  ORDER BY b.created_at DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_get_businesses TO authenticated;

-- ─── 2. admin_update_subscription ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  calling_user_id uuid,
  p_business_id   bigint,
  p_plan_name     text,
  p_status        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_email text; v_sub_id bigint;
BEGIN
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = calling_user_id;
  IF v_email IS NULL THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  IF p_plan_name NOT IN ('starter','pro','business') THEN RETURN jsonb_build_object('error','invalid_plan'); END IF;
  IF p_status    NOT IN ('active','canceled','past_due') THEN RETURN jsonb_build_object('error','invalid_status'); END IF;

  INSERT INTO public.subscriptions (business_id, plan_name, status)
  VALUES (p_business_id, p_plan_name, p_status)
  ON CONFLICT (business_id)
  DO UPDATE SET plan_name = EXCLUDED.plan_name, status = EXCLUDED.status
  RETURNING id INTO v_sub_id;

  RETURN jsonb_build_object('ok', true, 'sub_id', v_sub_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_update_subscription TO authenticated;
