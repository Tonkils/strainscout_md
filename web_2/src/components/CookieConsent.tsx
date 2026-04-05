"use client";

import { useState, useEffect, useCallback } from "react";
import { Cookie, X, Shield, ChevronDown, ChevronUp } from "lucide-react";
import {
  getConsent,
  setConsent,
  hasRespondedToConsent,
  captureAttribution,
  fetchGeoData,
  hasConsent,
} from "@/lib/cookies";

interface CategoryToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function CategoryToggle({ label, description, checked, disabled, onChange }: CategoryToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={[
            "w-10 h-5 rounded-full transition-colors",
            disabled
              ? "bg-emerald-700/60 cursor-not-allowed"
              : "bg-border/50 peer-checked:bg-cta peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50",
          ].join(" ")}
        />
        <div
          className={[
            "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </label>
    </div>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (hasRespondedToConsent()) return;
    // Small delay so the banner animates in
    const timer = setTimeout(() => {
      setVisible(true);
      setMounted(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = useCallback(
    (acceptAnalytics: boolean, acceptMarketing: boolean) => {
      setConsent({ analytics: acceptAnalytics, marketing: acceptMarketing });
      captureAttribution();

      if (acceptAnalytics) {
        fetchGeoData().catch(() => {});
      }

      window.dispatchEvent(new Event("consent-updated"));
      setVisible(false);
    },
    [],
  );

  const handleAcceptAll = useCallback(() => {
    handleAccept(true, true);
  }, [handleAccept]);

  const handleEssentialOnly = useCallback(() => {
    handleAccept(false, false);
  }, [handleAccept]);

  const handleSaveCustom = useCallback(() => {
    handleAccept(analytics, marketing);
  }, [handleAccept, analytics, marketing]);

  // Don't render anything server-side or if user already responded
  if (!mounted && !visible) return null;

  return (
    <div
      className={[
        "fixed bottom-0 inset-x-0 z-50 transition-transform duration-500 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="bg-card/95 backdrop-blur-md border-t border-border/30">
        <div className="container max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* Header row with close button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/30 flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-cta" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-base sm:text-lg text-foreground leading-tight">
                  We use cookies to improve your experience
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  We use cookies to personalize deals for your area, track which features you use,
                  and remember your preferences.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 p-1 -m-1"
              aria-label="Dismiss cookie banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 ml-0 sm:ml-[52px]">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-5 py-2.5 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta-lg"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background/50 transition-all"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Customize
              {showCustomize ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Customize panel */}
          <div
            className={[
              "overflow-hidden transition-all duration-300 ease-in-out ml-0 sm:ml-[52px]",
              showCustomize ? "max-h-80 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0",
            ].join(" ")}
          >
            <div className="rounded-lg border border-border/30 bg-background/40 px-4 divide-y divide-border/20">
              <CategoryToggle
                label="Essential"
                description="Required for the site to function. Cannot be disabled."
                checked={true}
                disabled={true}
                onChange={() => {}}
              />
              <CategoryToggle
                label="Analytics"
                description="GA4 and PostHog — helps us understand which features you use."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryToggle
                label="Marketing"
                description="Future use — ad personalization and retargeting pixels."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveCustom}
              className="mt-3 px-5 py-2.5 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta-lg"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
