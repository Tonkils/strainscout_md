import { Link } from "wouter";
import { MapPin, Beaker, Droplets, Clock } from "lucide-react";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { formatDaysSinceScraped } from "@/lib/utils";

interface ConcentrateCardProps {
  strain: CatalogStrain;
}

export default function ConcentrateCard({ strain }: ConcentrateCardProps) {
  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const bestPrice = strain.prices.sort((a, b) => a.price - b.price)[0];
  const terpenes = strain.terpenes.filter((t) => t !== "Not_Found");

  return (
    <Link href={`/strain/${strain.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-lg overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
        {/* Category Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[9px] font-semibold uppercase tracking-wider">
          <Droplets className="w-2.5 h-2.5" />
          Concentrate
        </div>

        <div className="p-5">
          {/* Concentrate Type + Strain Type + Brand */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {strain.subType && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-400">
                {strain.subType}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                strain.type === "indica"
                  ? "bg-indigo-500/15 text-indigo-400"
                  : strain.type === "sativa"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {typeLabel}
            </span>
            {strain.brand && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                {strain.brand}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-serif text-lg text-foreground group-hover:text-violet-400 transition-colors mb-1 line-clamp-2">
            {strain.name}
          </h3>

          {/* Strain/Genetics */}
          {strain.genetics && (
            <p
              className="text-xs text-muted-foreground mb-2 truncate"
              title={strain.genetics}
            >
              {strain.genetics}
            </p>
          )}

          {/* THC / CBD / Amount */}
          <div className="flex items-center gap-3 text-xs mb-3">
            {strain.thc > 0 && (
              <span className="font-price text-foreground">
                THC {strain.thc}%
              </span>
            )}
            {strain.cbd > 0 && (
              <span className="font-price text-muted-foreground">
                CBD {strain.cbd}%
              </span>
            )}
            {strain.weight && (
              <span className="px-1.5 py-0.5 rounded bg-accent text-[10px] text-muted-foreground">
                {strain.weight}
              </span>
            )}
          </div>

          {/* Terpenes */}
          {terpenes.length > 0 && (
            <div className="flex items-center gap-1.5 mb-4">
              <Beaker className="w-3 h-3 text-muted-foreground shrink-0" />
              <div className="flex gap-1 flex-wrap">
                {terpenes.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded bg-accent text-[10px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                From
              </p>
              <p className="font-price text-2xl font-bold text-foreground">
                {strain.price_min != null ? `$${strain.price_min}` : "N/A"}
              </p>
            </div>
            <div className="text-right">
              {bestPrice && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs truncate max-w-[120px]">
                    {bestPrice.dispensary}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {strain.dispensary_count ?? 0} dispensar
                {(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
            {strain.price_min != null && strain.price_max != null ? (
              <div className="flex-1 mr-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="font-price">${strain.price_min}</span>
                  <span className="font-price">${strain.price_max}</span>
                </div>
                <div className="h-1.5 rounded-full price-bar opacity-60" />
              </div>
            ) : (
              <div className="flex-1" />
            )}
            {strain.days_since_scraped != null && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {formatDaysSinceScraped(strain.days_since_scraped)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
