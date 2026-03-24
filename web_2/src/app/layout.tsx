import type { Metadata } from "next";
import { DM_Serif_Display, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PostHogProvider, { PostHogPageView } from "@/components/PostHogProvider";
import { Suspense } from "react";

const dmSerif = DM_Serif_Display({
  weight: "400",
  variable: "--font-dm-serif",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
      className={`${dmSerif.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}
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
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        </PostHogProvider>
      </body>
    </html>
  );
}
