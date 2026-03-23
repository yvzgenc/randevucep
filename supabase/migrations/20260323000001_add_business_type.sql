-- Migration: add_business_type
-- Adds business_type to businesses with DEFAULT, CHECK, and NOT NULL.

-- Step 1: add column as nullable first (so existing rows don't violate NOT NULL)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_type text
  DEFAULT 'beauty_salon'
  CHECK (business_type IN (
    'barber',
    'beauty_salon',
    'dental_clinic',
    'psychology',
    'education',
    'veterinary',
    'consulting'
  ));

-- Step 2: backfill any existing NULLs (covers rows added before DEFAULT was set)
UPDATE public.businesses
SET business_type = 'beauty_salon'
WHERE business_type IS NULL;

-- Step 3: enforce NOT NULL now that all rows have a value
ALTER TABLE public.businesses
  ALTER COLUMN business_type SET NOT NULL;
