"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/compare", label: "Compare" },
  { href: "/cheapest", label: "Cheapest" },
  { href: "/top-value", label: "Top Value" },
  { href: "/dispensaries", label: "Dispensaries" },
  { href: "/map", label: "Map" },
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
    <header
      ref={menuRef}
      className="sticky top-0 z-50"
      style={{ background: "#FFF8EE", borderBottom: "3px solid #1A1A2E" }}
    >
      <nav className="container flex items-center justify-between" style={{ height: "64px" }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: "none" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#8BC34A",
              border: "3px solid #1A1A2E",
              borderRadius: "50% 8px 50% 8px",
              transform: "rotate(-20deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(20deg)" }}>
              <path d="M12 2C6 2 2 8 2 14c0 4 2 7 5 8.5L12 22l5-0.5C20 20 22 17 22 14c0-6-4-12-10-12z" fill="#FFF8EE" />
              <path d="M12 22V10" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-heading), Georgia, serif",
              fontSize: "20px",
              fontWeight: 800,
              color: "#1A1A2E",
              letterSpacing: "-0.02em",
            }}
          >
            StrainScout
            <sup style={{ fontSize: "11px", fontWeight: 700, color: "#FF6B57", marginLeft: "2px", verticalAlign: "super" }}>MD</sup>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: "2px solid transparent",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.15s",
                  background: isActive ? "#1A1A2E" : "transparent",
                  color: isActive ? "#FFF8EE" : "#1A1A2E",
                  borderColor: isActive ? "#1A1A2E" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "#FFD66B";
                    (e.currentTarget as HTMLElement).style.borderColor = "#1A1A2E";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                  }
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: search button */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/compare"
            aria-label="Search"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "3px solid #1A1A2E",
              background: "#FFF8EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              textDecoration: "none",
              color: "#1A1A2E",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#7ECEB0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#FFF8EE";
            }}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "8px",
            border: "3px solid #1A1A2E",
            background: "#FFF8EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1A1A2E",
          }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-nav-menu"
        className="md:hidden"
        style={{
          overflow: "hidden",
          maxHeight: mobileOpen ? "500px" : "0",
          opacity: mobileOpen ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.2s ease",
          borderTop: mobileOpen ? "3px solid #1A1A2E" : "none",
          background: "#FFF8EE",
        }}
      >
        <div className="container py-3" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "2px solid",
                  borderColor: isActive ? "#1A1A2E" : "transparent",
                  background: isActive ? "#1A1A2E" : "transparent",
                  color: isActive ? "#FFF8EE" : "#1A1A2E",
                  fontSize: "15px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "block",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/compare"
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "2px solid transparent",
              color: "#1A1A2E",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[-1]"
          style={{ top: "calc(67px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}
