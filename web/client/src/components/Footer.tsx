/*
 * StrainScout MD — Footer Component
 * Botanical Data Lab design — Dual-tone CTA: Amber = conversion
 * Mobile-first: 2-column grid on mobile, 4-column on desktop
 * Includes persistent email capture for weekly deal digest
 */

import { Link } from "wouter";
import { Leaf, Mail, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";
import { toast } from "sonner";

export default function Footer() {
  const {
    email,
    setEmail,
    status,
    errorMsg,
    alreadySignedUp,
    submit,
  } = useEmailCapture("footer");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit();
    if (ok) {
      toast.success("You're in!", {
        description: "You'll get Maryland's best cannabis deals every Tuesday.",
      });
    }
  };

  return (
    <footer className="border-t border-border/30 bg-card/50 mt-8 sm:mt-12">
      {/* Email Capture Banner */}
      <div className="border-b border-border/30 bg-gradient-to-r from-emerald-950/80 via-card to-emerald-950/80">
        <div className="container py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1 max-w-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cta-glow flex items-center justify-center">
                  <Mail className="w-4 h-4 text-cta" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-foreground">
                  Maryland's Best Deals, Every Tuesday
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Join savvy Maryland cannabis shoppers. Get weekly price drops, new strain alerts, and dispensary deals — free, no spam.
              </p>
            </div>

            <div className="flex-1 max-w-md">
              {alreadySignedUp || status === "success" ? (
                <div className="flex items-center gap-3 px-5 py-4 rounded-lg bg-savings border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-savings shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">You're on the list!</p>
                    <p className="text-xs text-muted-foreground">Deals arrive every Tuesday morning.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === "submitting"}
                        className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:shadow-cta transition-all disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover active:opacity-90 transition-all shadow-cta disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                    >
                      {status === "submitting" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Get Free Alerts
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-red-400 pl-1">{errorMsg}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 pl-1">
                    Unsubscribe anytime. We respect your privacy.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="container py-8 sm:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg text-foreground">StrainScout MD</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Find the cheapest cannabis in Maryland. Compare prices across 102 dispensaries.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Explore</h4>
            <div className="space-y-2.5">
              <Link href="/" className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Find Deals</Link>
              <Link href="/map" className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Map View</Link>
              <Link href="/compare" className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Compare Strains</Link>
              <Link href="/top-value" className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Top Value</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Resources</h4>
            <div className="space-y-2.5">
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">About Us</button>
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">How It Works</button>
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Data Sources</button>
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Contact</button>
              <Link href="/partner" className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Partner Portal</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Legal</h4>
            <div className="space-y-2.5">
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Privacy Policy</button>
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Terms of Service</button>
              <button onClick={() => toast("Feature coming soon")} className="block text-sm text-foreground/80 hover:text-primary active:text-primary transition-colors py-0.5">Disclaimer</button>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground text-center sm:text-left">
            &copy; {new Date().getFullYear()} StrainScout MD. All rights reserved. Not affiliated with any dispensary.
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground text-center sm:text-left">
            Prices updated weekly. Always verify with the dispensary before purchasing.
          </p>
        </div>
      </div>
    </footer>
  );
}
