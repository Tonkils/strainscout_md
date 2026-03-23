/*
 * StrainScout MD — Price Alert Signup Component
 * Botanical Data Lab design — Dual-tone CTA: Amber = conversion
 * Placed on Strain Detail pages below prices section
 * High-intent capture: user is actively viewing strain prices
 */

import { Bell, CheckCircle, Loader2, TrendingDown } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";
import { toast } from "sonner";

interface PriceAlertSignupProps {
  strainId: string;
  strainName: string;
  currentLowest?: number | null;
}

export default function PriceAlertSignup({ strainId, strainName, currentLowest }: PriceAlertSignupProps) {
  const {
    email,
    setEmail,
    status,
    errorMsg,
    alreadySignedUp,
    submit,
  } = useEmailCapture("price_alert");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit({ strainId, strainName });
    if (ok) {
      toast.success("Price alert set!", {
        description: `We'll email you when ${strainName} drops in price.`,
      });
    }
  };

  if (alreadySignedUp || status === "success") {
    return (
      <div className="bg-card border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-savings flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-savings" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground mb-0.5">Price Alert Active</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you when <span className="text-foreground font-medium">{strainName}</span> drops
              {currentLowest ? ` below $${currentLowest}` : " in price"} at any Maryland dispensary.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-card via-card to-emerald-950/40 border border-border/30 rounded-lg overflow-hidden shadow-cta-lg">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-cta via-amber-400 to-cta" />

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          {/* Icon + Copy */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cta-glow flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-cta" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-foreground leading-tight">
                  Get Notified When This Strain Drops
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed ml-[52px] sm:ml-[52px]">
              {currentLowest ? (
                <>
                  <span className="text-foreground font-medium">{strainName}</span> starts at{" "}
                  <span className="font-price text-savings font-semibold">${currentLowest}</span> today.
                  We'll email you the moment it goes lower at any Maryland dispensary.
                </>
              ) : (
                <>
                  We'll email you when <span className="text-foreground font-medium">{strainName}</span>{" "}
                  drops in price at any Maryland dispensary.
                </>
              )}
            </p>

            {/* Value props */}
            <div className="flex flex-wrap gap-3 mt-3 ml-[52px]">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <TrendingDown className="w-3 h-3 text-savings" />
                Price drop alerts
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Bell className="w-3 h-3 text-cta" />
                New dispensary availability
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="sm:w-72 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:shadow-cta transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full px-5 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover active:opacity-90 transition-all shadow-cta disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Set Price Alert
                  </>
                )}
              </button>
              {errorMsg && (
                <p className="text-xs text-red-400 pl-1">{errorMsg}</p>
              )}
              <p className="text-[11px] text-muted-foreground/60 text-center">
                Free &middot; No spam &middot; Unsubscribe anytime
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
