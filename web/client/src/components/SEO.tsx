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
