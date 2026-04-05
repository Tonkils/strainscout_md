-- Migration: Add attribution and geolocation columns to email_signups
-- Required for data collection optimization (cookie consent + GA4 + attribution tracking)
-- Run this in Supabase SQL Editor before deploying the updated web_2 app.

ALTER TABLE public.email_signups
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(256),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(256),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(256),
  ADD COLUMN IF NOT EXISTS channel VARCHAR(64),
  ADD COLUMN IF NOT EXISTS referrer VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS city VARCHAR(128),
  ADD COLUMN IF NOT EXISTS region VARCHAR(128);

-- Index on channel for attribution reporting queries
CREATE INDEX IF NOT EXISTS idx_email_channel ON public.email_signups(channel);

-- Index on city for geo-based reporting
CREATE INDEX IF NOT EXISTS idx_email_city ON public.email_signups(city);

-- Composite index for admin dashboard: signups by source + channel
CREATE INDEX IF NOT EXISTS idx_email_source_channel ON public.email_signups(source, channel);
