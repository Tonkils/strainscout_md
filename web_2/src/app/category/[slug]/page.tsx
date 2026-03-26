import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CategoryPageClient from "./CategoryPageClient";
import { CATEGORY_LABELS, type ProductCategory } from "@/lib/utils";

// The 7 canonical category slugs
const CATEGORY_SLUGS: ProductCategory[] = [
  "Flower",
  "Pre-Roll",
  "Vape",
  "Concentrate",
  "Edible",
  "Topical",
  "Other",
];

// URL slug → ProductCategory (e.g. "pre-roll" → "Pre-Roll")
function slugToCategory(slug: string): ProductCategory | null {
  const normalized = slug.toLowerCase();
  return (
    CATEGORY_SLUGS.find((c) => c.toLowerCase() === normalized) ?? null
  );
}

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((cat) => ({ slug: cat.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = slugToCategory(slug);
  const label = cat ? CATEGORY_LABELS[cat] : slug;
  return {
    title: `${label} | StrainScout MD`,
    description: `Browse Maryland dispensary ${label.toLowerCase()} prices. Compare costs across 90+ dispensaries — updated weekly.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div role="status" className="flex items-center justify-center py-24">
          <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <CategoryPageClient slug={slug} />
    </Suspense>
  );
}
