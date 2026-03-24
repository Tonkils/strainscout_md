import { readFileSync } from "fs";
import { join } from "path";
import DispensaryDetailClient from "./DispensaryDetailClient";

const DIRECTORY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/dispensary_directory.min_1575d3ca.json";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function dispensariesFromLocalCatalog(): { slug: string }[] {
  try {
    const catalogPath = join(process.cwd(), "public", "data", "strainscout_catalog_v10.min.json");
    const raw = readFileSync(catalogPath, "utf-8");
    const strains: { dispensaries?: string[] }[] = JSON.parse(raw);
    const names = new Set<string>();
    for (const s of strains) {
      for (const d of s.dispensaries ?? []) names.add(d);
    }
    return Array.from(names).map((name) => ({ slug: slugify(name) }));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(DIRECTORY_URL);
    if (!res.ok) throw new Error(`CDN returned ${res.status}`);
    const data: { name: string }[] = await res.json();
    return data.map((d) => ({ slug: slugify(d.name) }));
  } catch {
    return dispensariesFromLocalCatalog();
  }
}

export default async function DispensaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DispensaryDetailClient slug={slug} />;
}
