"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "strainscout_email_signups";
const DISMISSED_KEY = "strainscout_email_dismissed";
const UTM_COOKIE_KEY = "strainscout_utm";

function getUtmParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  // Check URL params first (fresh visit), then fall back to stored cookie
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  if (source) {
    const utm = {
      utm_source: source || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
    };
    // Store for 30 days so it persists across pages
    try {
      document.cookie = `${UTM_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(utm))};max-age=${30 * 86400};path=/;SameSite=Lax`;
    } catch { /* cookie unavailable */ }
    return utm;
  }
  // Fall back to stored UTM cookie
  try {
    const match = document.cookie.match(new RegExp(`${UTM_COOKIE_KEY}=([^;]+)`));
    if (match) return JSON.parse(decodeURIComponent(match[1]));
  } catch { /* parse error */ }
  return {};
}

function getAttributionData() {
  const utm = getUtmParams();
  return {
    ...utm,
    referrer_url: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    landing_page_url: typeof window !== "undefined" ? window.location.pathname : undefined,
  };
}

export interface EmailSignup {
  email: string;
  source: string;
  strainId?: string;
  strainName?: string;
  timestamp: string;
}

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
  } catch { /* localStorage unavailable */ }
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

function setDismissedStorage(source: string) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {};
    dismissed[source] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  } catch { /* localStorage unavailable */ }
}

export function hasSignedUp(source?: string): boolean {
  const signups = getStoredSignups();
  if (!source) return signups.length > 0;
  return signups.some((s) => s.source === source);
}

type EmailSource = "footer" | "deal_digest" | "price_alert" | "compare_inline";

export function useEmailCapture(source: EmailSource) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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
      const normalized = email.trim().toLowerCase();
      const attribution = getAttributionData();
      try {
        await supabase.from("email_signups").insert({
          email: normalized,
          source,
          strain_id: opts?.strainId ?? null,
          strain_name: opts?.strainName ?? null,
          utm_source: attribution.utm_source ?? null,
          utm_medium: attribution.utm_medium ?? null,
          utm_campaign: attribution.utm_campaign ?? null,
          referrer_url: attribution.referrer_url ?? null,
          landing_page_url: attribution.landing_page_url ?? null,
        });
      } catch { /* network failure — still save locally */ }
      storeSignupLocally({
        email: normalized,
        source,
        strainId: opts?.strainId,
        strainName: opts?.strainName,
        timestamp: new Date().toISOString(),
      });
      setStatus("success");
      setAlreadySignedUp(true);
      return true;
    },
    [email, source, validateEmail]
  );

  const dismiss = useCallback(() => {
    setDismissedStorage(source);
    setIsDismissed(true);
  }, [source]);

  const reset = useCallback(() => {
    setEmail("");
    setStatus("idle");
    setErrorMsg("");
  }, []);

  return { email, setEmail, status, errorMsg, alreadySignedUp, isDismissed, submit, dismiss, reset };
}
