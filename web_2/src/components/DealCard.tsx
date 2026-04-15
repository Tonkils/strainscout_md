import Link from "next/link";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { MapPin, Beaker, ExternalLink, Scale } from "lucide-react";
import { getCategoryFromStrain, CATEGORY_COLORS, TYPE_COLORS } from "@/lib/utils";

interface DealCardProps {
  strain: CatalogStrain;
  hideCategory?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-primary/15 text-primary",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-yellow-500/15 text-yellow-400",
};

function getBuyLink(strain: CatalogStrain, dispensaryName: string): string | null {
  const ordering = strain.ordering_links?.[dispensaryName];
  if (ordering?.dutchie) return ordering.dutchie;
  if (ordering?.weedmaps) return ordering.weedmaps;
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return website;
  return null;
}

export default function DealCard({ strain, hideCategory }: DealCardProps) {
  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const typeKey = strain.type.toLowerCase();
  const bestPrice = [...(strain.prices || [])].sort((a, b) => a.price - b.price)[0];
  const savings =
    strain.price_max && strain.price_min && strain.price_max > strain.price_min
      ? Math.round(((strain.price_max - strain.price_min) / strain.price_max) * 100)
      : 0;
  const terpenes = (strain.terpenes || []).filter((t) => t && t !== "Not_Found");
  const buyLink = bestPrice ? getBuyLink(strain, bestPrice.dispensary) : null;
  const category = getCategoryFromStrain(strain);
  const categoryColor = CATEGORY_COLORS[category];

  return (
    <Link href={`/strain/${strain.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full flex flex-col">
        <div className="p-5 flex flex-col flex-1">
          {/* Type + Category + Grade + Savings */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${TYPE_COLORS[typeKey] || TYPE_COLORS.hybrid}`}>
              {typeLabel}
            </span>
            {!hideCategory && category !== "Flower" && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${categoryColor}`}>
                {category}
              </span>
            )}
            {strain.grade && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${GRADE_COLORS[strain.grade] || GRADE_COLORS.C}`}>
                Grade {strain.grade}
              </span>
            )}
            {savings >= 15 && (
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted/40">
                {savings}% spread
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
            {strain.name}
          </h3>

          {/* Brand */}
          {strain.brand && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 truncate">{strain.brand}</p>
          )}

          {/* THC + Terpenes + Weight */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
            {strain.thc > 0 && <span>THC {strain.thc}%</span>}
            {strain.weight && (
              <span className="flex items-center gap-1">
                <Scale className="w-3 h-3" />
                {strain.weight}
              </span>
            )}
            {terpenes.length > 0 && (
              <span className="flex items-center gap-1">
                <Beaker className="w-3 h-3" />
                {terpenes.slice(0, 2).join(", ")}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="font-price text-2xl font-bold text-foreground">
                  {strain.price_min != null ? `$${strain.price_min}` : "N/A"}
                </p>
                {strain.best_price_per_gram != null && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ${strain.best_price_per_gram.toFixed(2)}/g
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground pb-1">
                {strain.dispensary_count ?? 0} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
              </p>
            </div>
            {bestPrice && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-muted-foreground min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="text-xs truncate">{bestPrice.dispensary}</span>
                </div>
                {buyLink && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(buyLink, "_blank", "noopener,noreferrer");
                    }}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cta text-cta-foreground text-[10px] font-semibold hover:bg-cta-hover transition-colors shadow-cta"
                  >
                    Buy <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price spread bar */}
        {strain.price_min != null && strain.price_max != null && strain.price_max > strain.price_min && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span className="font-price text-savings">${strain.price_min}</span>
              <span>Price Range</span>
              <span className="font-price text-expensive">${strain.price_max}</span>
            </div>
            <div className="h-1.5 rounded-full price-bar opacity-60" />
          </div>
        )}
      </div>
    </Link>
  );
}
