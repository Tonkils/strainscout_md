/**
 * VerificationBadge — Price Verification Status Pill
 * 
 * Shows how recently a price was verified against the dispensary's menu.
 * Uses "Verified" language (never "Fresh") to avoid confusion with
 * cannabis product freshness/packaging dates.
 * 
 * Tiers:
 *   Green  — Verified within 48 hours
 *   Amber  — 3-7 days since verification
 *   Red    — 7+ days since verification
 *   Gray   — No verification timestamp
 */
import { useState, useRef, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

type VerificationTier = "verified" | "aging" | "stale" | "unverified";

interface VerificationBadgeProps {
  /** ISO 8601 timestamp of last verification, or null/undefined */
  timestamp?: string | null;
  /** Dispensary name for tooltip context */
  dispensaryName?: string;
  /** Compact mode — icon only, used in tight layouts like comparison tables */
  compact?: boolean;
}

function getTier(timestamp?: string | null): { tier: VerificationTier; daysAgo: number } {
  if (!timestamp) return { tier: "unverified", daysAgo: -1 };

  const verified = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - verified.getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysAgo < 0) return { tier: "verified", daysAgo: 0 }; // future = treat as just verified
  if (daysAgo <= 2) return { tier: "verified", daysAgo };
  if (daysAgo <= 7) return { tier: "aging", daysAgo };
  return { tier: "stale", daysAgo };
}

const tierConfig: Record<VerificationTier, {
  label: (days: number) => string;
  icon: typeof CheckCircle;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  verified: {
    label: () => "Verified",
    icon: CheckCircle,
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
  },
  aging: {
    label: (days) => `${days}d ago`,
    icon: Clock,
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
  },
  stale: {
    label: (days) => days > 30 ? "30d+" : `${days}d+`,
    icon: AlertTriangle,
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
  },
  unverified: {
    label: () => "Unverified",
    icon: HelpCircle,
    bgClass: "bg-zinc-500/15",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-500/30",
  },
};

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

export function VerificationBadge({ timestamp, dispensaryName, compact }: VerificationBadgeProps) {
  const { tier, daysAgo } = getTier(timestamp);
  const config = tierConfig[tier];
  const Icon = config.icon;
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click (mobile)
  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  const tooltipContent = (
    <div className="text-xs leading-relaxed">
      <p className="font-medium text-zinc-200">
        {timestamp
          ? `Price last checked: ${formatDate(timestamp)}`
          : "No verification date on record"}
      </p>
      {dispensaryName && (
        <p className="text-zinc-400 mt-0.5">Source: {dispensaryName} menu</p>
      )}
      {tier === "stale" && (
        <p className="text-red-300 mt-1">
          This price may have changed. Visit the dispensary site for current pricing.
        </p>
      )}
      {tier === "unverified" && (
        <p className="text-zinc-400 mt-1">
          This price has not been independently verified against the dispensary menu.
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="relative inline-flex" ref={badgeRef}>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} transition-colors hover:opacity-80`}
          aria-label={`Price verification: ${config.label(daysAgo)}`}
        >
          <Icon className="w-3 h-3" />
          <span>{config.label(daysAgo)}</span>
        </button>
        {showTooltip && (
          <div
            ref={tooltipRef}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl"
          >
            {tooltipContent}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex" ref={badgeRef}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} transition-all hover:opacity-80 cursor-help`}
        aria-label={`Price verification: ${config.label(daysAgo)}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label(daysAgo)}</span>
      </button>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl"
        >
          {tooltipContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

/**
 * Aggregate verification badge for a strain — shows the most recent
 * verification date across all dispensary prices.
 */
export function StrainVerificationSummary({ prices }: {
  prices: { last_verified?: string; dispensary?: string }[];
}) {
  const mostRecent = prices
    .filter((p) => p.last_verified)
    .sort((a, b) => (b.last_verified! > a.last_verified! ? 1 : -1))[0];

  return (
    <VerificationBadge
      timestamp={mostRecent?.last_verified}
      dispensaryName={mostRecent?.dispensary}
    />
  );
}
