-- ── 1. business_hours ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id  bigint NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  dow          smallint NOT NULL CHECK (dow BETWEEN 0 AND 6),
  is_open      boolean NOT NULL DEFAULT true,
  opening_time text,
  closing_time text,
  UNIQUE (business_id, dow)
);

-- ── 2. business_closures ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_closures (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id bigint NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  closed_date date NOT NULL,
  reason      text,
  UNIQUE (business_id, closed_date)
);

-- ── 3. staff_working_days ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_working_days (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id    bigint NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  business_id bigint NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  dow         smallint NOT NULL CHECK (dow BETWEEN 0 AND 6),
  is_working  boolean NOT NULL DEFAULT true,
  UNIQUE (staff_id, dow)
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE business_hours     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_closures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY biz_hours_owner ON business_hours
  USING  (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY biz_closures_owner ON business_closures
  USING  (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY staff_wd_owner ON staff_working_days
  USING  (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY biz_hours_anon_read     ON business_hours     FOR SELECT TO anon USING (true);
CREATE POLICY biz_closures_anon_read  ON business_closures  FOR SELECT TO anon USING (true);
CREATE POLICY staff_wd_anon_read      ON staff_working_days FOR SELECT TO anon USING (true);
