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
