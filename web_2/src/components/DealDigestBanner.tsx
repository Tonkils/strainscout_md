"use client";

import { Mail, CheckCircle, Loader2, TrendingDown, Zap, Shield } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

interface DealDigestBannerProps {
  totalStrains: number;
  totalDispensaries: number;
}

export default function DealDigestBanner({ totalStrains, totalDispensaries }: DealDigestBannerProps) {
  const { email, setEmail, status, errorMsg, alreadySignedUp, isDismissed, submit, dismiss } =
    useEmailCapture("deal_digest");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  if (isDismissed && !alreadySignedUp && status !== "success") return null;

  return (
    <section className="container py-6 sm:py-8">
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-emerald-950/60 via-card to-emerald-950/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cta/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          {alreadySignedUp || status === "success" ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-savings flex items-center justify-center shrink-0">
                <CheckCircle className="w-7 h-7 text-savings" />
              </div>
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-foreground mb-1">
                  You&apos;re Getting Maryland&apos;s Best Deals
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your personalized deal digest arrives every Tuesday morning.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cta-glow flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5 text-cta" />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl text-foreground leading-tight">
                    Save $15–40 Per 8th — Every Week
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 ml-[48px]">
                  We track <span className="font-price text-primary font-medium">{totalStrains.toLocaleString()}</span> strains
                  across <span className="font-price text-primary font-medium">{totalDispensaries}</span> dispensaries
                  so you don&apos;t have to. Get the biggest price drops delivered free every Tuesday.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 ml-[48px]">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5 text-cta" />Weekly price drops
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-cta" />New strain alerts
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-cta" />No spam, ever
                  </span>
                </div>
              </div>

              <div className="lg:w-80 shrink-0">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-cta/50 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full px-5 py-3.5 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {status === "submitting" ? (
                      <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Mail className="w-4 h-4" />Get Free Weekly Deals</>
                    )}
                  </button>
                  {errorMsg && <p className="text-xs text-red-400 pl-1">{errorMsg}</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground/60 pl-1">Unsubscribe anytime.</p>
                    <button type="button" onClick={dismiss} className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      Dismiss
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
