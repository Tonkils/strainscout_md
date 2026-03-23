/**
 * StrainScout MD — PostHog Analytics
 * 10 core events as defined in Sprint 1 PM Spec
 */
import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://us.i.posthog.com";

let initialized = false;

/** Initialize PostHog — call once at app startup */
export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) {
    if (!POSTHOG_KEY) {
      console.warn("[Analytics] VITE_POSTHOG_KEY not set — analytics disabled");
    }
    return;
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We fire page_viewed manually with richer properties
    capture_pageleave: true,
    autocapture: false, // We define our own events
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

// ─── Helpers ───────────────────────────────────────────────

function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// ─── Event 1: session_started ──────────────────────────────

export function trackSessionStarted(landingPage: string) {
  const params = new URLSearchParams(window.location.search);
  track("session_started", {
    landing_page: landingPage,
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    device_type: getDeviceType(),
  });
}

// ─── Event 2: page_viewed ──────────────────────────────────

export function trackPageViewed(pageName: string, strainId?: string) {
  track("page_viewed", {
    page_name: pageName,
    strain_id: strainId,
    referrer: document.referrer || undefined,
  });
}

// ─── Event 3: strain_searched ──────────────────────────────

export function trackStrainSearched(
  query: string,
  resultCount: number,
  selectedStrainId?: string
) {
  track("strain_searched", {
    query,
    result_count: resultCount,
    selected_strain_id: selectedStrainId,
  });
}

// ─── Event 4: strain_viewed ────────────────────────────────

export function trackStrainViewed(
  strainId: string,
  strainName: string,
  type: string,
  thcRange?: string
) {
  track("strain_viewed", {
    strain_id: strainId,
    strain_name: strainName,
    type,
    thc_range: thcRange,
  });
}

// ─── Event 5: price_compared ───────────────────────────────

export function trackPriceCompared(strainIds: string[], strainCount: number) {
  track("price_compared", {
    strain_ids: strainIds,
    strain_count: strainCount,
  });
}

// ─── Event 6: dispensary_clicked ───────────────────────────

export function trackDispensaryClicked(
  dispensaryName: string,
  sourcePage: string,
  strainId?: string
) {
  track("dispensary_clicked", {
    dispensary_name: dispensaryName,
    source_page: sourcePage,
    strain_id: strainId,
  });
}

// ─── Event 7: outbound_link_clicked ────────────────────────

export function trackOutboundLinkClicked(
  destinationUrl: string,
  platform: string,
  strainId?: string,
  dispensaryName?: string
) {
  track("outbound_link_clicked", {
    destination_url: destinationUrl,
    platform,
    strain_id: strainId,
    dispensary_name: dispensaryName,
  });
}

// ─── Event 8: map_interacted ───────────────────────────────

export function trackMapInteracted(
  actionType: "pan" | "zoom" | "marker_click" | "locate" | "sort_distance",
  dispensaryName?: string,
  zoomLevel?: number
) {
  track("map_interacted", {
    action_type: actionType,
    dispensary_name: dispensaryName,
    zoom_level: zoomLevel,
  });
}

// ─── Event 9: filter_applied ───────────────────────────────

export function trackFilterApplied(
  filterType: string,
  filterValue: string,
  pageName: string
) {
  track("filter_applied", {
    filter_type: filterType,
    filter_value: filterValue,
    page_name: pageName,
  });
}

// ─── Event 10: badge_tooltip_viewed ────────────────────────

export function trackBadgeTooltipViewed(
  tier: string,
  strainId?: string,
  dispensaryName?: string,
  daysSinceVerified?: number
) {
  track("badge_tooltip_viewed", {
    tier,
    strain_id: strainId,
    dispensary_name: dispensaryName,
    days_since_verified: daysSinceVerified,
  });
}

// ─── Bonus: email_signup (for conversion tracking) ─────────

export function trackEmailSignup(
  source: string,
  strainId?: string,
  strainName?: string
) {
  track("email_signup", {
    source,
    strain_id: strainId,
    strain_name: strainName,
  });
}

// ─── Event 11: price_alert_set (Sprint 7) ─────────────────

export function trackPriceAlertSet(
  strainId: string,
  strainName: string,
  targetPrice: number,
  currentPrice?: number,
  dispensary?: string
) {
  track("price_alert_set", {
    strain_id: strainId,
    strain_name: strainName,
    target_price: targetPrice,
    current_price: currentPrice,
    dispensary: dispensary || "any",
    discount_target: currentPrice ? Math.round(((currentPrice - targetPrice) / currentPrice) * 100) : undefined,
  });
}

// ─── Event 12: market_dashboard_viewed (Sprint 10) ────────

export function trackMarketDashboardViewed(
  section?: string,
  filterType?: string,
  filterRegion?: string
) {
  track("market_dashboard_viewed", {
    section,
    filter_type: filterType,
    filter_region: filterRegion,
    device_type: getDeviceType(),
  });
}

// ─── Event 13: dispensary_compared (Sprint 11) ───────────

export function trackDispensaryCompared(
  dispensaryNames: string[],
  sharedStrainCount: number,
  maxSavings?: number
) {
  track("dispensary_compared", {
    dispensary_names: dispensaryNames,
    dispensary_count: dispensaryNames.length,
    shared_strain_count: sharedStrainCount,
    max_savings: maxSavings,
    device_type: getDeviceType(),
  });
}


// ─── Event 14: strain_voted (Sprint 12) ──────────────────

export function trackStrainVoted(
  strainId: string,
  strainName: string,
  effectsAccuracy: 1 | -1,
  valueForMoney: 1 | -1,
  overallQuality: 1 | -1,
  hasComment: boolean,
  isUpdate: boolean
) {
  track("strain_voted", {
    strain_id: strainId,
    strain_name: strainName,
    effects_accuracy: effectsAccuracy === 1 ? "up" : "down",
    value_for_money: valueForMoney === 1 ? "up" : "down",
    overall_quality: overallQuality === 1 ? "up" : "down",
    has_comment: hasComment,
    is_update: isUpdate,
    device_type: getDeviceType(),
  });
}


// ─── Event 15: comment_submitted (Sprint 13) ────────────

export function trackCommentSubmitted(
  strainId: string,
  strainName: string,
  wasFlagged: boolean,
  contentLength: number
) {
  track("comment_submitted", {
    strain_id: strainId,
    strain_name: strainName,
    was_flagged: wasFlagged,
    content_length: contentLength,
    device_type: getDeviceType(),
  });
}


// ─── Event 16: partner_claimed (Sprint 14) ──────────────

export function trackPartnerClaimed(
  dispensarySlug: string,
  dispensaryName: string,
  businessName: string
) {
  track("partner_claimed", {
    dispensary_slug: dispensarySlug,
    dispensary_name: dispensaryName,
    business_name: businessName,
    device_type: getDeviceType(),
  });
}

// ─── Event 17: partner_price_submitted (Sprint 14) ──────

export function trackPartnerPriceSubmitted(
  strainId: string,
  strainName: string,
  price: string,
  unit: string,
  dispensarySlug: string
) {
  track("partner_price_submitted", {
    strain_id: strainId,
    strain_name: strainName,
    price: parseFloat(price),
    unit,
    dispensary_slug: dispensarySlug,
    device_type: getDeviceType(),
  });
}
