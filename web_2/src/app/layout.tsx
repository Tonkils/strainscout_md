import type { Metadata } from "next";
import { Gabarito, Anybody } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PostHogProvider, { PostHogPageView } from "@/components/PostHogProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Suspense } from "react";

const gabarito = Gabarito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-body",
  display: "swap",
});

const anybody = Anybody({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StrainScout MD — Find the Cheapest Cannabis in Maryland",
    template: "%s | StrainScout MD",
  },
  description:
    "Compare cannabis prices across 66 Maryland dispensaries. 844+ verified strains tracked. Find the best deals near you.",
  keywords: "Maryland cannabis, dispensary prices, strain comparison, weed prices MD, cannabis deals Maryland",
  metadataBase: new URL("https://strainscoutmd.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StrainScout MD — Find the Cheapest Cannabis in Maryland",
    description: "Compare cannabis prices across 66 Maryland dispensaries. 844+ verified strains.",
    type: "website",
    url: "https://strainscoutmd.com",
    siteName: "StrainScout MD",
    images: [
      {
        url: "/images/og-image.webp",
        width: 1200,
        height: 630,
        alt: "StrainScout MD — Cannabis Price Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrainScout MD — Find the Cheapest Cannabis in Maryland",
    description: "Compare cannabis prices across 66 Maryland dispensaries.",
    images: ["/images/og-image.webp"],
  },
  other: {
    "geo.region": "US-MD",
    "geo.placename": "Maryland",
    "geo.country": "US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${gabarito.variable} ${anybody.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <PostHogProvider>
        <Suspense fallback={null}><PostHogPageView /></Suspense>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "StrainScout MD",
              "url": "https://strainscoutmd.com",
              "description": "Compare cannabis prices across 66 Maryland dispensaries.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://strainscoutmd.com/compare?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* Ticker */}
        <div style={{ background: "#1A1A2E", color: "#FFF8EE", borderBottom: "3px solid #1A1A2E", overflow: "hidden", padding: "6px 0", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }}>
          <div className="animate-marquee" style={{ display: "flex", gap: "3rem", whiteSpace: "nowrap", width: "max-content" }}>
            {[...Array(2)].map((_, i) => (
              <span key={i} style={{ display: "flex", gap: "3rem" }}>
                <span>🌿 844+ strains tracked</span>
                <span>·</span>
                <span>💰 Prices updated weekly</span>
                <span>·</span>
                <span>📍 66 Maryland dispensaries</span>
                <span>·</span>
                <span>🔥 Find the cheapest near you</span>
                <span>·</span>
                <span>✅ No sign-up required</span>
                <span>·</span>
              </span>
            ))}
          </div>
        </div>
        <Navbar />
        <ErrorBoundary>
          <main className="flex-1">{children}</main>
        </ErrorBoundary>
        <Footer />
        </PostHogProvider>
      </body>
    </html>
  );
}
