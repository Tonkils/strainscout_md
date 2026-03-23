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
