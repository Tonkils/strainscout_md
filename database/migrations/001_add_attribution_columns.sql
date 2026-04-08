-- StrainScout MD — Add Attribution & Geo Columns to email_signups
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- Date: 2026-04-08

-- 1. Add UTM attribution columns
ALTER TABLE public.email_signups
  ADD COLUMN IF NOT EXISTS utm_source    varchar(128),
  ADD COLUMN IF NOT EXISTS utm_medium    varchar(128),
  ADD COLUMN IF NOT EXISTS utm_campaign  varchar(256);

-- 2. Add geo columns (populated server-side or via client IP lookup)
ALTER TABLE public.email_signups
  ADD COLUMN IF NOT EXISTS geo_city    varchar(128),
  ADD COLUMN IF NOT EXISTS geo_region  varchar(64);

-- 3. Add referrer and landing page
ALTER TABLE public.email_signups
  ADD COLUMN IF NOT EXISTS referrer_url     text,
  ADD COLUMN IF NOT EXISTS landing_page_url text;

-- 4. Index for attribution reporting
CREATE INDEX IF NOT EXISTS idx_signups_utm_source
  ON public.email_signups (utm_source)
  WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signups_geo_region
  ON public.email_signups (geo_region)
  WHERE geo_region IS NOT NULL;

-- Verify: run this after the migration to confirm columns exist
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'email_signups' ORDER BY ordinal_position;
