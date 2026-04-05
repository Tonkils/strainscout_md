/**
 * StrainScout MD — Cookie & Consent Utilities
 *
 * Manages cookie consent (GDPR/CCPA-style), attribution tracking,
 * and IP-based geolocation for data collection optimization.
 */

// ─── Types ───────────────────────────────────────────────
export interface ConsentPreferences {
  essential: true; // always on
  analytics: boolean; // GA4 + PostHog
  marketing: boolean; // future ad pixels
  timestamp: number;
}

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  channel: string; // classified: organic, direct, social, referral, paid, email
  first_visit: string; // ISO timestamp
}

export interface GeoData {
  city?: string;
  region?: string;
  country?: string;
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────
const CONSENT_KEY = "strainscout_consent";
const ATTRIBUTION_KEY = "strainscout_attribution";
const GEO_KEY = "strainscout_geo";
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds
const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// ─── Cookie Helpers ──────────────────────────────────────
function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;
}

// ─── Consent ─────────────────────────────────────────────
export function getConsent(): ConsentPreferences | null {
  const raw = getCookie(CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setConsent(prefs: Omit<ConsentPreferences, "essential" | "timestamp">) {
  const full: ConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    timestamp: Date.now(),
  };
  setCookie(CONSENT_KEY, JSON.stringify(full), CONSENT_MAX_AGE);
  return full;
}

export function hasConsent(category: "analytics" | "marketing"): boolean {
  const prefs = getConsent();
  if (!prefs) return false;
  return prefs[category] === true;
}

export function clearConsent() {
  deleteCookie(CONSENT_KEY);
}

export function hasRespondedToConsent(): boolean {
  return getConsent() !== null;
}

// ─── Attribution ─────────────────────────────────────────
function classifyChannel(params: URLSearchParams, referrer: string): string {
  if (params.get("utm_medium") === "cpc" || params.get("utm_medium") === "paid" || params.get("gclid")) {
    return "paid";
  }
  if (params.get("utm_medium") === "email" || params.get("utm_source") === "newsletter") {
    return "email";
  }
  if (params.get("utm_source") || params.get("utm_medium")) {
    return params.get("utm_medium") || "referral";
  }
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname;
    if (/google|bing|yahoo|duckduckgo|baidu/.test(host)) return "organic";
    if (/facebook|instagram|twitter|x\.com|tiktok|reddit|linkedin/.test(host)) return "social";
    return "referral";
  } catch {
    return "direct";
  }
}

export function captureAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;

  // Don't overwrite existing attribution (first-touch model)
  const existing = getAttribution();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";

  const attribution: Attribution = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
    referrer: referrer || undefined,
    landing_page: window.location.pathname,
    channel: classifyChannel(params, referrer),
    first_visit: new Date().toISOString(),
  };

  setCookie(ATTRIBUTION_KEY, JSON.stringify(attribution), ATTRIBUTION_MAX_AGE);
  return attribution;
}

export function getAttribution(): Attribution | null {
  const raw = getCookie(ATTRIBUTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Geolocation (IP-based) ─────────────────────────────
export async function fetchGeoData(): Promise<GeoData | null> {
  // Check cache first (refresh every 24h)
  const cached = getGeoData();
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached;
  }

  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return cached;
    const data = await res.json();
    const geo: GeoData = {
      city: data.city,
      region: data.region,
      country: data.country_name,
      timestamp: Date.now(),
    };
    setCookie(GEO_KEY, JSON.stringify(geo), ATTRIBUTION_MAX_AGE);
    return geo;
  } catch {
    return cached;
  }
}

export function getGeoData(): GeoData | null {
  const raw = getCookie(GEO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
