"use client";

import { Mail, CheckCircle, X, TrendingDown, Bell, Loader2 } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

interface CompareInlineCTAProps {
  activeFilter: string;
  totalResults: number;
}

export default function CompareInlineCTA({ activeFilter, totalResults }: CompareInlineCTAProps) {
  const { email, setEmail, status, errorMsg, alreadySignedUp, isDismissed, submit, dismiss } =
    useEmailCapture("compare_inline");

  if (isDismissed || alreadySignedUp) {
    if (alreadySignedUp) {
      return (
        <div className="col-span-full flex items-center justify-center gap-2 py-3 text-sm text-primary/80">
          <CheckCircle className="w-4 h-4" />
          <span>You&apos;re subscribed to weekly price comparisons</span>
        </div>
      );
    }
    return null;
  }

  const filterLabel = activeFilter === "All" ? "cannabis" : activeFilter.toLowerCase();
  const headline = activeFilter === "All"
    ? "Get Weekly Price Drops in Your Inbox"
    : `Comparing ${activeFilter} strains? Get weekly ${activeFilter} deals`;
  const subtext = activeFilter === "All"
    ? `We track prices across ${totalResults.toLocaleString()} strains every week. Get the biggest drops delivered free.`
    : `We'll send you the best ${filterLabel} price drops from Maryland dispensaries — every Tuesday, free.`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="col-span-full my-2">
      <div className="relative overflow-hidden rounded-xl border border-cta/30 bg-gradient-to-r from-cta/[0.06] via-card to-cta/[0.06]">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          {status === "success" ? (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">You&apos;re in!</p>
                <p className="text-xs text-muted-foreground">Weekly {filterLabel} price drops will hit your inbox every Tuesday.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-cta/15 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-cta" />
                  </div>
                  <h3 className="font-serif text-base sm:text-lg text-foreground leading-tight">{headline}</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-10">{subtext}</p>
                <div className="flex items-center gap-4 mt-2 pl-10">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <TrendingDown className="w-3 h-3 text-primary" /> Price drops
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Bell className="w-3 h-3 text-cta" /> New strains
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2 lg:w-auto lg:shrink-0">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full sm:w-56 bg-card border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 transition-all"
                  />
                  {errorMsg && <p className="absolute -bottom-5 left-0 text-[10px] text-red-400">{errorMsg}</p>}
                </div>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="px-5 py-2.5 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover transition-colors shadow-cta disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                >
                  {status === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Alerts"}
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-cta/40 to-transparent" />
      </div>
    </div>
  );
}
