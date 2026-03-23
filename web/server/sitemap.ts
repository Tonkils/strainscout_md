/*
 * StrainScout MD — Dynamic Sitemap Generator
 * Generates XML sitemap from static pages + all strain detail pages.
 * Fetches strain IDs from the CDN catalog on first request, then caches.
 * Mounted at /sitemap.xml in the Express app.
 */

import { Router } from "express";

const BASE_URL = "https://strainscout-md.manus.space";
const CATALOG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/compare", priority: 0.9, changefreq: "daily" },
  { path: "/map", priority: 0.8, changefreq: "weekly" },
  { path: "/top-value", priority: 0.8, changefreq: "daily" },
  { path: "/dispensaries", priority: 0.8, changefreq: "weekly" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Cache strain IDs and dispensary names for 1 hour
let cachedStrainIds: string[] = [];
let cachedDispensaryNames: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function loadCatalog(): Promise<{ strainIds: string[]; dispensaryNames: string[] }> {
  if (cachedStrainIds.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return { strainIds: cachedStrainIds, dispensaryNames: cachedDispensaryNames };
  }

  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    const data = await res.json() as { id: string }[] | { strains?: { id: string }[] };
    // Handle both formats: array of strains or object with strains key
    const strains = Array.isArray(data) ? data : (data.strains || []);
    if (strains.length > 0) {
      cachedStrainIds = strains.map((s) => s.id);
      // Extract unique dispensary names
      const dispSet = new Set<string>();
      for (const s of strains as { id: string; dispensaries?: string[] }[]) {
        if (s.dispensaries) {
          for (const d of s.dispensaries) dispSet.add(d);
        }
      }
      cachedDispensaryNames = Array.from(dispSet);
      cacheTimestamp = Date.now();
      console.log(`[Sitemap] Loaded ${cachedStrainIds.length} strain IDs and ${cachedDispensaryNames.length} dispensaries from catalog`);
    }
  } catch (err) {
    console.warn("[Sitemap] Could not load strain IDs from CDN:", err);
  }

  return { strainIds: cachedStrainIds, dispensaryNames: cachedDispensaryNames };
}

export function createSitemapRouter(): Router {
  const router = Router();

  router.get("/sitemap.xml", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const { strainIds, dispensaryNames } = await loadCatalog();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic strain pages
    for (const id of strainIds) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/strain/${escapeXml(id)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic dispensary pages
    for (const name of dispensaryNames) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/dispensary/${escapeXml(slugify(name))}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  return router;
}
