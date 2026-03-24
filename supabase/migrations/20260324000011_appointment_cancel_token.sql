-- ── 1. cancel_token kolonu ─────────────────────────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS cancel_token uuid DEFAULT gen_random_uuid() NOT NULL;

UPDATE appointments SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_cancel_token_idx ON appointments (cancel_token);

-- ── 2. Anon SELECT token ile ──────────────────────────────────────────────────
DROP POLICY IF EXISTS appts_anon_read_by_token ON appointments;
CREATE POLICY appts_anon_read_by_token ON appointments
  FOR SELECT TO anon
  USING (cancel_token IS NOT NULL);

-- ── 3. Güvenli iptal/değiştirme fonksiyonu ────────────────────────────────────
CREATE OR REPLACE FUNCTION manage_appointment_by_token(
  p_token    uuid,
  p_action   text,
  p_new_date text DEFAULT NULL,
  p_new_time text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_appt FROM appointments WHERE cancel_token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Randevu bulunamadı.');
  END IF;

  IF v_appt.status IN ('İptal', 'Tamamlandı', 'Gelmedi') THEN
    RETURN json_build_object('error', 'Bu randevu zaten ' || v_appt.status || ' durumunda.');
  END IF;

  IF v_appt.appointment_date < CURRENT_DATE::text
     OR (v_appt.appointment_date = CURRENT_DATE::text
         AND v_appt.appointment_time < TO_CHAR(NOW() AT TIME ZONE 'Europe/Istanbul', 'HH24:MI')) THEN
    RETURN json_build_object('error', 'Geçmiş randevular değiştirilemez.');
  END IF;

  IF p_action = 'cancel' THEN
    UPDATE appointments SET status = 'İptal' WHERE cancel_token = p_token;
    RETURN json_build_object('ok', true, 'action', 'canceled',
      'customer_name', v_appt.customer_name, 'service_name', v_appt.service_name,
      'appointment_date', v_appt.appointment_date, 'appointment_time', v_appt.appointment_time,
      'business_id', v_appt.business_id);

  ELSIF p_action = 'reschedule' THEN
    IF p_new_date IS NULL OR p_new_time IS NULL THEN
      RETURN json_build_object('error', 'Yeni tarih ve saat gereklidir.');
    END IF;

    IF EXISTS (
      SELECT 1 FROM appointments
      WHERE staff_id = v_appt.staff_id AND appointment_date = p_new_date
        AND appointment_time = p_new_time AND id != v_appt.id
        AND status NOT IN ('İptal', 'Tamamlandı', 'Gelmedi')
    ) THEN
      RETURN json_build_object('error', 'Seçtiğiniz saat dolu. Lütfen başka bir saat seçin.');
    END IF;

    UPDATE appointments
    SET appointment_date = p_new_date, appointment_time = p_new_time, reminder_sent_at = NULL
    WHERE cancel_token = p_token;

    RETURN json_build_object('ok', true, 'action', 'rescheduled',
      'customer_name', v_appt.customer_name, 'service_name', v_appt.service_name,
      'old_date', v_appt.appointment_date, 'old_time', v_appt.appointment_time,
      'appointment_date', p_new_date, 'appointment_time', p_new_time,
      'business_id', v_appt.business_id);
  ELSE
    RETURN json_build_object('error', 'Geçersiz işlem.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION manage_appointment_by_token(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION manage_appointment_by_token(uuid, text, text, text) TO authenticated;
