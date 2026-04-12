import { Link } from "wouter";
import { MapPin, Package, Clock } from "lucide-react";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { getDaysSinceScraped, formatDaysSinceScraped } from "@/lib/utils";

interface OtherCardProps {
  strain: CatalogStrain;
}

export default function OtherCard({ strain }: OtherCardProps) {
  const bestPrice = strain.prices.sort((a, b) => a.price - b.price)[0];
  const daysSince = getDaysSinceScraped(strain.last_verified);

  return (
    <Link href={`/strain/${strain.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-lg overflow-hidden hover:border-zinc-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-500/5">
        {/* Category Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 text-[9px] font-semibold uppercase tracking-wider">
          <Package className="w-2.5 h-2.5" />
          Other
        </div>

        <div className="p-5">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-3">
            {strain.brand && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                {strain.brand}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-serif text-lg text-foreground group-hover:text-zinc-300 transition-colors mb-1 line-clamp-2">
            {strain.name}
          </h3>

          {/* THC / CBD */}
          <div className="flex items-center gap-3 text-xs mb-4">
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
          </div>

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
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-end">
            {daysSince !== null && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {formatDaysSinceScraped(daysSince)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
