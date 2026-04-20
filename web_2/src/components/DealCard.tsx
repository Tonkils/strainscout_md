import Link from "next/link";
import type { CatalogStrain } from "@/hooks/useCatalog";
import { ExternalLink } from "lucide-react";
import { getCategoryFromStrain } from "@/lib/utils";

interface DealCardProps {
  strain: CatalogStrain;
  hideCategory?: boolean;
}

function getBuyLink(strain: CatalogStrain, dispensaryName: string): string | null {
  const ordering = strain.ordering_links?.[dispensaryName];
  if (ordering?.dutchie) return ordering.dutchie;
  if (ordering?.weedmaps) return ordering.weedmaps;
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return website;
  return null;
}

function getBadge(strain: CatalogStrain): { label: string; bg: string; color: string } | null {
  const savings =
    strain.price_max && strain.price_min && strain.price_max > strain.price_min
      ? Math.round(((strain.price_max - strain.price_min) / strain.price_max) * 100)
      : 0;

  if (strain.price_min != null && strain.price_min <= 25) {
    return { label: "Low Price", bg: "#7ECEB0", color: "#1A1A2E" };
  }
  if (savings >= 30) {
    return { label: "Hot Deal", bg: "#FF6B57", color: "#FFF8EE" };
  }
  if (strain.dispensary_count != null && strain.dispensary_count <= 3) {
    return { label: "Rare", bg: "#B8A9E8", color: "#1A1A2E" };
  }
  return null;
}

export default function DealCard({ strain, hideCategory }: DealCardProps) {
  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const bestPrice = [...(strain.prices || [])].sort((a, b) => a.price - b.price)[0];
  const savings =
    strain.price_max && strain.price_min && strain.price_max > strain.price_min
      ? Math.round(((strain.price_max - strain.price_min) / strain.price_max) * 100)
      : 0;
  const buyLink = bestPrice ? getBuyLink(strain, bestPrice.dispensary) : null;
  const category = getCategoryFromStrain(strain);
  const badge = getBadge(strain);
  const thcPct = Math.min(100, Math.max(0, strain.thc));

  const typeColors: Record<string, string> = {
    indica: "#B8A9E8",
    sativa: "#FFD66B",
    hybrid: "#7ECEB0",
  };
  const typeBg = typeColors[strain.type.toLowerCase()] ?? "#f5f0e8";

  return (
    <Link href={`/strain/${strain.id}`} style={{ textDecoration: "none" }}>
      <div
        className="group"
        style={{
          position: "relative",
          background: "#fff",
          border: "3px solid #1A1A2E",
          borderRadius: "16px",
          overflow: "visible",
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 #1A1A2E";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translate(3px, 3px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 #1A1A2E";
        }}
      >
        {/* Badge — absolute, top-right */}
        {badge && (
          <div
            style={{
              position: "absolute",
              top: "-12px",
              right: "16px",
              background: badge.bg,
              color: badge.color,
              border: "2px solid #1A1A2E",
              borderRadius: "999px",
              padding: "2px 10px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              zIndex: 2,
              textTransform: "uppercase",
            }}
          >
            {badge.label}
          </div>
        )}

        <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Type + category tags */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                background: typeBg,
                border: "2px solid #1A1A2E",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "10px",
                fontWeight: 800,
                color: "#1A1A2E",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {typeLabel}
            </span>
            {!hideCategory && category !== "Flower" && (
              <span
                style={{
                  background: "#f5f0e8",
                  border: "2px solid #1A1A2E",
                  borderRadius: "999px",
                  padding: "2px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {category}
              </span>
            )}
            {savings >= 15 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "rgba(78,201,107,0.15)",
                  border: "2px solid #4EC96B",
                  borderRadius: "999px",
                  padding: "2px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                }}
              >
                {savings}% off
              </span>
            )}
          </div>

          {/* Strain name */}
          <h3
            style={{
              fontFamily: "var(--font-heading), Georgia, serif",
              fontSize: "17px",
              fontWeight: 800,
              color: "#1A1A2E",
              marginBottom: "4px",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {strain.name}
          </h3>

          {/* Brand */}
          {strain.brand && (
            <p
              style={{
                fontSize: "10px",
                color: "rgba(26,26,46,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "10px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {strain.brand}
            </p>
          )}

          {/* THC bar */}
          {strain.thc > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "#1A1A2E", marginBottom: "4px" }}>
                <span>THC</span>
                <span>{strain.thc}%</span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "#f5f0e8",
                  border: "2px solid #1A1A2E",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${thcPct}%`,
                    background: "#7ECEB0",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>
          )}

          {/* Price — push to bottom */}
          <div style={{ marginTop: "auto" }}>
            <p style={{ fontSize: "10px", color: "rgba(26,26,46,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>From</p>
            <p
              style={{
                fontFamily: "var(--font-heading), Georgia, serif",
                fontSize: "28px",
                fontWeight: 900,
                color: "#1A1A2E",
                lineHeight: 1,
              }}
            >
              {strain.price_min != null ? `$${strain.price_min}` : "N/A"}
            </p>
          </div>
        </div>

        {/* Dispensary row */}
        {bestPrice && (
          <div
            style={{
              padding: "10px 20px",
              borderTop: "2px dashed #1A1A2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#7ECEB0",
                  border: "2px solid #1A1A2E",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: "#1A1A2E",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {bestPrice.dispensary}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span style={{ fontSize: "10px", color: "rgba(26,26,46,0.5)", fontWeight: 600 }}>
                {strain.dispensary_count ?? 0} loc
              </span>
              {buyLink && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(buyLink, "_blank", "noopener,noreferrer");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    background: "#FF6B57",
                    color: "#FFF8EE",
                    border: "2px solid #1A1A2E",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                  }}
                >
                  Buy <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Price range bar */}
        {strain.price_min != null && strain.price_max != null && strain.price_max > strain.price_min && (
          <div style={{ padding: "8px 20px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "#1A1A2E", marginBottom: "4px" }}>
              <span style={{ color: "#4EC96B" }}>${strain.price_min}</span>
              <span style={{ color: "rgba(26,26,46,0.4)" }}>Price Range</span>
              <span style={{ color: "#FF6B57" }}>${strain.price_max}</span>
            </div>
            <div
              style={{
                height: "6px",
                border: "2px solid #1A1A2E",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div className="price-bar" style={{ height: "100%" }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
