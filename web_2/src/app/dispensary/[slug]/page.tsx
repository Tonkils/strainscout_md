import DispensaryDetailClient from "./DispensaryDetailClient";

const DIRECTORY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/dispensary_directory.min_1575d3ca.json";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateStaticParams() {
  try {
    const res = await fetch(DIRECTORY_URL);
    const data: { name: string }[] = await res.json();
    return data.map((d) => ({ slug: slugify(d.name) }));
  } catch {
    return [];
  }
}

export default async function DispensaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DispensaryDetailClient slug={slug} />;
}
