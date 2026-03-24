"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle, ArrowLeft, Sparkles, TrendingDown, Clock } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

export default function AlertsPage() {
  const { setEmail, status, errorMsg, alreadySignedUp, submit } = useEmailCapture("price_alert");
  const [localEmail, setLocalEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmail(localEmail);
    await submit();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Price Alerts</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Get notified when cannabis prices drop at Maryland dispensaries. Set your target price
            and we&apos;ll email you when it&apos;s hit.
          </p>
        </div>
      </section>

      <div className="container py-12 sm:py-16 max-w-2xl">
        {alreadySignedUp || status === "success" ? (
          /* ── Success state ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-savings/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-savings" />
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-2">You&apos;re on the list</h2>
            <p className="text-muted-foreground mb-8">
              We&apos;ll notify you when strain prices drop across Maryland dispensaries.
              Price alerts launch soon.
            </p>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
            >
              Browse Strains Now
            </Link>
          </div>
        ) : (
          /* ── Coming soon + signup state ── */
          <>
            {/* Feature preview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-card border border-border/30 rounded-xl p-5">
                <TrendingDown className="w-6 h-6 text-savings mb-3" />
                <h3 className="font-medium text-foreground text-sm mb-1">Price Drop Alerts</h3>
                <p className="text-xs text-muted-foreground">
                  Get notified the moment a strain hits your target price at any Maryland dispensary.
                </p>
              </div>
              <div className="bg-card border border-border/30 rounded-xl p-5">
                <Bell className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-medium text-foreground text-sm mb-1">Weekly Digest</h3>
                <p className="text-xs text-muted-foreground">
                  Every Tuesday — the biggest price drops across all dispensaries in one email.
                </p>
              </div>
              <div className="bg-card border border-border/30 rounded-xl p-5">
                <Sparkles className="w-6 h-6 text-amber-400 mb-3" />
                <h3 className="font-medium text-foreground text-sm mb-1">New Strains</h3>
                <p className="text-xs text-muted-foreground">
                  Be first to know when a strain you love shows up at a new dispensary.
                </p>
              </div>
            </div>

            {/* Signup form */}
            <div className="bg-card border border-border/30 rounded-xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Coming Soon</span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-2">
                Be first when alerts launch
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we&apos;ll notify you the moment price alerts go live.
                No spam — unsubscribe any time.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  required
                  className="flex-1 bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="px-6 py-3 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover transition-colors shadow-cta whitespace-nowrap disabled:opacity-60"
                >
                  {status === "submitting" ? "Signing up..." : "Notify Me"}
                </button>
              </form>

              {errorMsg && (
                <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Want to track prices now?{" "}
                <Link href="/compare" className="text-primary hover:underline">
                  Browse strains on the compare page →
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
