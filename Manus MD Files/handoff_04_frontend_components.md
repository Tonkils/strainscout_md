# StrainScout MD — Frontend Components

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> All reusable UI components: navigation, footer, cards, badges, voting, comments, modals, error boundary.

---

## Files in This Document

1. `client/src/components/Navbar.tsx` (209 lines)
2. `client/src/components/Footer.tsx` (163 lines)
3. `client/src/components/DealCard.tsx` (91 lines)
4. `client/src/components/DealDigestBanner.tsx` (151 lines)
5. `client/src/components/PriceAlertSignup.tsx` (142 lines)
6. `client/src/components/PriceAlertModal.tsx` (232 lines)
7. `client/src/components/StrainVoting.tsx` (342 lines)
8. `client/src/components/StrainComments.tsx` (198 lines)
9. `client/src/components/PartnerVerifiedBadge.tsx` (72 lines)
10. `client/src/components/VerificationBadge.tsx` (207 lines)
11. `client/src/components/CompareInlineCTA.tsx` (137 lines)
12. `client/src/components/SEO.tsx` (217 lines)
13. `client/src/components/ErrorBoundary.tsx` (63 lines)
14. `client/src/components/ManusDialog.tsx` (90 lines)
15. `client/src/components/Map.tsx` (156 lines)
16. `client/src/components/AIChatBox.tsx` (336 lines)
17. `client/src/components/DashboardLayout.tsx` (265 lines)
18. `client/src/components/DashboardLayoutSkeleton.tsx` (47 lines)

---

## 1. `client/src/components/Navbar.tsx`

**Lines:** 209

```tsx
/*
 * StrainScout MD — Navbar Component
 * Botanical Data Lab design
 * Mobile: hamburger menu with animated slide-down, 48px touch targets
 * Desktop: horizontal nav with search + account
 * 
 * Review fix (Sprint 11): Reduced nav items from 8 to 6 primary links.
 * Renamed "Find Deals" → "Home", "Deals" → "Price Drops" for clarity.
 * Grouped Compare Strains under main nav, Compare Dispensaries accessible from directory.
 */

import { Link, useLocation } from "wouter";
import { Search, Menu, X, Leaf, MapPin, GitCompareArrows, TrendingUp, Home, TrendingDown, Bell, BarChart3, Building2, Handshake } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/dispensaries", label: "Dispensaries", icon: Building2 },
  { href: "/deals", label: "Price Drops", icon: TrendingDown },
  { href: "/market", label: "Market", icon: BarChart3 },
];

const mobileExtraLinks = [
  { href: "/top-value", label: "Top Value", icon: TrendingUp },
  { href: "/alerts", label: "My Alerts", icon: Bell },
  { href: "/partner", label: "Partner Portal", icon: Handshake },
];

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header ref={menuRef} className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="container flex items-center justify-between h-14 sm:h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif text-lg sm:text-xl text-foreground tracking-tight">
            Strain<span className="text-primary">Scout</span>{" "}
            <span className="text-muted-foreground text-xs sm:text-sm font-sans font-light">MD</span>
          </span>
        </Link>

        {/* Desktop Nav — 6 primary links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                location === link.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions — Alerts + Search + Account */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/alerts"
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
              location === "/alerts"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="My Alerts"
          >
            <Bell className="w-4 h-4" />
          </Link>
          <Link
            href="/search"
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
          <Link
            href="/account"
            className="px-4 py-2 text-sm font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors"
          >
            Account
          </Link>
        </div>

        {/* Mobile Menu Button — 48x48 touch target */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden w-12 h-12 -mr-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-accent transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Nav — Animated slide-down with backdrop */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border/50 bg-background/98 backdrop-blur-xl">
          <div className="container py-3 space-y-1">
            {/* Primary nav links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-lg transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-foreground/80 hover:text-foreground active:bg-accent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {link.label}
                  {isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}

            {/* Divider + secondary links */}
            <div className="pt-2 mt-1 border-t border-border/30">
              {mobileExtraLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-foreground/80 hover:text-foreground active:bg-accent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {link.label}
                    {isActive && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
              <Link
                href="/account"
                className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-foreground/80 hover:text-foreground active:bg-accent rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
                Search & Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay when menu is open */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-[calc(3.5rem+1px)] bg-black/40 z-[-1]"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

```

---

## 2. `client/src/components/Footer.tsx`

**Lines:** 163

```tsx
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

```

---

## 3. `client/src/components/DealCard.tsx`

**Lines:** 91

```tsx
import { Link } from "wouter";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { MapPin, Beaker } from "lucide-react";

interface DealCardProps {
  strain: CatalogStrain;
}

export default function DealCard({ strain }: DealCardProps) {
  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const bestPrice = strain.prices.sort((a, b) => a.price - b.price)[0];
  const savings = strain.price_max && strain.price_min && strain.price_max > strain.price_min
    ? Math.round(((strain.price_max - strain.price_min) / strain.price_max) * 100)
    : 0;

  return (
    <Link href={`/strain/${strain.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        {/* Card Content */}
        <div className="p-5">
          {/* Type + Brand */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              strain.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
              strain.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
              "bg-emerald-500/15 text-emerald-400"
            }`}>
              {typeLabel}
            </span>
            {strain.brand && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{strain.brand}</span>
            )}
            {strain.grade === "A" && (
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">★</span>
            )}
          </div>

          {/* Strain Name */}
          <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
            {strain.name}
          </h3>

          {/* THC + Terpenes */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            {strain.thc && <span>THC {strain.thc}</span>}
            {strain.terpenes.filter(t => t !== 'Not_Found').length > 0 && (
              <span className="flex items-center gap-1">
                <Beaker className="w-3 h-3" />
                {strain.terpenes.filter(t => t !== 'Not_Found').slice(0, 2).join(", ")}
              </span>
            )}
          </div>

          {/* Price Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</p>
              <p className="font-price text-2xl font-bold text-foreground">
                {strain.price_min != null ? `$${strain.price_min}` : "N/A"}
              </p>
            </div>
            <div className="text-right">
              {bestPrice && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs truncate max-w-[120px]">{bestPrice.dispensary}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {strain.dispensary_count ?? 0} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>

          {/* Price Spread Bar */}
          {strain.price_min != null && strain.price_max != null && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                <span className="font-price">${strain.price_min}</span>
                <span>Price Range</span>
                <span className="font-price">${strain.price_max}</span>
              </div>
              <div className="h-1.5 rounded-full price-bar opacity-60" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

```

---

## 4. `client/src/components/DealDigestBanner.tsx`

**Lines:** 151

```tsx
/*
 * StrainScout MD — Deal Digest Banner Component
 * Botanical Data Lab design — Dual-tone CTA: Amber = conversion
 * Full-width homepage banner offering weekly deal digest email
 * Positioned between hero and strain grid for maximum visibility
 */

import { Mail, CheckCircle, Loader2, TrendingDown, Zap, Shield } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";
import { toast } from "sonner";

interface DealDigestBannerProps {
  totalStrains: number;
  totalDispensaries: number;
}

export default function DealDigestBanner({ totalStrains, totalDispensaries }: DealDigestBannerProps) {
  const {
    email,
    setEmail,
    status,
    errorMsg,
    alreadySignedUp,
    submit,
    isDismissed,
    dismiss,
  } = useEmailCapture("deal_digest");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit();
    if (ok) {
      toast.success("You're in!", {
        description: "Your first deal digest arrives next Tuesday.",
      });
    }
  };

  // Don't show if dismissed or already signed up
  if (isDismissed && !alreadySignedUp && status !== "success") return null;

  return (
    <section className="container py-6 sm:py-8">
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-emerald-950/60 via-card to-emerald-950/40">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cta/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          {alreadySignedUp || status === "success" ? (
            /* Success state */
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-savings flex items-center justify-center shrink-0">
                <CheckCircle className="w-7 h-7 text-savings" />
              </div>
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-foreground mb-1">
                  You're Getting Maryland's Best Deals
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your personalized deal digest arrives every Tuesday morning. Browse strains below while you wait.
                </p>
              </div>
            </div>
          ) : (
            /* Capture state */
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
              {/* Left: Value proposition */}
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
                  so you don't have to. Get the biggest price drops delivered free every Tuesday.
                </p>

                {/* Trust signals */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 ml-[48px]">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5 text-cta" />
                    Weekly price drops
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-cta" />
                    New strain alerts
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-cta" />
                    No spam, ever
                  </span>
                </div>
              </div>

              {/* Right: Form */}
              <div className="lg:w-80 shrink-0">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:shadow-cta transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full px-5 py-3.5 bg-cta text-cta-foreground font-bold text-sm rounded-lg hover:bg-cta-hover active:opacity-90 transition-all shadow-cta-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
                  {errorMsg && (
                    <p className="text-xs text-red-400 pl-1">{errorMsg}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground/60 pl-1">
                      Unsubscribe anytime. We respect your privacy.
                    </p>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
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

```

---

## 5. `client/src/components/PriceAlertSignup.tsx`

**Lines:** 142

```tsx
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

```

---

## 6. `client/src/components/PriceAlertModal.tsx`

**Lines:** 232

```tsx
/**
 * PriceAlertModal — Modal for creating a price alert on a strain.
 * Pre-fills strain info, lets user set target price and optionally select a dispensary.
 * Requires login — shows login prompt if not authenticated.
 */
import { useState, useMemo } from "react";
import { Bell, DollarSign, Store, Loader2, AlertTriangle, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strainId: string;
  strainName: string;
  currentPrice?: number | null;
  dispensaries?: string[];
}

export default function PriceAlertModal({
  open,
  onOpenChange,
  strainId,
  strainName,
  currentPrice,
  dispensaries = [],
}: PriceAlertModalProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [targetPrice, setTargetPrice] = useState<string>(
    currentPrice ? String(Math.floor(currentPrice * 0.8)) : ""
  );
  const [selectedDispensary, setSelectedDispensary] = useState<string>("");

  const createAlert = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Price alert created!", {
        description: `We'll notify you when ${strainName} drops to $${targetPrice}${selectedDispensary ? ` at ${selectedDispensary}` : " at any dispensary"}.`,
      });
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      utils.alerts.hasAlert.invalidate({ strainId });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create alert", {
        description: error.message,
      });
    },
  });

  const priceNum = parseFloat(targetPrice);
  const isValidPrice = !isNaN(priceNum) && priceNum > 0;
  const isAboveCurrentPrice = currentPrice != null && priceNum >= currentPrice;

  const handleSubmit = () => {
    if (!isValidPrice) return;
    createAlert.mutate({
      strainId,
      strainName,
      targetPrice: priceNum,
      dispensary: selectedDispensary || null,
      currentPrice: currentPrice ?? undefined,
    });
  };

  // Suggested prices: 10%, 20%, 30% below current
  const suggestedPrices = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return [];
    return [
      { label: "10% off", price: Math.floor(currentPrice * 0.9) },
      { label: "20% off", price: Math.floor(currentPrice * 0.8) },
      { label: "30% off", price: Math.floor(currentPrice * 0.7) },
    ].filter((s) => s.price > 0);
  }, [currentPrice]);

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-cta" />
              Sign In Required
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a free account to set price alerts and get notified when strains drop in price.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <a
              href={getLoginUrl()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Set Alerts
            </a>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-cta" />
            Set Price Alert
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Get notified when <span className="text-foreground font-medium">{strainName}</span> drops to your target price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Current Price Display */}
          {currentPrice != null && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Current lowest price: </span>
                <span className="font-price font-bold text-savings">${currentPrice}</span>
              </div>
            </div>
          )}

          {/* Target Price Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-price">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
                className="w-full bg-background/80 border border-border/50 rounded-lg pl-8 pr-4 py-3 text-sm text-foreground font-price placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:shadow-cta transition-all"
              />
            </div>

            {/* Warning if above current price */}
            {isAboveCurrentPrice && (
              <div className="flex items-center gap-2 mt-2 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Target is at or above the current price. You'll be notified immediately when prices are checked.</span>
              </div>
            )}

            {/* Suggested prices */}
            {suggestedPrices.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] text-muted-foreground">Quick set:</span>
                {suggestedPrices.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setTargetPrice(String(s.price))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      targetPrice === String(s.price)
                        ? "bg-cta/15 border-cta/30 text-cta"
                        : "bg-background/50 border-border/30 text-muted-foreground hover:border-cta/20 hover:text-foreground"
                    }`}
                  >
                    ${s.price} ({s.label})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dispensary Selector */}
          {dispensaries.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Store className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
                Dispensary (optional)
              </label>
              <select
                value={selectedDispensary}
                onChange={(e) => setSelectedDispensary(e.target.value)}
                className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-cta/50 transition-all appearance-none"
              >
                <option value="">Any dispensary</option>
                {dispensaries.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Leave as "Any dispensary" to be notified about any price drop statewide.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isValidPrice || createAlert.isPending}
            className="w-full bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta font-semibold"
          >
            {createAlert.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            {createAlert.isPending ? "Creating Alert..." : "Set Price Alert"}
          </Button>

          <p className="text-[11px] text-muted-foreground/60 text-center">
            We check prices every Tuesday and Friday. Max 20 alerts per account. Alerts expire after 90 days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

---

## 7. `client/src/components/StrainVoting.tsx`

**Lines:** 342

```tsx
import { useState, useMemo } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, LogIn, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trackStrainVoted } from "@/lib/analytics";

interface StrainVotingProps {
  strainId: string;
  strainName: string;
}

type VoteDimension = "effectsAccuracy" | "valueForMoney" | "overallQuality";

const DIMENSIONS: { key: VoteDimension; label: string; description: string }[] = [
  { key: "effectsAccuracy", label: "Effects Accuracy", description: "Do the listed effects match your experience?" },
  { key: "valueForMoney", label: "Value for Money", description: "Is this strain worth the price?" },
  { key: "overallQuality", label: "Overall Quality", description: "How would you rate the overall quality?" },
];

export default function StrainVoting({ strainId, strainName }: StrainVotingProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Fetch aggregate data (public)
  const { data: aggregates, isLoading: aggLoading } = trpc.votes.aggregates.useQuery({ strainId });

  // Fetch user's existing vote (if logged in)
  const { data: myVote, isLoading: myVoteLoading } = trpc.votes.myVote.useQuery(
    { strainId },
    { enabled: isAuthenticated }
  );

  // Fetch comments (public)
  const { data: comments } = trpc.votes.comments.useQuery({ strainId });

  // Local vote state
  const [votes, setVotes] = useState<Record<VoteDimension, 1 | -1 | null>>({
    effectsAccuracy: null,
    valueForMoney: null,
    overallQuality: null,
  });
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync local state with existing vote
  const hasExistingVote = !!myVote;
  useMemo(() => {
    if (myVote && !isEditing) {
      setVotes({
        effectsAccuracy: myVote.effectsAccuracy as 1 | -1,
        valueForMoney: myVote.valueForMoney as 1 | -1,
        overallQuality: myVote.overallQuality as 1 | -1,
      });
      setComment(myVote.comment || "");
    }
  }, [myVote, isEditing]);

  // Submit mutation
  const submitVote = trpc.votes.submit.useMutation({
    onSuccess: (result) => {
      utils.votes.aggregates.invalidate({ strainId });
      utils.votes.myVote.invalidate({ strainId });
      utils.votes.comments.invalidate({ strainId });
      setIsEditing(false);
      // Track analytics
      if (votes.effectsAccuracy && votes.valueForMoney && votes.overallQuality) {
        trackStrainVoted(
          strainId,
          strainName,
          votes.effectsAccuracy,
          votes.valueForMoney,
          votes.overallQuality,
          comment.trim().length > 0,
          !result.isNew
        );
      }
    },
  });

  // Delete mutation
  const deleteVote = trpc.votes.delete.useMutation({
    onSuccess: () => {
      utils.votes.aggregates.invalidate({ strainId });
      utils.votes.myVote.invalidate({ strainId });
      utils.votes.comments.invalidate({ strainId });
      setVotes({ effectsAccuracy: null, valueForMoney: null, overallQuality: null });
      setComment("");
      setIsEditing(false);
    },
  });

  const allVotesSelected = votes.effectsAccuracy !== null && votes.valueForMoney !== null && votes.overallQuality !== null;

  const handleVote = (dimension: VoteDimension, value: 1 | -1) => {
    if (hasExistingVote && !isEditing) {
      setIsEditing(true);
    }
    setVotes(prev => ({
      ...prev,
      [dimension]: prev[dimension] === value ? null : value,
    }));
  };

  const handleSubmit = () => {
    if (!allVotesSelected) return;
    submitVote.mutate({
      strainId,
      strainName,
      effectsAccuracy: votes.effectsAccuracy!,
      valueForMoney: votes.valueForMoney!,
      overallQuality: votes.overallQuality!,
      comment: comment.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm("Remove your vote for this strain?")) {
      deleteVote.mutate({ strainId });
    }
  };

  const commentCount = comments?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Aggregate Display */}
      {aggregates && aggregates.totalVotes > 0 && (
        <div className="bg-card/60 border border-border/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Community Ratings</h3>
            <span className="text-xs text-muted-foreground">
              {aggregates.totalVotes} vote{aggregates.totalVotes !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {DIMENSIONS.map(dim => {
              const agg = aggregates[dim.key];
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{dim.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {agg.upPercent}% positive
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
                    {agg.up > 0 && (
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${agg.upPercent}%` }}
                      />
                    )}
                    {agg.down > 0 && (
                      <div
                        className="bg-red-400 transition-all duration-500"
                        style={{ width: `${100 - agg.upPercent}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-emerald-400">{agg.up} 👍</span>
                    <span className="text-[10px] text-red-400">{agg.down} 👎</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote Submission */}
      <div className="bg-card/60 border border-border/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {hasExistingVote && !isEditing ? "Your Vote" : "Rate This Strain"}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {hasExistingVote && !isEditing
            ? "You've already voted. Click a thumb to edit."
            : "Tap thumbs up or down for each dimension."}
        </p>

        {!isAuthenticated ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Sign in to rate this strain</p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Vote
            </a>
          </div>
        ) : myVoteLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {DIMENSIONS.map(dim => (
              <div key={dim.key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{dim.label}</span>
                  <p className="text-[10px] text-muted-foreground">{dim.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(dim.key, 1)}
                    className={`p-2 rounded-lg border transition-all ${
                      votes[dim.key] === 1
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "border-border/30 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                    aria-label={`Thumbs up for ${dim.label}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleVote(dim.key, -1)}
                    className={`p-2 rounded-lg border transition-all ${
                      votes[dim.key] === -1
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "border-border/30 text-muted-foreground hover:border-red-500/30 hover:text-red-400"
                    }`}
                    aria-label={`Thumbs down for ${dim.label}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div className="pt-2 border-t border-border/20">
              <label className="text-xs text-muted-foreground block mb-1">
                Optional comment ({140 - comment.length} chars left)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 140))}
                placeholder="Share a brief thought about this strain..."
                className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                rows={2}
                maxLength={140}
              />
            </div>

            {/* Submit / Delete buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={!allVotesSelected || submitVote.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitVote.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {hasExistingVote ? "Update Vote" : "Submit Vote"}
              </button>
              {hasExistingVote && (
                <button
                  onClick={handleDelete}
                  disabled={deleteVote.isPending}
                  className="p-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Delete vote"
                >
                  {deleteVote.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {submitVote.isSuccess && (
              <p className="text-xs text-emerald-400 text-center">
                {hasExistingVote ? "Vote updated!" : "Thanks for voting!"}
              </p>
            )}
            {submitVote.isError && (
              <p className="text-xs text-red-400 text-center">
                Failed to submit vote. Please try again.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      {commentCount > 0 && (
        <div className="bg-card/60 border border-border/30 rounded-lg p-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Community Comments ({commentCount})
              </span>
            </div>
            {showComments ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showComments && comments && (
            <div className="mt-3 space-y-3">
              {comments.map(c => {
                const positiveCount = [c.effectsAccuracy, c.valueForMoney, c.overallQuality].filter(v => v === 1).length;
                const sentiment = positiveCount >= 2 ? "positive" : positiveCount <= 1 ? "negative" : "mixed";
                return (
                  <div key={c.id} className="border-t border-border/20 pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        sentiment === "positive" ? "bg-emerald-500/15 text-emerald-400" :
                        sentiment === "negative" ? "bg-red-500/15 text-red-400" :
                        "bg-amber-500/15 text-amber-400"
                      }`}>
                        {sentiment === "positive" ? "👍 Positive" : sentiment === "negative" ? "👎 Negative" : "🤷 Mixed"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{c.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

```

---

## 8. `client/src/components/StrainComments.tsx`

**Lines:** 198

```tsx
/**
 * StrainComments — Comment submission form + approved comments display.
 * Integrates with trpc.comments.submit, trpc.comments.list, trpc.comments.delete.
 * Login-gated submission, public display.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { MessageSquare, Send, Trash2, LogIn, AlertCircle, CheckCircle, Clock, User } from "lucide-react";
import { trackCommentSubmitted } from "@/lib/analytics";

interface StrainCommentsProps {
  strainId: string;
  strainName: string;
}

export default function StrainComments({ strainId, strainName }: StrainCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: string; message: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.comments.list.useQuery(
    { strainId, limit: 20 },
  );

  const { data: commentCount } = trpc.comments.count.useQuery({ strainId });

  const submitMutation = trpc.comments.submit.useMutation({
    onSuccess: (result) => {
      trackCommentSubmitted(strainId, strainName, result.flagged, content.trim().length);
      setContent("");
      setSubmitResult({ status: result.status, message: result.message });
      utils.comments.list.invalidate({ strainId });
      utils.comments.count.invalidate({ strainId });
      setTimeout(() => setSubmitResult(null), 5000);
    },
    onError: (error) => {
      setSubmitResult({ status: "error", message: error.message });
      setTimeout(() => setSubmitResult(null), 5000);
    },
    onSettled: () => setSubmitting(false),
  });

  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ strainId });
      utils.comments.count.invalidate({ strainId });
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || content.trim().length < 10) return;
    setSubmitting(true);
    submitMutation.mutate({ strainId, strainName, content: content.trim() });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-card border border-border/30 rounded-xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-lg text-foreground">Community Reviews</h3>
        </div>
        {commentCount !== undefined && commentCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {commentCount} review{commentCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Submit Form */}
      {isAuthenticated ? (
        <div className="mb-6">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              placeholder={`Share your experience with ${strainName}...`}
              className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none min-h-[80px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {content.length}/1000 characters (min 10)
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || content.trim().length < 10}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3" />
                {submitting ? "Posting..." : "Post Review"}
              </button>
            </div>
          </div>

          {/* Submit Result Message */}
          {submitResult && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs ${
              submitResult.status === "approved"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : submitResult.status === "pending"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {submitResult.status === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : submitResult.status === "pending" ? (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              {submitResult.message}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-muted/30 border border-border/30 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Sign in to share your review</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <LogIn className="w-3 h-3" />
            Sign In
          </a>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted/50 rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted/30 rounded w-full mb-1" />
              <div className="h-3 bg-muted/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group border-b border-border/20 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {comment.userName || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {/* Delete button for own comments */}
                {user && user.id === comment.userId && (
                  <button
                    onClick={() => {
                      if (confirm("Delete your review?")) {
                        deleteMutation.mutate({ commentId: comment.id });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all"
                    title="Delete your review"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}

```

---

## 9. `client/src/components/PartnerVerifiedBadge.tsx`

**Lines:** 72

```tsx
/*
 * StrainScout MD — Partner Verified Badge
 * Shows a "Partner Verified" badge next to dispensary prices
 * when the dispensary has a verified partner account.
 * Also shows partner-submitted prices with a special badge.
 */

import { BadgeCheck } from "lucide-react";

interface PartnerVerifiedBadgeProps {
  /** Whether this is a compact inline badge or a full badge */
  compact?: boolean;
  /** Optional tooltip text */
  tooltip?: string;
}

export function PartnerVerifiedBadge({ compact = false, tooltip }: PartnerVerifiedBadgeProps) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/25"
        title={tooltip || "This dispensary is a verified StrainScout partner"}
      >
        <BadgeCheck className="w-3 h-3" />
        Partner
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25"
      title={tooltip || "This dispensary is a verified StrainScout partner"}
    >
      <BadgeCheck className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium text-primary">Partner Verified</span>
    </div>
  );
}

interface PartnerPriceBadgeProps {
  price: string;
  unit: string;
  dispensaryName: string;
  submittedAt: Date | string;
}

export function PartnerPriceBadge({ price, unit, dispensaryName, submittedAt }: PartnerPriceBadgeProps) {
  const date = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
      <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-price text-sm font-bold text-foreground">
            ${price}
          </span>
          <span className="text-[10px] text-muted-foreground">/ {unit}</span>
        </div>
        <div className="text-[10px] text-primary">
          Partner verified · {dispensaryName} · {formattedDate}
        </div>
      </div>
    </div>
  );
}

```

---

## 10. `client/src/components/VerificationBadge.tsx`

**Lines:** 207

```tsx
/**
 * VerificationBadge — Price Verification Status Pill
 * 
 * Shows how recently a price was verified against the dispensary's menu.
 * Uses "Verified" language (never "Fresh") to avoid confusion with
 * cannabis product freshness/packaging dates.
 * 
 * Tiers:
 *   Green  — Verified within 48 hours
 *   Amber  — 3-7 days since verification
 *   Red    — 7+ days since verification
 *   Gray   — No verification timestamp
 */
import { useState, useRef, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

type VerificationTier = "verified" | "aging" | "stale" | "unverified";

interface VerificationBadgeProps {
  /** ISO 8601 timestamp of last verification, or null/undefined */
  timestamp?: string | null;
  /** Dispensary name for tooltip context */
  dispensaryName?: string;
  /** Compact mode — icon only, used in tight layouts like comparison tables */
  compact?: boolean;
}

function getTier(timestamp?: string | null): { tier: VerificationTier; daysAgo: number } {
  if (!timestamp) return { tier: "unverified", daysAgo: -1 };

  const verified = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - verified.getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysAgo < 0) return { tier: "verified", daysAgo: 0 }; // future = treat as just verified
  if (daysAgo <= 2) return { tier: "verified", daysAgo };
  if (daysAgo <= 7) return { tier: "aging", daysAgo };
  return { tier: "stale", daysAgo };
}

const tierConfig: Record<VerificationTier, {
  label: (days: number) => string;
  icon: typeof CheckCircle;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  verified: {
    label: () => "Verified",
    icon: CheckCircle,
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
  },
  aging: {
    label: (days) => `${days}d ago`,
    icon: Clock,
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
  },
  stale: {
    label: (days) => days > 30 ? "30d+" : `${days}d+`,
    icon: AlertTriangle,
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
  },
  unverified: {
    label: () => "Unverified",
    icon: HelpCircle,
    bgClass: "bg-zinc-500/15",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-500/30",
  },
};

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

export function VerificationBadge({ timestamp, dispensaryName, compact }: VerificationBadgeProps) {
  const { tier, daysAgo } = getTier(timestamp);
  const config = tierConfig[tier];
  const Icon = config.icon;
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click (mobile)
  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  const tooltipContent = (
    <div className="text-xs leading-relaxed">
      <p className="font-medium text-zinc-200">
        {timestamp
          ? `Price last checked: ${formatDate(timestamp)}`
          : "No verification date on record"}
      </p>
      {dispensaryName && (
        <p className="text-zinc-400 mt-0.5">Source: {dispensaryName} menu</p>
      )}
      {tier === "stale" && (
        <p className="text-red-300 mt-1">
          This price may have changed. Visit the dispensary site for current pricing.
        </p>
      )}
      {tier === "unverified" && (
        <p className="text-zinc-400 mt-1">
          This price has not been independently verified against the dispensary menu.
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="relative inline-flex" ref={badgeRef}>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} transition-colors hover:opacity-80`}
          aria-label={`Price verification: ${config.label(daysAgo)}`}
        >
          <Icon className="w-3 h-3" />
          <span>{config.label(daysAgo)}</span>
        </button>
        {showTooltip && (
          <div
            ref={tooltipRef}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl"
          >
            {tooltipContent}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex" ref={badgeRef}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} transition-all hover:opacity-80 cursor-help`}
        aria-label={`Price verification: ${config.label(daysAgo)}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label(daysAgo)}</span>
      </button>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl"
        >
          {tooltipContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

/**
 * Aggregate verification badge for a strain — shows the most recent
 * verification date across all dispensary prices.
 */
export function StrainVerificationSummary({ prices }: {
  prices: { last_verified?: string; dispensary?: string }[];
}) {
  const mostRecent = prices
    .filter((p) => p.last_verified)
    .sort((a, b) => (b.last_verified! > a.last_verified! ? 1 : -1))[0];

  return (
    <VerificationBadge
      timestamp={mostRecent?.last_verified}
      dispensaryName={mostRecent?.dispensary}
    />
  );
}

```

---

## 11. `client/src/components/CompareInlineCTA.tsx`

**Lines:** 137

```tsx
/*
 * StrainScout MD — Compare Inline CTA
 * Design: Botanical Data Lab — Amber CTA accent
 * Contextual email capture that appears within the strain comparison grid.
 * Adapts messaging based on the active type filter.
 */

import { useState } from "react";
import { Mail, CheckCircle, X, TrendingDown, Bell, Loader2 } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

interface CompareInlineCTAProps {
  activeFilter: string; // "All" | "Indica" | "Sativa" | "Hybrid"
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
          <span>You're subscribed to weekly price comparisons</span>
        </div>
      );
    }
    return null;
  }

  const filterLabel =
    activeFilter === "All" ? "cannabis" : activeFilter.toLowerCase();

  const headline =
    activeFilter === "All"
      ? "Get Weekly Price Drops in Your Inbox"
      : `Comparing ${activeFilter} strains? Get weekly ${activeFilter} deals`;

  const subtext =
    activeFilter === "All"
      ? `We track prices across ${totalResults.toLocaleString()} strains every week. Get the biggest drops delivered free.`
      : `We'll send you the best ${filterLabel} price drops from Maryland dispensaries — every Tuesday, free.`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="col-span-full my-2">
      <div className="relative overflow-hidden rounded-xl border border-cta/30 bg-gradient-to-r from-cta/[0.06] via-card to-cta/[0.06]">
        {/* Dismiss */}
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
                <p className="text-sm font-semibold text-foreground">You're in!</p>
                <p className="text-xs text-muted-foreground">
                  Weekly {filterLabel} price drops will hit your inbox every Tuesday.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
              {/* Left: copy */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-cta/15 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-cta" />
                  </div>
                  <h3 className="font-serif text-base sm:text-lg text-foreground leading-tight">
                    {headline}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-10">
                  {subtext}
                </p>
                <div className="flex items-center gap-4 mt-2 pl-10">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <TrendingDown className="w-3 h-3 text-primary" /> Price drops
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Bell className="w-3 h-3 text-cta" /> New strains
                  </span>
                </div>
              </div>

              {/* Right: form */}
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2 lg:w-auto lg:shrink-0">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full sm:w-56 bg-card border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:ring-1 focus:ring-cta/20 transition-all"
                  />
                  {errorMsg && (
                    <p className="absolute -bottom-5 left-0 text-[10px] text-red-400">{errorMsg}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="px-5 py-2.5 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover active:opacity-90 transition-colors shadow-cta disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                >
                  {status === "submitting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get Alerts"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-cta/40 to-transparent" />
      </div>
    </div>
  );
}

```

---

## 12. `client/src/components/SEO.tsx`

**Lines:** 217

```tsx
/*
 * StrainScout MD — SEO Component
 * Dynamic meta tags, Open Graph, Twitter Cards, and JSON-LD structured data.
 * Uses react-helmet-async for SSR-compatible head management.
 */

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

const SITE_NAME = "StrainScout MD";
const BASE_URL = "https://strainscout-md.manus.space";
const DEFAULT_DESCRIPTION =
  "Compare cannabis prices across 100+ Maryland dispensaries. Track 2,220+ strains with real-time pricing, find the best deals, and save money on your next purchase.";
const DEFAULT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/hero-bg-RHmxN49YmGmHDGx8nptRYW.webp";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Find the Cheapest Cannabis Near You`;
  const canonicalUrl = `${BASE_URL}${path}`;

  // Default WebSite structured data
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/compare?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Geo tags for Maryland */}
      <meta name="geo.region" content="US-MD" />
      <meta name="geo.placename" content="Maryland" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
}

/* ── Page-specific SEO helpers ── */

export function HomePageSEO() {
  return (
    <SEO
      description="Compare cannabis prices across 100+ Maryland dispensaries. Track 2,220+ strains with real-time pricing, find the best deals near you."
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "StrainScout MD",
        url: "https://strainscout-md.manus.space",
        description: "Compare cannabis prices across Maryland dispensaries",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://strainscout-md.manus.space/compare?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function ComparePageSEO() {
  return (
    <SEO
      title="Compare Cannabis Strains"
      description="Compare prices, potency, and availability of 2,220+ cannabis strains across Maryland dispensaries. Filter by type, brand, and price range."
      path="/compare"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Compare Cannabis Strains — StrainScout MD",
        description: "Compare prices and availability of cannabis strains across Maryland dispensaries",
        url: "https://strainscout-md.manus.space/compare",
      }}
    />
  );
}

export function MapPageSEO() {
  return (
    <SEO
      title="Dispensary Map"
      description="Find Maryland cannabis dispensaries near you. Interactive map with locations, hours, and real-time strain availability for 100+ dispensaries."
      path="/map"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Maryland Dispensary Map — StrainScout MD",
        description: "Find cannabis dispensaries near you in Maryland",
        url: "https://strainscout-md.manus.space/map",
      }}
    />
  );
}

export function TopValuePageSEO() {
  return (
    <SEO
      title="Top Value Strains"
      description="Discover the best value cannabis strains in Maryland. Ranked by price-to-quality ratio across all dispensaries."
      path="/top-value"
    />
  );
}

interface StrainSEOProps {
  name: string;
  brand: string;
  type: string;
  thc?: string;
  priceMin?: number;
  priceMax?: number;
  description?: string;
  slug: string;
}

export function StrainDetailSEO({
  name,
  brand,
  type,
  thc,
  priceMin,
  priceMax,
  description,
  slug,
}: StrainSEOProps) {
  const desc =
    description ||
    `${name} by ${brand} — ${type} cannabis strain${thc ? ` with ${thc} THC` : ""}. Compare prices${priceMin ? ` from $${priceMin}` : ""}${priceMax ? ` to $${priceMax}` : ""} across Maryland dispensaries.`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${name} — ${brand}`,
    description: desc,
    url: `https://strainscout-md.manus.space/strain/${slug}`,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    category: `Cannabis / ${type}`,
  };

  if (priceMin || priceMax) {
    jsonLd.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      ...(priceMin && { lowPrice: priceMin }),
      ...(priceMax && { highPrice: priceMax }),
      availability: "https://schema.org/InStock",
    };
  }

  return (
    <SEO
      title={`${name} by ${brand}`}
      description={desc}
      path={`/strain/${slug}`}
      type="product"
      jsonLd={jsonLd}
    />
  );
}

```

---

## 13. `client/src/components/ErrorBoundary.tsx`

**Lines:** 63

```tsx
import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

```

---

## 14. `client/src/components/ManusDialog.tsx`

**Lines:** 90

```tsx
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-[#f8f8f7] rounded-[20px] w-[400px] shadow-[0px_4px_11px_0px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.08)] backdrop-blur-2xl p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          {logo ? (
            <div className="w-16 h-16 bg-white rounded-xl border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <img
                src={logo}
                alt="Dialog graphic"
                className="w-10 h-10 rounded-md"
              />
            </div>
          ) : null}

          {/* Title and subtitle */}
          {title ? (
            <DialogTitle className="text-xl font-semibold text-[#34322d] leading-[26px] tracking-[-0.44px]">
              {title}
            </DialogTitle>
          ) : null}
          <DialogDescription className="text-sm text-[#858481] leading-5 tracking-[-0.154px]">
            Please login with Manus to continue
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-10 bg-[#1a1a19] hover:bg-[#1a1a19]/90 text-white rounded-[10px] text-sm font-medium leading-5 tracking-[-0.154px]"
          >
            Login with Manus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

```

---

## 15. `client/src/components/Map.tsx`

**Lines:** 156

```tsx
/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

function loadMapScript() {
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve(null);
      script.remove(); // Clean up immediately
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}

```

---

## 16. `client/src/components/AIChatBox.tsx`

**Lines:** 336

```tsx
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  /**
   * Messages array to display in the chat.
   * Should match the format used by invokeLLM on the server.
   */
  messages: Message[];

  /**
   * Callback when user sends a message.
   * Typically you'll call a tRPC mutation here to invoke the LLM.
   */
  onSendMessage: (content: string) => void;

  /**
   * Whether the AI is currently generating a response
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Height of the chat box (default: 600px)
   */
  height?: string | number;

  /**
   * Empty state message to display when no messages
   */
  emptyStateMessage?: string;

  /**
   * Suggested prompts to display in empty state
   * Click to send directly
   */
  suggestedPrompts?: string[];
};

/**
 * A ready-to-use AI chat box component that integrates with the LLM system.
 *
 * Features:
 * - Matches server-side Message interface for seamless integration
 * - Markdown rendering with Streamdown
 * - Auto-scrolls to latest message
 * - Loading states
 * - Uses global theme colors from index.css
 *
 * @example
 * ```tsx
 * const ChatPage = () => {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { role: "system", content: "You are a helpful assistant." }
 *   ]);
 *
 *   const chatMutation = trpc.ai.chat.useMutation({
 *     onSuccess: (response) => {
 *       // Assuming your tRPC endpoint returns the AI response as a string
 *       setMessages(prev => [...prev, {
 *         role: "assistant",
 *         content: response
 *       }]);
 *     },
 *     onError: (error) => {
 *       console.error("Chat error:", error);
 *       // Optionally show error message to user
 *     }
 *   });
 *
 *   const handleSend = (content: string) => {
 *     const newMessages = [...messages, { role: "user", content }];
 *     setMessages(newMessages);
 *     chatMutation.mutate({ messages: newMessages });
 *   };
 *
 *   return (
 *     <AIChatBox
 *       messages={messages}
 *       onSendMessage={handleSend}
 *       isLoading={chatMutation.isPending}
 *       suggestedPrompts={[
 *         "Explain quantum computing",
 *         "Write a hello world in Python"
 *       ]}
 *     />
 *   );
 * };
 * ```
 */
export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      // Reserve space for:
      // - padding (p-4 = 32px top+bottom)
      // - user message: 40px (item height) + 16px (margin-top from space-y-4) = 56px
      // Note: margin-bottom is not counted because it naturally pushes the assistant message down
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      style={{ height }}
    >
      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>

              {suggestedPrompts && suggestedPrompts.length > 0 && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => onSendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map((message, index) => {
                // Apply min-height to last message only if NOT loading (when loading, the loading indicator gets it)
                const isLastMessage = index === displayMessages.length - 1;
                const shouldApplyMinHeight =
                  isLastMessage && !isLoading && minHeightForLastMessage > 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                    style={
                      shouldApplyMinHeight
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div
                  className="flex items-start gap-3"
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
                >
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <form
        ref={inputAreaRef}
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t bg-background/50 items-end"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 max-h-32 resize-none min-h-9"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0 h-[38px] w-[38px]"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

```

---

## 17. `client/src/components/DashboardLayout.tsx`

**Lines:** 265

```tsx
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Page 1", path: "/" },
  { icon: Users, label: "Page 2", path: "/some-path" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}

```

---

## 18. `client/src/components/DashboardLayoutSkeleton.tsx`

**Lines:** 47

```tsx
import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-[280px] border-r border-border bg-background p-4 space-y-6">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Menu items */}
        <div className="space-y-2 px-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* User profile area at bottom */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Content blocks */}
        <Skeleton className="h-12 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

```

---
