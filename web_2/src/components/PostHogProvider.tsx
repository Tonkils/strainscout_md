"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasConsent } from "@/lib/cookies";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph && hasConsent("analytics")) {
      let url = window.origin + pathname;
      if (searchParams.toString()) url = url + "?" + searchParams.toString();
      ph.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    function initPostHog() {
      if (!key) return;
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: false, // handled manually above
        capture_pageleave: true,
      });
    }

    if (hasConsent("analytics")) {
      initPostHog();
    }

    function handleConsentUpdated() {
      if (hasConsent("analytics")) {
        if (!posthog.__loaded) {
          initPostHog();
        }
      } else {
        if (posthog.__loaded) {
          posthog.opt_out_capturing();
        }
      }
    }

    window.addEventListener("consent-updated", handleConsentUpdated);
    return () => {
      window.removeEventListener("consent-updated", handleConsentUpdated);
    };
  }, []);

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}
