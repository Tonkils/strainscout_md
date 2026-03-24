/**
 * StrainScout MD — PostHog Analytics (Next.js edition)
 * Mirrors web/client/src/lib/analytics.ts with NEXT_PUBLIC_ env vars
 */
import posthog from "posthog-js";

let initialized = false;

/** Initialize PostHog — called by PostHogProvider */
export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (initialized || !key) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // PostHogProvider fires $pageview manually
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

// ─── Helpers ──────────────────────────────────────────────
function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.capture(event, properties);
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// ─── Event 1: session_started ─────────────────────────────
export function trackSessionStarted(landingPage: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  track("session_started", {
    landing_page: landingPage,
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    device_type: getDeviceType(),
  });
}

// ─── Event 2: page_viewed ─────────────────────────────────
export function trackPageViewed(pageName: string, strainId?: string) {
  track("page_viewed", {
    page_name: pageName,
    strain_id: strainId,
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
  });
}

// ─── Event 3: strain_searched ─────────────────────────────
export function trackStrainSearched(query: string, resultCount: number, selectedStrainId?: string) {
  track("strain_searched", { query, result_count: resultCount, selected_strain_id: selectedStrainId });
}

// ─── Event 4: strain_viewed ───────────────────────────────
export function trackStrainViewed(strainId: string, strainName: string, type: string, thcRange?: string) {
  track("strain_viewed", { strain_id: strainId, strain_name: strainName, type, thc_range: thcRange });
}

// ─── Event 5: price_compared ──────────────────────────────
export function trackPriceCompared(strainIds: string[], strainCount: number) {
  track("price_compared", { strain_ids: strainIds, strain_count: strainCount });
}

// ─── Event 6: dispensary_clicked ──────────────────────────
export function trackDispensaryClicked(dispensaryName: string, sourcePage: string, strainId?: string) {
  track("dispensary_clicked", { dispensary_name: dispensaryName, source_page: sourcePage, strain_id: strainId });
}

// ─── Event 7: outbound_link_clicked ───────────────────────
export function trackOutboundLinkClicked(destinationUrl: string, platform: string, strainId?: string, dispensaryName?: string) {
  track("outbound_link_clicked", { destination_url: destinationUrl, platform, strain_id: strainId, dispensary_name: dispensaryName });
}

// ─── Event 8: map_interacted ──────────────────────────────
export function trackMapInteracted(actionType: "pan" | "zoom" | "marker_click" | "locate" | "sort_distance", dispensaryName?: string, zoomLevel?: number) {
  track("map_interacted", { action_type: actionType, dispensary_name: dispensaryName, zoom_level: zoomLevel });
}

// ─── Event 9: filter_applied ──────────────────────────────
export function trackFilterApplied(filterType: string, filterValue: string, pageName: string) {
  track("filter_applied", { filter_type: filterType, filter_value: filterValue, page_name: pageName });
}

// ─── Event 10: badge_tooltip_viewed ───────────────────────
export function trackBadgeTooltipViewed(tier: string, strainId?: string, dispensaryName?: string, daysSinceVerified?: number) {
  track("badge_tooltip_viewed", { tier, strain_id: strainId, dispensary_name: dispensaryName, days_since_verified: daysSinceVerified });
}

// ─── Event 11: email_signup ───────────────────────────────
export function trackEmailSignup(source: string, strainId?: string, strainName?: string) {
  track("email_signup", { source, strain_id: strainId, strain_name: strainName });
}

// ─── Event 12: price_alert_set ────────────────────────────
export function trackPriceAlertSet(strainId: string, strainName: string, targetPrice: number, currentPrice?: number, dispensary?: string) {
  track("price_alert_set", {
    strain_id: strainId,
    strain_name: strainName,
    target_price: targetPrice,
    current_price: currentPrice,
    dispensary: dispensary || "any",
    discount_target: currentPrice ? Math.round(((currentPrice - targetPrice) / currentPrice) * 100) : undefined,
  });
}

// ─── Event 13: market_dashboard_viewed ────────────────────
export function trackMarketDashboardViewed(section?: string, filterType?: string, filterRegion?: string) {
  track("market_dashboard_viewed", { section, filter_type: filterType, filter_region: filterRegion, device_type: getDeviceType() });
}

// ─── Event 14: dispensary_compared ────────────────────────
export function trackDispensaryCompared(dispensaryNames: string[], sharedStrainCount: number, maxSavings?: number) {
  track("dispensary_compared", { dispensary_names: dispensaryNames, dispensary_count: dispensaryNames.length, shared_strain_count: sharedStrainCount, max_savings: maxSavings, device_type: getDeviceType() });
}
