-- Migration: booking_monthly_limit
-- Updates book_appointment() to enforce monthly appointment limits per plan.
-- Plan limits: starter=30/month, pro=-1 (unlimited), business=-1 (unlimited)

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
  p_time             text,
  p_price            numeric,
  p_notes            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_start       integer;
  v_new_end         integer;
  v_conflict        integer;
  v_appt_id         bigint;
  v_cust_id         bigint;
  v_plan_name       text;
  v_month_limit     integer;
  v_month_count     integer;
  v_month_start     date;
  v_month_end       date;
BEGIN
  -- Overlap check
  v_new_start := split_part(p_time, ':', 1)::integer * 60
               + split_part(p_time, ':', 2)::integer;
  v_new_end   := v_new_start + p_service_duration;

  SELECT COUNT(*) INTO v_conflict
  FROM public.appointments a
  WHERE a.staff_id         = p_staff_id
    AND a.appointment_date = p_date
    AND a.status IN ('Bekliyor', 'Onaylı', 'pending', 'confirmed')
    AND (
      split_part(a.appointment_time,':',1)::integer * 60
      + split_part(a.appointment_time,':',2)::integer
    ) < v_new_end
    AND (
      split_part(a.appointment_time,':',1)::integer * 60
      + split_part(a.appointment_time,':',2)::integer
      + COALESCE(a.duration_minutes, 30)
    ) > v_new_start;

  IF v_conflict > 0 THEN
    RETURN jsonb_build_object('error', 'Bu saat dolu, lütfen başka bir saat seçin.');
  END IF;

  -- Monthly limit check
  SELECT COALESCE(plan_name, 'starter') INTO v_plan_name
  FROM public.subscriptions WHERE business_id = p_business_id LIMIT 1;
  v_plan_name := COALESCE(v_plan_name, 'starter');

  v_month_limit := CASE v_plan_name
    WHEN 'starter'  THEN 30
    WHEN 'pro'      THEN -1
    WHEN 'business' THEN -1
    ELSE 30
  END;

  IF v_month_limit <> -1 THEN
    v_month_start := date_trunc('month', p_date)::date;
    v_month_end   := (date_trunc('month', p_date) + INTERVAL '1 month')::date;

    SELECT COUNT(*) INTO v_month_count
    FROM public.appointments
    WHERE business_id      = p_business_id
      AND appointment_date >= v_month_start
      AND appointment_date <  v_month_end
      AND status NOT IN ('İptal', 'Gelmedi', 'cancelled', 'no_show');

    IF v_month_count >= v_month_limit THEN
      RETURN jsonb_build_object(
        'error',
        'Bu işletme bu ay için randevu limitine ulaştı. Lütfen daha sonra tekrar deneyin.'
      );
    END IF;
  END IF;

  -- Customer upsert
  INSERT INTO public.customers (business_id, full_name, phone, last_visit_at, visit_count)
  VALUES (p_business_id, p_customer_name, p_customer_phone, now(), 1)
  ON CONFLICT (business_id, phone)
  DO UPDATE SET
    full_name     = EXCLUDED.full_name,
    last_visit_at = now(),
    visit_count   = COALESCE(customers.visit_count, 0) + 1
  RETURNING id INTO v_cust_id;

  -- Appointment insert
  INSERT INTO public.appointments (
    business_id, service_id, service_name, duration_minutes,
    staff_id, staff_name, customer_name, customer_phone,
    appointment_date, appointment_time, price, notes, status, source
  ) VALUES (
    p_business_id, p_service_id, p_service_name, p_service_duration,
    p_staff_id, p_staff_name, p_customer_name, p_customer_phone,
    p_date, p_time, p_price, p_notes, 'Bekliyor', 'online'
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
