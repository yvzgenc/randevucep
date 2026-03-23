-- Migration: book_appointment_add_customer_email
-- Extends book_appointment() with optional p_customer_email parameter.
-- The email is stored on the appointment row at insert time, enabling
-- server-side notification chains without a separate client fetch.

DROP FUNCTION IF EXISTS public.book_appointment(
  bigint, bigint, text, integer, bigint, text, text, text, date, text, numeric, text
);

CREATE FUNCTION public.book_appointment(
  p_business_id      bigint,
  p_service_id       bigint,
  p_service_name     text,
  p_service_duration integer,
  p_staff_id         bigint,
  p_staff_name       text,
  p_customer_name    text,
  p_customer_phone   text,
  p_date             date,
  p_time             text,
  p_price            numeric,
  p_notes            text,
  p_customer_email   text DEFAULT NULL
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
  v_new_start := split_part(p_time, ':', 1)::integer * 60
               + split_part(p_time, ':', 2)::integer;
  v_new_end   := v_new_start + p_service_duration;

  SELECT COUNT(*) INTO v_conflict
  FROM public.appointments a
  WHERE a.business_id      = p_business_id
    AND a.staff_id         = p_staff_id
    AND a.appointment_date = p_date
    AND a.status NOT IN ('İptal', 'Gelmedi', 'canceled', 'cancelled')
    AND (
      split_part(a.appointment_time, ':', 1)::integer * 60
      + split_part(a.appointment_time, ':', 2)::integer
    ) < v_new_end
    AND (
      split_part(a.appointment_time, ':', 1)::integer * 60
      + split_part(a.appointment_time, ':', 2)::integer
      + COALESCE(a.duration_minutes, 30)
    ) > v_new_start;

  IF v_conflict > 0 THEN
    RETURN jsonb_build_object('error', 'Bu saat dolu, lütfen başka bir saat seçin.');
  END IF;

  INSERT INTO public.customers (business_id, full_name, phone, last_visit_at, visit_count)
  VALUES (p_business_id, p_customer_name, p_customer_phone, now(), 1)
  ON CONFLICT (business_id, phone)
  DO UPDATE SET
    full_name     = EXCLUDED.full_name,
    last_visit_at = now(),
    visit_count   = COALESCE(customers.visit_count, 0) + 1
  RETURNING id INTO v_cust_id;

  INSERT INTO public.appointments (
    business_id, service_id, service_name, duration_minutes,
    staff_id, staff_name, customer_name, customer_phone,
    appointment_date, appointment_time, price, notes,
    status, source, customer_email
  ) VALUES (
    p_business_id, p_service_id, p_service_name, p_service_duration,
    p_staff_id, p_staff_name, p_customer_name, p_customer_phone,
    p_date, p_time, p_price, p_notes,
    'Bekliyor', 'online', p_customer_email
  )
  RETURNING id INTO v_appt_id;

  RETURN jsonb_build_object('appointment_id', v_appt_id, 'customer_id', v_cust_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Bu saat dolu, lütfen başka bir saat seçin.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_appointment TO anon;
GRANT EXECUTE ON FUNCTION public.book_appointment TO authenticated;
