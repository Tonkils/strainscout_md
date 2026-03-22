# StrainScout MD — Frontend Core (App, Main, Hooks, Lib, Data)

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> App entry point, routing, tRPC client setup, all custom hooks, analytics, theme context, and the static catalog data.

---

## Files in This Document

1. `client/src/App.tsx` (82 lines)
2. `client/src/main.tsx` (67 lines)
3. `client/src/const.ts` (18 lines)
4. `client/src/index.css` (218 lines)
5. `client/src/lib/analytics.ts` (320 lines)
6. `client/src/lib/trpc.ts` (5 lines)
7. `client/src/lib/utils.ts` (7 lines)
8. `client/src/contexts/ThemeContext.tsx` (65 lines)
9. `client/src/data/strains.ts` (72 lines)
10. `client/src/hooks/useCatalog.ts` (387 lines)
11. `client/src/hooks/useComposition.ts` (82 lines)
12. `client/src/hooks/useDispensaryDirectory.ts` (108 lines)
13. `client/src/hooks/useDriveTime.ts` (161 lines)
14. `client/src/hooks/useEmailCapture.ts` (168 lines)
15. `client/src/hooks/useMobile.tsx` (22 lines)
16. `client/src/hooks/usePersistFn.ts` (21 lines)

---

## 1. `client/src/App.tsx`

**Lines:** 82

```tsx
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";

// Eager-load Home (above the fold, first paint)
import Home from "./pages/Home";

// Lazy-load all other pages for code splitting
const MapView = lazy(() => import("./pages/MapView"));
const CompareStrains = lazy(() => import("./pages/CompareStrains"));
const TopValue = lazy(() => import("./pages/TopValue"));
const StrainDetail = lazy(() => import("./pages/StrainDetail"));
const Account = lazy(() => import("./pages/Account"));
const DispensaryDirectory = lazy(() => import("./pages/DispensaryDirectory"));
const DispensaryDetail = lazy(() => import("./pages/DispensaryDetail"));
const Deals = lazy(() => import("./pages/Deals"));
const Alerts = lazy(() => import("./pages/Alerts"));
const MarketDashboard = lazy(() => import("./pages/MarketDashboard"));
const DispensaryCompare = lazy(() => import("./pages/DispensaryCompare"));
const Moderation = lazy(() => import("./pages/Moderation"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal"));
const AdminPartners = lazy(() => import("./pages/AdminPartners"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/map"} component={MapView} />
        <Route path={"/compare"} component={CompareStrains} />
        <Route path={"/top-value"} component={TopValue} />
        <Route path={"/strain/:id"} component={StrainDetail} />
        <Route path={"/account"} component={Account} />
        <Route path={"/dispensaries"} component={DispensaryDirectory} />
        <Route path={"/dispensary/:slug"} component={DispensaryDetail} />
        <Route path={"/deals"} component={Deals} />
        <Route path={"/alerts"} component={Alerts} />
        <Route path={"/market"} component={MarketDashboard} />
        <Route path={"/compare/dispensaries"} component={DispensaryCompare} />
        <Route path={"/moderation"} component={Moderation} />
        <Route path={"/partner"} component={PartnerPortal} />
        <Route path={"/admin/partners"} component={AdminPartners} />
        <Route path={"/search"} component={CompareStrains} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;

```

---

## 2. `client/src/main.tsx`

**Lines:** 67

```tsx
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { initAnalytics, trackSessionStarted } from "@/lib/analytics";
import "./index.css";

// Initialize PostHog analytics
initAnalytics();
trackSessionStarted(window.location.pathname);

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

```

---

## 3. `client/src/const.ts`

**Lines:** 18

```typescript
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

```

---

## 4. `client/src/index.css`

**Lines:** 218

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/*
 * StrainScout MD — "Botanical Data Lab" Design System
 * Dark emerald base, warm cream surfaces, monospaced prices
 * Typography: DM Serif Display (headlines), Space Grotesk (body), JetBrains Mono (data)
 * Dual-tone CTA system: Green = brand/info, Amber = action/conversion
 */

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --font-sans: 'Space Grotesk', system-ui, sans-serif;
  --font-serif: 'DM Serif Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
  --color-emerald-950: oklch(0.22 0.07 160);
  --color-emerald-900: oklch(0.28 0.09 160);
  --color-emerald-800: oklch(0.35 0.11 160);
  --color-emerald-700: oklch(0.42 0.13 160);
  --color-emerald-600: oklch(0.52 0.15 160);
  --color-emerald-500: oklch(0.62 0.17 155);
  --color-emerald-400: oklch(0.72 0.15 155);
  --color-cream-50: oklch(0.97 0.01 85);
  --color-cream-100: oklch(0.95 0.015 85);
  --color-cream-200: oklch(0.92 0.02 85);
  --color-amber-500: oklch(0.75 0.15 75);
  --color-amber-400: oklch(0.82 0.14 80);
  --color-amber-600: oklch(0.68 0.17 70);
  --color-cta: oklch(0.80 0.18 75);
  --color-cta-hover: oklch(0.72 0.20 70);
  --color-cta-foreground: oklch(0.14 0.04 160);
  --color-cta-glow: oklch(0.80 0.18 75 / 0.15);
  --color-savings: oklch(0.72 0.19 150);
  --color-expensive: oklch(0.63 0.22 25);
  --color-midrange: oklch(0.80 0.15 85);
  --animate-marquee: marquee 30s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

:root {
  --radius: 0.5rem;
  --background: oklch(0.14 0.04 160);
  --foreground: oklch(0.95 0.01 85);
  --card: oklch(0.18 0.05 160);
  --card-foreground: oklch(0.95 0.01 85);
  --popover: oklch(0.18 0.05 160);
  --popover-foreground: oklch(0.95 0.01 85);
  --primary: oklch(0.62 0.17 155);
  --primary-foreground: oklch(0.14 0.04 160);
  --secondary: oklch(0.22 0.05 160);
  --secondary-foreground: oklch(0.85 0.02 85);
  --muted: oklch(0.20 0.04 160);
  --muted-foreground: oklch(0.65 0.04 160);
  --accent: oklch(0.25 0.06 160);
  --accent-foreground: oklch(0.95 0.01 85);
  --destructive: oklch(0.63 0.22 25);
  --destructive-foreground: oklch(0.97 0.01 85);
  --border: oklch(0.28 0.06 160);
  --input: oklch(0.25 0.05 160);
  --ring: oklch(0.62 0.17 155);
  --chart-1: oklch(0.62 0.17 155);
  --chart-2: oklch(0.72 0.19 150);
  --chart-3: oklch(0.75 0.15 75);
  --chart-4: oklch(0.63 0.22 25);
  --chart-5: oklch(0.52 0.15 160);
  --sidebar: oklch(0.16 0.04 160);
  --sidebar-foreground: oklch(0.95 0.01 85);
  --sidebar-primary: oklch(0.62 0.17 155);
  --sidebar-primary-foreground: oklch(0.14 0.04 160);
  --sidebar-accent: oklch(0.22 0.05 160);
  --sidebar-accent-foreground: oklch(0.95 0.01 85);
  --sidebar-border: oklch(0.28 0.06 160);
  --sidebar-ring: oklch(0.62 0.17 155);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  button:not(:disabled),
  [role="button"]:not([aria-disabled="true"]),
  [type="button"]:not(:disabled),
  [type="submit"]:not(:disabled),
  [type="reset"]:not(:disabled),
  a[href],
  select:not(:disabled),
  input[type="checkbox"]:not(:disabled),
  input[type="radio"]:not(:disabled) {
    @apply cursor-pointer;
  }
  h1, h2, h3, h4 {
    font-family: 'DM Serif Display', Georgia, serif;
  }
}

@layer components {
  .container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .flex {
    min-height: 0;
    min-width: 0;
  }

  @media (min-width: 640px) {
    .container {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .container {
      padding-left: 2rem;
      padding-right: 2rem;
      max-width: 1400px;
    }
  }

  .font-price {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  .price-bar {
    background: linear-gradient(90deg, oklch(0.72 0.19 150), oklch(0.80 0.15 85), oklch(0.63 0.22 25));
  }

  .animate-marquee {
    animation: var(--animate-marquee);
  }
}

@layer utilities {
  .text-savings {
    color: oklch(0.72 0.19 150);
  }
  .text-expensive {
    color: oklch(0.63 0.22 25);
  }
  .text-midrange {
    color: oklch(0.80 0.15 85);
  }
  .bg-savings {
    background-color: oklch(0.72 0.19 150 / 0.15);
  }
  .bg-expensive {
    background-color: oklch(0.63 0.22 25 / 0.15);
  }
  .text-cta {
    color: oklch(0.80 0.18 75);
  }
  .bg-cta {
    background-color: oklch(0.80 0.18 75);
  }
  .bg-cta-hover {
    background-color: oklch(0.72 0.20 70);
  }
  .bg-cta-glow {
    background-color: oklch(0.80 0.18 75 / 0.15);
  }
  .shadow-cta {
    box-shadow: 0 4px 20px oklch(0.80 0.18 75 / 0.20);
  }
  .shadow-cta-lg {
    box-shadow: 0 8px 32px oklch(0.80 0.18 75 / 0.25);
  }
}

```

---

## 5. `client/src/lib/analytics.ts`

**Lines:** 320

```typescript
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

```

---

## 6. `client/src/lib/trpc.ts`

**Lines:** 5

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

```

---

## 7. `client/src/lib/utils.ts`

**Lines:** 7

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

```

---

## 8. `client/src/contexts/ThemeContext.tsx`

**Lines:** 65

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

```

---

## 9. `client/src/data/strains.ts`

**Lines:** 72

```typescript
/**
 * StrainScout MD — Strain Data Types & Defaults
 * Real data is loaded via useCatalog hook from CDN.
 * This file provides types and empty defaults for initial render.
 */

export interface Dispensary {
  name: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  brand?: string;
  phone?: string;
  website?: string;
  rating?: string;
  strain_count?: number;
}

export interface StrainPrice {
  dispensary: string;
  price: number;
  source: string;
}

export interface Strain {
  id: string;
  name: string;
  brand: string;
  type: string;
  thc: number | null;
  cbd: number | null;
  terpenes: string[];
  effects: string[];
  flavors: string[];
  description: string;
  genetics: string;
  prices: StrainPrice[];
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  dispensary_count: number;
  dispensaries: string[];
  grade: "A" | "B" | "C";
}

export interface CatalogStats {
  totalStrains: number;
  totalDispensaries: number;
  totalBrands: number;
  avgPrice: number;
  lowestPrice: number;
  lastUpdated: string;
  validationScore: number;
}

// Empty defaults for initial render before CDN data loads
export const strains: Strain[] = [];
export const dispensaries: Dispensary[] = [];
export const catalogStats: CatalogStats = {
  totalStrains: 2220,
  totalDispensaries: 98,
  totalBrands: 86,
  avgPrice: 47,
  lowestPrice: 10,
  lastUpdated: "March 12, 2026",
  validationScore: 99.8,
};

export const categories = ["All", "Flower"] as const;
export type Category = (typeof categories)[number];

```

---

## 10. `client/src/hooks/useCatalog.ts`

**Lines:** 387

```typescript
/**
 * StrainScout MD — Catalog Data Hook v3
 * Loads the verified strain catalog from CDN and provides
 * typed access to strains, dispensaries, brands, and external links.
 */
import { useState, useEffect, useMemo } from "react";

const CATALOG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

// Types matching the v3 catalog format
export interface CatalogStrain {
  id: string;
  name: string;
  brand: string;
  type: string; // "Indica" | "Sativa" | "Hybrid"
  thc: number;
  cbd: number;
  terpenes: string[];
  effects: string[];
  flavors: string[];
  description: string;
  genetics: string;
  prices: { dispensary: string; price: number; source: string; last_verified?: string; verified_source?: string }[];
  last_verified?: string | null;
  verification_status?: string;
  catalog_version?: string;
  catalog_updated?: string;
  dispensaries: string[];
  grade: "A" | "B" | "C";
  leafly_url: string;
  weedmaps_url: string;
  dispensary_links: Record<string, string>;
  ordering_links?: Record<string, { dutchie?: string; weedmaps?: string }>;
  leafly_verified?: boolean;
  weedmaps_verified?: boolean;
  weedmaps_name?: string;
  // Computed fields
  price_min?: number | null;
  price_max?: number | null;
  price_avg?: number | null;
  dispensary_count?: number;
}

export interface CatalogDispensary {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  brand: string;
  phone: string;
  website: string;
  rating: string;
  strain_count: number;
}

export interface CatalogBrand {
  name: string;
  strain_count: number;
}

export interface CatalogMetadata {
  version: string;
  generated: string;
  total_strains: number;
  total_dispensaries: number;
  total_brands: number;
  data_sources: string[];
  validation_score: number;
}

export interface Catalog {
  metadata: CatalogMetadata;
  strains: CatalogStrain[];
  dispensaries: CatalogDispensary[];
  brands: CatalogBrand[];
}

// Singleton cache
let catalogCache: Catalog | null = null;
let loadingPromise: Promise<Catalog> | null = null;

async function fetchCatalog(): Promise<Catalog> {
  if (catalogCache) return catalogCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(CATALOG_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
      return res.json();
    })
    .then((rawData: CatalogStrain[] | Catalog) => {
      let strains: CatalogStrain[];
      if (Array.isArray(rawData)) {
        strains = rawData;
      } else if ((rawData as Catalog).strains) {
        return rawData as Catalog;
      } else {
        strains = [];
      }

      // Compute price stats for each strain
      for (const s of strains) {
        const validPrices = (s.prices || [])
          .map((p) => p.price)
          .filter((p) => typeof p === "number" && p > 0);
        if (validPrices.length > 0) {
          s.price_min = Math.min(...validPrices);
          s.price_max = Math.max(...validPrices);
          s.price_avg =
            Math.round(
              (validPrices.reduce((a, b) => a + b, 0) / validPrices.length) *
                100
            ) / 100;
        } else {
          s.price_min = null;
          s.price_max = null;
          s.price_avg = null;
        }
        s.dispensary_count =
          (s.dispensaries || []).length ||
          new Set((s.prices || []).map((p) => p.dispensary)).size;
      }

      // Build dispensary list from strain data
      const dispMap = new Map<string, { count: number; website: string }>();
      const brandMap = new Map<string, { count: number }>();

      for (const s of strains) {
        for (const d of s.dispensaries || []) {
          const existing = dispMap.get(d);
          const website = s.dispensary_links?.[d] || "";
          if (existing) {
            existing.count++;
            if (!existing.website && website) existing.website = website;
          } else {
            dispMap.set(d, { count: 1, website });
          }
        }
        // Also count from prices
        for (const p of s.prices || []) {
          if (p.dispensary && !dispMap.has(p.dispensary)) {
            const website = s.dispensary_links?.[p.dispensary] || "";
            dispMap.set(p.dispensary, { count: 1, website });
          }
        }
        if (s.brand) {
          const existing = brandMap.get(s.brand);
          if (existing) {
            existing.count++;
          } else {
            brandMap.set(s.brand, { count: 1 });
          }
        }
      }

      const dispensaries: CatalogDispensary[] = Array.from(dispMap.entries())
        .map(([name, data]) => ({
          name,
          address: "",
          city: "",
          lat: 0,
          lng: 0,
          brand: "",
          phone: "",
          website: data.website,
          rating: "",
          strain_count: data.count,
        }))
        .sort((a, b) => b.strain_count - a.strain_count);

      const brands: CatalogBrand[] = Array.from(brandMap.entries())
        .map(([name, data]) => ({
          name,
          strain_count: data.count,
        }))
        .sort((a, b) => b.strain_count - a.strain_count);

      const catalog: Catalog = {
        metadata: {
          version: "8.0",
          generated: new Date().toISOString().split("T")[0],
          total_strains: strains.length,
          total_dispensaries: dispensaries.length,
          total_brands: brands.length,
          data_sources: [
            "Weedmaps",
            "Leafly",
            "Dispensary Websites",
            "MCA Registry",
          ],
          validation_score: 99.8,
        },
        strains,
        dispensaries,
        brands,
      };

      catalogCache = catalog;
      return catalog;
    });

  return loadingPromise;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(catalogCache);
  const [loading, setLoading] = useState(!catalogCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogCache) {
      setCatalog(catalogCache);
      setLoading(false);
      return;
    }

    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { catalog, loading, error };
}

export function useStrains(options?: {
  brand?: string;
  type?: string;
  search?: string;
  dispensary?: string;
  sortBy?:
    | "price_asc"
    | "price_desc"
    | "name"
    | "savings"
    | "dispensary_count"
    | "grade";
  limit?: number;
}) {
  const { catalog, loading, error } = useCatalog();

  const strains = useMemo(() => {
    if (!catalog) return [];
    let result = [...catalog.strains];

    if (options?.brand) {
      result = result.filter(
        (s) => s.brand.toLowerCase() === options.brand!.toLowerCase()
      );
    }

    if (options?.type) {
      result = result.filter(
        (s) => s.type.toLowerCase() === options.type!.toLowerCase()
      );
    }

    if (options?.dispensary) {
      result = result.filter(
        (s) =>
          s.dispensaries.some(
            (d) => d.toLowerCase() === options.dispensary!.toLowerCase()
          ) ||
          s.prices.some(
            (p) =>
              p.dispensary.toLowerCase() === options.dispensary!.toLowerCase()
          )
      );
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          (s.terpenes || []).some((t) => t.toLowerCase().includes(q)) ||
          (s.effects || []).some((e) => e.toLowerCase().includes(q)) ||
          (s.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
          (s.genetics || "").toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (options?.sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_avg ?? 0) - (a.price_avg ?? 0));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "savings":
        result.sort((a, b) => {
          const savA =
            a.price_max && a.price_min ? a.price_max - a.price_min : 0;
          const savB =
            b.price_max && b.price_min ? b.price_max - b.price_min : 0;
          return savB - savA;
        });
        break;
      case "dispensary_count":
        result.sort(
          (a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0)
        );
        break;
      case "grade":
        const gradeOrder = { A: 0, B: 1, C: 2 };
        result.sort(
          (a, b) =>
            (gradeOrder[a.grade] ?? 2) - (gradeOrder[b.grade] ?? 2)
        );
        break;
      default:
        result.sort(
          (a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0)
        );
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }, [
    catalog,
    options?.brand,
    options?.type,
    options?.search,
    options?.dispensary,
    options?.sortBy,
    options?.limit,
  ]);

  return { strains, loading, error, total: catalog?.strains.length ?? 0 };
}

export function useCatalogStats() {
  const { catalog, loading } = useCatalog();

  const stats = useMemo(() => {
    if (!catalog) {
      return {
        totalStrains: 0,
        totalDispensaries: 0,
        totalBrands: 0,
        avgPrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        lastUpdated: "",
        validationScore: 0,
      };
    }

    const pricesAll = catalog.strains
      .filter((s) => s.price_avg)
      .map((s) => s.price_avg!);

    return {
      totalStrains: catalog.metadata.total_strains,
      totalDispensaries: catalog.metadata.total_dispensaries,
      totalBrands: catalog.metadata.total_brands,
      avgPrice: pricesAll.length
        ? Math.round(
            (pricesAll.reduce((a, b) => a + b, 0) / pricesAll.length) * 100
          ) / 100
        : 0,
      lowestPrice: pricesAll.length ? Math.min(...pricesAll) : 0,
      highestPrice: pricesAll.length ? Math.max(...pricesAll) : 0,
      lastUpdated: catalog.metadata.generated,
      validationScore: catalog.metadata.validation_score,
    };
  }, [catalog]);

  return { stats, loading };
}

```

---

## 11. `client/src/hooks/useComposition.ts`

**Lines:** 82

```typescript
import { useRef } from "react";
import { usePersistFn } from "./usePersistFn";

export interface UseCompositionReturn<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onCompositionStart: React.CompositionEventHandler<T>;
  onCompositionEnd: React.CompositionEventHandler<T>;
  onKeyDown: React.KeyboardEventHandler<T>;
  isComposing: () => boolean;
}

export interface UseCompositionOptions<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onKeyDown?: React.KeyboardEventHandler<T>;
  onCompositionStart?: React.CompositionEventHandler<T>;
  onCompositionEnd?: React.CompositionEventHandler<T>;
}

type TimerResponse = ReturnType<typeof setTimeout>;

export function useComposition<
  T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
>(options: UseCompositionOptions<T> = {}): UseCompositionReturn<T> {
  const {
    onKeyDown: originalOnKeyDown,
    onCompositionStart: originalOnCompositionStart,
    onCompositionEnd: originalOnCompositionEnd,
  } = options;

  const c = useRef(false);
  const timer = useRef<TimerResponse | null>(null);
  const timer2 = useRef<TimerResponse | null>(null);

  const onCompositionStart = usePersistFn((e: React.CompositionEvent<T>) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (timer2.current) {
      clearTimeout(timer2.current);
      timer2.current = null;
    }
    c.current = true;
    originalOnCompositionStart?.(e);
  });

  const onCompositionEnd = usePersistFn((e: React.CompositionEvent<T>) => {
    // 使用两层 setTimeout 来处理 Safari 浏览器中 compositionEnd 先于 onKeyDown 触发的问题
    timer.current = setTimeout(() => {
      timer2.current = setTimeout(() => {
        c.current = false;
      });
    });
    originalOnCompositionEnd?.(e);
  });

  const onKeyDown = usePersistFn((e: React.KeyboardEvent<T>) => {
    // 在 composition 状态下，阻止 ESC 和 Enter（非 shift+Enter）事件的冒泡
    if (
      c.current &&
      (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey))
    ) {
      e.stopPropagation();
      return;
    }
    originalOnKeyDown?.(e);
  });

  const isComposing = usePersistFn(() => {
    return c.current;
  });

  return {
    onCompositionStart,
    onCompositionEnd,
    onKeyDown,
    isComposing,
  };
}

```

---

## 12. `client/src/hooks/useDispensaryDirectory.ts`

**Lines:** 108

```typescript
/**
 * StrainScout MD — Dispensary Directory Hook
 * Loads the enriched dispensary directory with geocoded coordinates,
 * contact info, ratings, and strain counts from CDN.
 */
import { useState, useEffect } from "react";

const DIRECTORY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/dispensary_directory.min_1575d3ca.json";

export interface DirectoryDispensary {
  id: number;
  name: string;
  brand: string;
  address: string;
  city: string;
  state_zip: string;
  full_address: string;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  google_rating: string;
  operational_status: string;
  strain_count: number;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  quality_grade: string;
  mca_verified: string;
  gmaps_verified: string;
  // Computed at runtime
  distance?: number;
  driveTime?: string; // e.g. "12 min"
  driveDistance?: string; // e.g. "5.3 mi"
}

let directoryCache: DirectoryDispensary[] | null = null;
let directoryPromise: Promise<DirectoryDispensary[]> | null = null;

async function fetchDirectory(): Promise<DirectoryDispensary[]> {
  if (directoryCache) return directoryCache;
  if (directoryPromise) return directoryPromise;

  directoryPromise = fetch(DIRECTORY_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load directory: ${res.status}`);
      return res.json();
    })
    .then((data: DirectoryDispensary[]) => {
      directoryCache = data;
      return data;
    });

  return directoryPromise;
}

export function useDispensaryDirectory() {
  const [dispensaries, setDispensaries] = useState<DirectoryDispensary[]>(
    directoryCache || []
  );
  const [loading, setLoading] = useState(!directoryCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (directoryCache) {
      setDispensaries(directoryCache);
      setLoading(false);
      return;
    }

    fetchDirectory()
      .then((data) => {
        setDispensaries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { dispensaries, loading, error };
}

/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

```

---

## 13. `client/src/hooks/useDriveTime.ts`

**Lines:** 161

```typescript
/**
 * StrainScout MD — Drive Time Hook
 * Uses Google Maps Distance Matrix Service to compute drive times
 * from user's location to nearby dispensaries.
 * Batches requests (max 25 destinations per call) and caches results.
 */
import { useState, useCallback, useRef } from "react";
import type { DirectoryDispensary } from "./useDispensaryDirectory";

interface DriveTimeResult {
  dispensaryName: string;
  driveTime: string; // e.g. "12 min"
  driveDistance: string; // e.g. "5.3 mi"
  durationSeconds: number;
}

// Cache drive times to avoid repeated API calls
const driveTimeCache = new Map<string, DriveTimeResult>();

function getCacheKey(userLat: number, userLng: number, dispName: string): string {
  // Round to 3 decimals (~100m precision) for cache key stability
  return `${userLat.toFixed(3)},${userLng.toFixed(3)}->${dispName}`;
}

export function useDriveTime() {
  const [driveTimesMap, setDriveTimesMap] = useState<Map<string, DriveTimeResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  /**
   * Fetch drive times for a list of dispensaries from the user's location.
   * Only fetches for the nearest N dispensaries (by haversine) to limit API calls.
   */
  const fetchDriveTimes = useCallback(
    async (
      userLocation: { lat: number; lng: number },
      dispensaries: DirectoryDispensary[],
      maxDispensaries: number = 10
    ) => {
      if (!window.google?.maps) {
        setError("Google Maps not loaded");
        return;
      }

      abortRef.current = false;
      setLoading(true);
      setError(null);

      try {
        // Take the nearest N dispensaries (already sorted by distance in processedDispensaries)
        const nearest = dispensaries
          .filter((d) => d.lat && d.lng)
          .slice(0, maxDispensaries);

        if (nearest.length === 0) {
          setLoading(false);
          return;
        }

        // Check cache first
        const uncached: DirectoryDispensary[] = [];
        const cachedResults = new Map<string, DriveTimeResult>();

        for (const d of nearest) {
          const key = getCacheKey(userLocation.lat, userLocation.lng, d.name);
          const cached = driveTimeCache.get(key);
          if (cached) {
            cachedResults.set(d.name, cached);
          } else {
            uncached.push(d);
          }
        }

        // If all cached, just update state
        if (uncached.length === 0) {
          setDriveTimesMap(cachedResults);
          setLoading(false);
          return;
        }

        const service = new google.maps.DistanceMatrixService();
        const origin = new google.maps.LatLng(userLocation.lat, userLocation.lng);

        // Batch in groups of 25 (API limit)
        const batchSize = 25;
        const allResults = new Map<string, DriveTimeResult>(cachedResults);

        for (let i = 0; i < uncached.length; i += batchSize) {
          if (abortRef.current) break;

          const batch = uncached.slice(i, i + batchSize);
          const destinations = batch.map(
            (d) => new google.maps.LatLng(d.lat, d.lng)
          );

          try {
            const response = await new Promise<google.maps.DistanceMatrixResponse>(
              (resolve, reject) => {
                service.getDistanceMatrix(
                  {
                    origins: [origin],
                    destinations,
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.IMPERIAL,
                  },
                  (response, status) => {
                    if (status === "OK" && response) {
                      resolve(response);
                    } else {
                      reject(new Error(`Distance Matrix failed: ${status}`));
                    }
                  }
                );
              }
            );

            // Parse results
            const row = response.rows[0];
            if (row) {
              row.elements.forEach((element, idx) => {
                const disp = batch[idx];
                if (element.status === "OK") {
                  const result: DriveTimeResult = {
                    dispensaryName: disp.name,
                    driveTime: element.duration.text,
                    driveDistance: element.distance.text,
                    durationSeconds: element.duration.value,
                  };
                  allResults.set(disp.name, result);

                  // Cache it
                  const key = getCacheKey(userLocation.lat, userLocation.lng, disp.name);
                  driveTimeCache.set(key, result);
                }
              });
            }
          } catch (batchErr) {
            console.warn(`[DriveTime] Batch ${i} failed:`, batchErr);
          }
        }

        if (!abortRef.current) {
          setDriveTimesMap(allResults);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Drive time fetch failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { driveTimesMap, loading, error, fetchDriveTimes, abort };
}

```

---

## 14. `client/src/hooks/useEmailCapture.ts`

**Lines:** 168

```typescript
/*
 * StrainScout MD — Email Capture Hook
 * Posts signups to the tRPC backend (emailSignup.submit).
 * Falls back to localStorage when the API is unreachable.
 * Dismissal state always uses localStorage (no auth required).
 */

import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { trackEmailSignup } from "@/lib/analytics";

const STORAGE_KEY = "strainscout_email_signups";
const DISMISSED_KEY = "strainscout_email_dismissed";

export interface EmailSignup {
  email: string;
  source: string;
  strainId?: string;
  strainName?: string;
  timestamp: string;
}

/* ── localStorage helpers (fallback + dismissal) ── */

function getStoredSignups(): EmailSignup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeSignupLocally(signup: EmailSignup) {
  try {
    const existing = getStoredSignups();
    existing.push(signup);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage not available
  }
}

function getDismissed(source: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {};
    const ts = dismissed[source];
    if (!ts) return false;
    return Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function setDismissed(source: string) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {};
    dismissed[source] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  } catch {
    // localStorage not available
  }
}

export function hasSignedUp(source?: string): boolean {
  const signups = getStoredSignups();
  if (!source) return signups.length > 0;
  return signups.some((s) => s.source === source);
}

/* ── Main hook ── */

type EmailSource = "footer" | "deal_digest" | "price_alert" | "compare_inline";

export function useEmailCapture(source: EmailSource) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const submitMutation = trpc.emailSignup.submit.useMutation();

  useEffect(() => {
    setAlreadySignedUp(hasSignedUp(source));
    setIsDismissed(getDismissed(source));
  }, [source]);

  const validateEmail = useCallback((e: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, []);

  const submit = useCallback(
    async (opts?: { strainId?: string; strainName?: string }) => {
      setErrorMsg("");

      if (!email.trim()) {
        setErrorMsg("Please enter your email address.");
        setStatus("error");
        return false;
      }

      if (!validateEmail(email)) {
        setErrorMsg("Please enter a valid email address.");
        setStatus("error");
        return false;
      }

      setStatus("submitting");

      const normalizedEmail = email.trim().toLowerCase();
      const signupData = {
        email: normalizedEmail,
        source,
        strainId: opts?.strainId,
        strainName: opts?.strainName,
      };

      try {
        // Try the backend API first
        await submitMutation.mutateAsync(signupData);
      } catch {
        // Fallback: store locally if API is unreachable
        console.warn("[EmailCapture] API unreachable, storing locally");
      }

      // Always store locally too (for hasSignedUp checks and offline resilience)
      storeSignupLocally({
        ...signupData,
        timestamp: new Date().toISOString(),
      });

      // Analytics: track email signup
      trackEmailSignup(source, opts?.strainId, opts?.strainName);

      setStatus("success");
      setAlreadySignedUp(true);
      return true;
    },
    [email, source, validateEmail, submitMutation]
  );

  const dismiss = useCallback(() => {
    setDismissed(source);
    setIsDismissed(true);
  }, [source]);

  const reset = useCallback(() => {
    setEmail("");
    setStatus("idle");
    setErrorMsg("");
  }, []);

  return {
    email,
    setEmail,
    status,
    errorMsg,
    alreadySignedUp,
    isDismissed,
    submit,
    dismiss,
    reset,
  };
}

```

---

## 15. `client/src/hooks/useMobile.tsx`

**Lines:** 22

```tsx
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

```

---

## 16. `client/src/hooks/usePersistFn.ts`

**Lines:** 21

```typescript
import { useRef } from "react";

type noop = (...args: any[]) => any;

/**
 * usePersistFn instead of useCallback to reduce cognitive load
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}

```

---
