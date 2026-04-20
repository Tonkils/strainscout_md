"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "3px solid #1A1A2E",
        background: "#FFF8EE",
        marginTop: "auto",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "20px 1rem",
        }}
      >
        <p style={{ fontSize: "12px", color: "rgba(26,26,46,0.55)", fontWeight: 500 }}>
          &copy; {new Date().getFullYear()} StrainScout MD. Not affiliated with any dispensary. Prices updated weekly.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link
            href="/compare"
            style={{ fontSize: "12px", color: "#1A1A2E", fontWeight: 700, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7ECEB0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#1A1A2E"; }}
          >
            Compare
          </Link>
          <Link
            href="/cheapest"
            style={{ fontSize: "12px", color: "#1A1A2E", fontWeight: 700, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7ECEB0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#1A1A2E"; }}
          >
            Cheapest
          </Link>
          <Link
            href="/dispensaries"
            style={{ fontSize: "12px", color: "#1A1A2E", fontWeight: 700, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7ECEB0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#1A1A2E"; }}
          >
            Dispensaries
          </Link>
          <Link
            href="/top-value"
            style={{ fontSize: "12px", color: "#1A1A2E", fontWeight: 700, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7ECEB0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#1A1A2E"; }}
          >
            Top Value
          </Link>
          <Link
            href="/market"
            style={{ fontSize: "12px", color: "#1A1A2E", fontWeight: 700, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7ECEB0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#1A1A2E"; }}
          >
            Market Data
          </Link>
        </div>
      </div>
    </footer>
  );
}
