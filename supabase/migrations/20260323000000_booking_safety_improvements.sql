-- Migration: booking_safety_improvements
-- Applied: 2026-03-23
-- Purpose: Slot overlap protection, customer upsert safety, DB-level booking function

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add duration_minutes to appointments
--    Denormalized from services.duration_minutes at insert time.
--    Required for server-side overlap calculation.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Unique constraint on customers(business_id, phone)
--    Makes INSERT ... ON CONFLICT (business_id, phone) DO UPDATE safe.
--    Without this, the upsert would silently insert duplicates.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD CONSTRAINT customers_business_phone_unique UNIQUE (business_id, phone);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Partial unique index — prevents exact same slot being booked twice
--    for the same staff member.
--    Only applies to active statuses; cancelled/completed rows are ignored.
--    This is a last-resort guard; the function below does full overlap detection.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_exact_overlap
  ON public.appointments (staff_id, appointment_date, appointment_time)
  WHERE status IN ('Bekliyor', 'Onaylı', 'pending', 'confirmed');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Atomic booking function
--
--    Performs in a single transaction:
--      a) Full overlap check using real duration_minutes of both
--         the new and existing appointments
--      b) Customer upsert (safe because of constraint above)
--      c) Appointment insert
--
--    SECURITY DEFINER: runs as the function owner (postgres), bypassing RLS.
--    This is intentional — the function itself enforces all business rules,
--    so we don't need the caller to be authenticated.
--    anon and authenticated roles are explicitly granted EXECUTE.
--
--    Returns:
--      { "appointment_id": number, "customer_id": number }  on success
--      { "error": string }                                   on conflict / validation failure
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_business_id      bigint,
  p_service_id       bigint,
  p_service_name     text,
  p_service_duration integer,
  p_staff_id         bigint,
  p_staff_name       text,
  p_customer_name    text,
  p_customer_phone   text,
  p_date             date,
  p_time             text,   -- format: 'HH:MM'
  p_price            numeric,
  p_notes            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_start  integer;
  v_new_end    integer;
  v_conflict   integer;
  v_appt_id    bigint;
  v_cust_id    bigint;
BEGIN
  -- Convert HH:MM to minutes since midnight
  v_new_start := split_part(p_time, ':', 1)::integer * 60
               + split_part(p_time, ':', 2)::integer;
  v_new_end   := v_new_start + p_service_duration;

  -- ── Overlap check ──────────────────────────────────────────────────────────
  -- Checks all active appointments for this staff on this date.
  -- Uses actual duration_minutes stored on each appointment row,
  -- with a COALESCE fallback of 30 for any legacy rows inserted before
  -- this migration.
  SELECT COUNT(*) INTO v_conflict
  FROM public.appointments a
  WHERE a.staff_id         = p_staff_id
    AND a.appointment_date = p_date
    AND a.status IN ('Bekliyor', 'Onaylı', 'pending', 'confirmed')
    AND (
      -- Case A: existing appointment starts inside our new slot
      (
          split_part(a.appointment_time, ':', 1)::integer * 60
        + split_part(a.appointment_time, ':', 2)::integer
      ) < v_new_end
      AND
      -- Case B: existing appointment ends after our new slot starts
      (
          split_part(a.appointment_time, ':', 1)::integer * 60
        + split_part(a.appointment_time, ':', 2)::integer
        + COALESCE(a.duration_minutes, 30)
      ) > v_new_start
    );

  IF v_conflict > 0 THEN
    RETURN jsonb_build_object(
      'error', 'Bu saat dolu, lütfen başka bir saat seçin.'
    );
  END IF;

  -- ── Customer upsert ────────────────────────────────────────────────────────
  -- Safe because customers_business_phone_unique constraint exists.
  -- On conflict: update name and last_visit_at, increment visit_count.
  INSERT INTO public.customers (
    business_id, full_name, phone, last_visit_at, visit_count
  )
  VALUES (
    p_business_id, p_customer_name, p_customer_phone, now(), 1
  )
  ON CONFLICT (business_id, phone)
  DO UPDATE SET
    full_name     = EXCLUDED.full_name,
    last_visit_at = now(),
    visit_count   = COALESCE(customers.visit_count, 0) + 1
  RETURNING id INTO v_cust_id;

  -- ── Appointment insert ─────────────────────────────────────────────────────
  INSERT INTO public.appointments (
    business_id,
    service_id,
    service_name,
    duration_minutes,
    staff_id,
    staff_name,
    customer_name,
    customer_phone,
    appointment_date,
    appointment_time,
    price,
    notes,
    status,
    source
  ) VALUES (
    p_business_id,
    p_service_id,
    p_service_name,
    p_service_duration,
    p_staff_id,
    p_staff_name,
    p_customer_name,
    p_customer_phone,
    p_date,
    p_time,
    p_price,
    p_notes,
    'Bekliyor',
    'online'
  )
  RETURNING id INTO v_appt_id;

  RETURN jsonb_build_object(
    'appointment_id', v_appt_id,
    'customer_id',    v_cust_id
  );

EXCEPTION
  -- Catches the partial unique index violation (appointments_no_exact_overlap)
  -- as a last-resort double booking guard.
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'error', 'Bu saat dolu, lütfen başka bir saat seçin.'
    );
END;
$$;

-- Grant execute to both roles used by the public booking page
GRANT EXECUTE ON FUNCTION public.book_appointment TO anon;
GRANT EXECUTE ON FUNCTION public.book_appointment TO authenticated;
