"use client";

import { useState, useEffect } from "react";
import { Mail, CheckCircle, Loader2, X } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

const POPUP_SEEN_KEY = "strainscout_email_popup_seen";

export default function EmailPopup({
  show = false,
  delayMs = 2000,
}: {
  show?: boolean;
  delayMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const { email, setEmail, status, errorMsg, alreadySignedUp, submit } =
    useEmailCapture("popup");

  useEffect(() => {
    if (!show) return;
    if (alreadySignedUp) return;
    try {
      if (localStorage.getItem(POPUP_SEEN_KEY) === "true") return;
    } catch { /* localStorage unavailable */ }
    const timer = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(timer);
  }, [show, delayMs, alreadySignedUp]);

  const handleDismiss = () => {
    try { localStorage.setItem(POPUP_SEEN_KEY, "true"); } catch { /* noop */ }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit();
    if (ok) setTimeout(handleDismiss, 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      <div className="relative bg-background border border-border/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <button
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {status === "success" || alreadySignedUp ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-savings mx-auto mb-3" />
            <p className="font-serif text-lg text-foreground">You&apos;re in!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Best deals delivered every Tuesday.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cta/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-cta" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-foreground leading-tight">
                  Get Maryland&apos;s best deals every Tuesday
                </h3>
                <p className="text-xs text-muted-foreground">Free. Unsubscribe anytime.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
              />
              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-3 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Get Free Weekly Deals
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
