# StrainScout MD — Data Collection Optimization Plan

**Created:** April 5, 2026
**Status:** Phases 1–4 IMPLEMENTED, activation pending

---

## Current State Audit

**What's already in place:**
- **Google Analytics (GA4)** — Active on `web/` with ID `G-GM6V8H260M`, but NOT on `web_2/` (the live Next.js site)
- **PostHog** — 17 events fully instrumented in code, but **disabled** (no `NEXT_PUBLIC_POSTHOG_KEY` env var set)
- **Email capture** — 4 collection points exist (footer, deal_digest banner, price_alert, compare_inline), but emails only go to **localStorage** — no backend webhook fires on the static site
- **UTM tracking** — Code captures `utm_source`, `utm_medium`, `utm_campaign` but only sends to PostHog (which is off)
- **Cookie consent** — **NONE** exists
- **IP/City tracking** — **NONE** exists
- **Privacy Policy** — **Placeholder only** ("Feature coming soon" toast)
- **Hosting** — IONOS static hosting (Apache, no Node.js server). Static export only.

---

## Data Collection Optimization Plan

### Phase 1: Foundation — Cookie Consent + GA4 (Priority: Immediate) -- DONE

**1A. Cookie Consent Banner** -- DONE
- [x] Build a GDPR/CCPA-compliant consent banner component
- [x] 3 tiers: **Essential** (always on), **Analytics** (GA4 + PostHog), **Marketing** (future pixels)
- [x] Store consent in cookie `strainscout_consent` with 1-year expiry
- [x] Gate ALL analytics scripts behind consent
- [x] Track `cookie_consent_given` / `cookie_consent_denied` as the first conversion event

**1B. Google Analytics 4 on web_2/** -- DONE
- [x] Add gtag script to `web_2/src/app/layout.tsx` (same ID `G-GM6V8H260M`)
- [x] Gate behind cookie consent
- [ ] GA4 automatically collects: **IP-based city/region**, device, browser, referrer, session duration *(requires deploy)*
- [ ] Enable **Enhanced Measurement**: scroll depth, outbound clicks, site search, file downloads *(requires GA4 dashboard config)*

**1C. Activate PostHog** -- PENDING (env var needed)
- [ ] Set `NEXT_PUBLIC_POSTHOG_KEY` env var
- [ ] All 17 events immediately start firing
- [ ] PostHog gives: session replays, funnels, user paths, cohorts

### Phase 2: Attribution + Location (Priority: Week 1) -- DONE

**2A. UTM Parameter Persistence** -- DONE
- [x] On first visit, capture UTM params + `document.referrer` into `strainscout_attribution` cookie (30-day expiry)
- [x] Pass attribution data with every email signup and conversion event
- [x] This tells you: Google Ads vs organic vs social vs direct

**2B. IP-Based Geolocation** -- DONE
- [x] GA4 already provides city-level geo data from IP (no extra code needed)
- [x] For in-app use: add a lightweight geo lookup via free API (`ipapi.co/json/`) on session start
- [x] Store city/state in session cookie `strainscout_geo`
- [x] Use for: personalized dispensary sorting, "Deals near [City]" messaging

**2C. Referrer Classification** -- DONE
- [x] Classify traffic into channels: Organic Search, Direct, Social, Referral, Paid
- [x] Store in attribution cookie alongside UTMs

### Phase 3: Email Collection Optimization (Priority: Week 1-2) -- PARTIALLY DONE

**3A. Progressive Disclosure Flow** -- DONE
The user journey should earn data through value exchange:

```
Visit → Cookie Consent (gate) → Browse → Value Hook → Email Capture → Personalization
```

**3B. Optimized Collection Points (ordered by intent)**

| Touchpoint | Trigger | Value Exchange | Data Collected | Status |
|---|---|---|---|---|
| Cookie Banner | Page load | "Personalize your experience" | Consent + geo | DONE |
| Deal Digest Banner | 2nd page view OR 30s on site | "Save $15-40/week" | Email | DONE |
| Strain Search | After 3+ searches | "Save your searches" | Email | NOT YET |
| Price Alert | Viewing strain detail | "Get notified when price drops" | Email + strain preference | EXISTS (pre-existing) |
| Exit Intent Popup | Mouse leaves viewport | "Don't miss this week's deals" | Email | DONE |
| Compare Page CTA | After comparing 2+ strains | "Get a weekly comparison report" | Email + strain preferences | EXISTS (pre-existing) |

**3C. Smart Timing Rules** -- DONE
- [x] Don't show email popup if consent was just denied
- [x] Don't show email popup within 7 days of dismissal (already implemented)
- [x] Show exit-intent only once per session
- [ ] After email capture, upgrade to "Create Account" CTA instead *(future)*

### Phase 4: Conversion Funnel Definition -- DONE (code in place, needs activation)

**Primary conversion = User gives email + accepts cookies**

```
FUNNEL:
┌─────────────────────────────────────────────────┐
│ 1. LAND (session_started)                       │
│    → Cookie consent banner appears              │
│    → Accept = Analytics activated                │
├─────────────────────────────────────────────────┤
│ 2. ENGAGE (page_viewed × 2+, strain_searched)   │
│    → Deal Digest banner appears                 │
│    → Personalized "Deals near [City]" CTA       │
├─────────────────────────────────────────────────┤
│ 3. CONVERT (email_signup)                       │
│    → Email captured + strain context            │
│    → Attribution data attached                  │
├─────────────────────────────────────────────────┤
│ 4. ACTIVATE (price_alert_set, strain_voted)     │
│    → Deep engagement actions                    │
│    → Account creation prompt                    │
├─────────────────────────────────────────────────┤
│ 5. RETAIN (return visit, outbound_link_clicked) │
│    → Weekly digest email opens                  │
│    → Dispensary click-throughs                  │
└─────────────────────────────────────────────────┘
```

### Phase 5: Implementation Files

| File | Action | What | Status |
|---|---|---|---|
| `web_2/src/components/CookieConsent.tsx` | **CREATE** | Cookie consent banner component | DONE |
| `web_2/src/lib/cookies.ts` | **CREATE** | Cookie utility (get/set consent, attribution, geo) | DONE |
| `web_2/src/components/GoogleAnalytics.tsx` | **CREATE** | GA4 loader gated behind consent | DONE |
| `web_2/src/app/layout.tsx` | **EDIT** | Add GA4 gtag + CookieConsent + gate PostHog behind consent | DONE |
| `web_2/src/hooks/useEmailCapture.ts` | **EDIT** | Attach attribution + geo data to email signups | DONE |
| `web_2/src/components/DealDigestBanner.tsx` | **EDIT** | Smart timing (show after 2nd pageview or 30s) + city personalization | DONE |
| `web_2/src/lib/analytics.ts` | **EDIT** | Add consent check before all PostHog calls | DONE |
| `web_2/src/components/PostHogProvider.tsx` | **EDIT** | Gate PostHog init behind consent, listen for consent-updated event | DONE |
| `web_2/src/components/ExitIntentPopup.tsx` | **CREATE** | Exit-intent email capture (desktop, once/session, 10s delay) | DONE |
| `web_2/src/app/privacy/page.tsx` | **CREATE** | Full privacy policy page (GDPR/CCPA) | DONE |
| `web_2/src/components/Footer.tsx` | **EDIT** | Wire Privacy Policy link to /privacy | DONE |
| `web_2/src/db/schema.ts` | **EDIT** | Add 7 attribution/geo columns to email_signups | DONE |
| `database/migrations/001_add_attribution_columns.sql` | **CREATE** | SQL migration with indexes | DONE |
| `web_2/src/app/admin/analytics/page.tsx` | **REWRITE** | Real admin dashboard with signup analytics | DONE |
| `publish/upload_ionos.py` | **EDIT** | Update CSP to allow GA4 + ipapi.co domains | DONE |

---

## What GA4 Gives You Automatically (No Extra Code)

Once connected with consent:
- **IP-based city/state** (GA4 Geo reports)
- **Traffic source/medium** (GA4 Acquisition reports)
- **Device/browser/OS** breakdown
- **Session duration, bounce rate, pages/session**
- **User flow** (which pages lead to conversions)
- **Real-time active users**

## What PostHog Adds On Top

Once activated:
- **Session replays** (watch actual user behavior)
- **Funnel analysis** (where users drop off)
- **Cohort analysis** (which user segments convert)
- **A/B testing** (test different CTA copy, banner timing)
- **Feature flags** (progressive rollout of new features)

---

## Next Steps — Activation & Remaining Work

### Immediate — Activation Required (blocks everything)

- [ ] **1. Run Supabase migration** — Execute `database/migrations/001_add_attribution_columns.sql` in the Supabase SQL Editor. Adds `utm_source`, `utm_medium`, `utm_campaign`, `channel`, `referrer`, `city`, `region` columns to `email_signups` plus reporting indexes.

- [ ] **2. Set PostHog environment variable** — Add `NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here`:
  - **Local dev**: Create `web_2/.env.local` with the key
  - **GitHub Actions**: Add as a repository secret in Settings > Secrets > Actions
  - **Manual build**: Export the var before running `npm run build`
  - Get the key from PostHog project at https://us.posthog.com → Project Settings → API Key

- [ ] **3. Rebuild and deploy**:
  ```bash
  cd web_2 && npm run build
  cd .. && python3 -m publish.upload_ionos --next-incremental
  ```

- [ ] **4. Verify live site** — After deploy, confirm:
  - Cookie consent banner appears on first visit
  - Accepting cookies activates GA4 (check GA4 Real-time report)
  - Privacy Policy page loads at `/privacy`
  - Email signup sends attribution data (check Supabase `email_signups` table for new columns)
  - Exit-intent popup triggers on desktop (move cursor toward browser tabs)
  - Admin dashboard at `/admin/analytics` shows signup data

- [ ] **5. Configure GA4 Enhanced Measurement** — In Google Analytics (property `G-GM6V8H260M`):
  - Go to Admin > Data Streams > Web > Enhanced Measurement
  - Enable: Scrolls, Outbound clicks, Site search, File downloads

### Short-term — Data & Pipeline

- [ ] **6. Run a multi-category scrape** — Scraper code captures non-flower products, but no new scrape has been run. Weedmaps is a scraping target for menu/price data only — Leafly is authoritative for strain properties.
- [ ] **7. Re-run the full pipeline** — `parse_raw.py` → `enrich.py` → `deduplicate.py` → `build_catalog.py` for "verified" confidence catalog.
- [ ] **8. Update manual_overrides.json** — Review MEDIUM confidence items from new scrape.

### Medium-term — Data Collection Optimization

- [ ] **9. Connect email service** — Integrate Resend, SendGrid, or Mailchimp to actually send the weekly Tuesday deal digest. Currently emails go to Supabase + localStorage but nothing sends.
- [ ] **10. A/B test email CTAs** — Use PostHog feature flags to test banner headlines, exit-intent copy, button text.
- [ ] **11. Add Facebook/Meta Pixel** — Behind "marketing" cookie consent tier (tier already built).
- [ ] **12. Terms of Service page** — Footer link is still a placeholder. Create `/terms`.
- [ ] **13. Search-triggered email capture** — Show email prompt after 3+ strain searches ("Save your searches").
- [ ] **14. Post-signup CTA upgrade** — After email capture, switch CTAs to "Create Account" instead of email forms.

### Medium-term — Infrastructure

- [ ] **15. Security** — Credential audit, input validation (CSP headers already updated)
- [ ] **16. Quick Wins** — SEO metadata, performance optimization
- [ ] **17. Code Quality** — Consolidate duplicate code, proper error boundaries
- [ ] **18. UX** — Skeleton screens, improved DealCard, trust signals
- [ ] **19. Pipeline Reliability** — Retry logic, monitoring, alerting
