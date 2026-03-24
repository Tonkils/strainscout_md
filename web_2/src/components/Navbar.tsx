"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X, Leaf, TrendingDown, GitCompareArrows, Home, Building2, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/cheapest", label: "Cheapest", icon: TrendingDown },
  { href: "/top-value", label: "Top Value", icon: TrendingUp },
  { href: "/dispensaries", label: "Dispensaries", icon: Building2 },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header ref={menuRef} className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="container flex items-center justify-between h-14 sm:h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif text-lg sm:text-xl text-foreground tracking-tight">
            Strain<span className="text-primary">Scout</span>{" "}
            <span className="text-muted-foreground text-xs sm:text-sm font-sans font-light">MD</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                pathname === link.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/compare"
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden w-12 h-12 -mr-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-accent transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="border-t border-border/50 bg-background/98 backdrop-blur-xl">
          <div className="container py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-lg transition-colors ${
                    isActive ? "text-primary bg-primary/10" : "text-foreground/80 hover:text-foreground active:bg-accent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {link.label}
                  {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </Link>
              );
            })}
            <div className="pt-2 mt-1 border-t border-border/30">
              <Link
                href="/compare"
                className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-foreground/80 hover:text-foreground active:bg-accent rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
                Search
              </Link>
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-[calc(3.5rem+1px)] bg-black/40 z-[-1]"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}
