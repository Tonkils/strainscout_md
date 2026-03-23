/*
 * StrainScout MD — Partner Verified Badge
 * Shows a "Partner Verified" badge next to dispensary prices
 * when the dispensary has a verified partner account.
 * Also shows partner-submitted prices with a special badge.
 */

import { BadgeCheck } from "lucide-react";

interface PartnerVerifiedBadgeProps {
  /** Whether this is a compact inline badge or a full badge */
  compact?: boolean;
  /** Optional tooltip text */
  tooltip?: string;
}

export function PartnerVerifiedBadge({ compact = false, tooltip }: PartnerVerifiedBadgeProps) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/25"
        title={tooltip || "This dispensary is a verified StrainScout partner"}
      >
        <BadgeCheck className="w-3 h-3" />
        Partner
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25"
      title={tooltip || "This dispensary is a verified StrainScout partner"}
    >
      <BadgeCheck className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium text-primary">Partner Verified</span>
    </div>
  );
}

interface PartnerPriceBadgeProps {
  price: string;
  unit: string;
  dispensaryName: string;
  submittedAt: Date | string;
}

export function PartnerPriceBadge({ price, unit, dispensaryName, submittedAt }: PartnerPriceBadgeProps) {
  const date = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
      <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-price text-sm font-bold text-foreground">
            ${price}
          </span>
          <span className="text-[10px] text-muted-foreground">/ {unit}</span>
        </div>
        <div className="text-[10px] text-primary">
          Partner verified · {dispensaryName} · {formattedDate}
        </div>
      </div>
    </div>
  );
}
