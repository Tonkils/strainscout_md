import { Link } from "wouter";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { MapPin, Beaker } from "lucide-react";

interface DealCardProps {
  strain: CatalogStrain;
}

export default function DealCard({ strain }: DealCardProps) {
  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const bestPrice = strain.prices.sort((a, b) => a.price - b.price)[0];
  const savings = strain.price_max && strain.price_min && strain.price_max > strain.price_min
    ? Math.round(((strain.price_max - strain.price_min) / strain.price_max) * 100)
    : 0;

  return (
    <Link href={`/strain/${strain.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        {/* Card Content */}
        <div className="p-5">
          {/* Type + Brand */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              strain.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
              strain.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
              "bg-emerald-500/15 text-emerald-400"
            }`}>
              {typeLabel}
            </span>
            {strain.brand && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{strain.brand}</span>
            )}
            {strain.grade === "A" && (
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">★</span>
            )}
          </div>

          {/* Strain Name */}
          <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
            {strain.name}
          </h3>

          {/* THC + Terpenes */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            {strain.thc && <span>THC {strain.thc}</span>}
            {strain.terpenes.filter(t => t !== 'Not_Found').length > 0 && (
              <span className="flex items-center gap-1">
                <Beaker className="w-3 h-3" />
                {strain.terpenes.filter(t => t !== 'Not_Found').slice(0, 2).join(", ")}
              </span>
            )}
          </div>

          {/* Price Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</p>
              <p className="font-price text-2xl font-bold text-foreground">
                {strain.price_min != null ? `$${strain.price_min}` : "N/A"}
              </p>
            </div>
            <div className="text-right">
              {bestPrice && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs truncate max-w-[120px]">{bestPrice.dispensary}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {strain.dispensary_count ?? 0} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>

          {/* Price Spread Bar */}
          {strain.price_min != null && strain.price_max != null && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                <span className="font-price">${strain.price_min}</span>
                <span>Price Range</span>
                <span className="font-price">${strain.price_max}</span>
              </div>
              <div className="h-1.5 rounded-full price-bar opacity-60" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
