"use client";

import { useState, useEffect, useCallback } from "react";
import { X, TrendingDown, Mail, Loader2, CheckCircle } from "lucide-react";
import { useEmailCapture, hasSignedUp } from "@/hooks/useEmailCapture";
import { hasConsent } from "@/lib/cookies";

const SESSION_KEY = "strainscout_exit_shown";

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const { email, setEmail, status, errorMsg, submit } = useEmailCapture("deal_digest");

  const close = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    // Don't run on mobile
    if (window.innerWidth < 768) return;

    // Already shown this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Already signed up for any source
    if (hasSignedUp()) return;

    let ready = false;
    const readyTimer = setTimeout(() => {
      ready = true;
    }, 10_000);

    const handleMouseLeave = (e: MouseEvent) => {
      if (!ready) return;
      if (e.clientY >= 0) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
      if (hasSignedUp()) return;

      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    };

    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(readyTimer);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Auto-close after success
  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(close, 2000);
      return () => clearTimeout(t);
    }
  }, [status, close]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
        animateIn ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={`relative w-full max-w-md bg-card border border-border/30 rounded-2xl shadow-2xl transition-all duration-200 ${
          animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {status === "success" ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-1">
                You&apos;re in!
              </h3>
              <p className="text-sm text-muted-foreground">
                Deals arrive every Tuesday.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                  <TrendingDown className="w-7 h-7 text-emerald-400" />
                </div>
                <h2 className="font-serif text-2xl text-foreground mb-2">
                  Wait — Don&apos;t Miss This Week&apos;s Deals
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Maryland prices change every week. Get the biggest drops delivered free.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "submitting"}
                  className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-cta/50 transition-all disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full px-5 py-3.5 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === "submitting" ? (
                    <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Get Free Deals
                    </>
                  )}
                </button>
                {errorMsg && <p className="text-xs text-red-400 pl-1">{errorMsg}</p>}
              </form>

              <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
                Join 500+ Maryland cannabis shoppers. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
