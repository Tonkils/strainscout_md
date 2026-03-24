"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

type VerificationTier = "verified" | "aging" | "stale" | "unverified";

interface VerificationBadgeProps {
  timestamp?: string | null;
  dispensaryName?: string;
  compact?: boolean;
}

function getTier(timestamp?: string | null): { tier: VerificationTier; daysAgo: number } {
  if (!timestamp) return { tier: "unverified", daysAgo: -1 };
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (daysAgo < 0) return { tier: "verified", daysAgo: 0 };
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
  verified:   { label: () => "Verified",             icon: CheckCircle,   bgClass: "bg-emerald-500/15", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" },
  aging:      { label: (d) => `${d}d ago`,            icon: Clock,         bgClass: "bg-amber-500/15",   textClass: "text-amber-400",   borderClass: "border-amber-500/30"   },
  stale:      { label: (d) => d > 30 ? "30d+" : `${d}d+`, icon: AlertTriangle, bgClass: "bg-red-500/15",     textClass: "text-red-400",     borderClass: "border-red-500/30"     },
  unverified: { label: () => "Unverified",            icon: HelpCircle,    bgClass: "bg-zinc-500/15",    textClass: "text-zinc-400",    borderClass: "border-zinc-500/30"    },
};

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York", timeZoneName: "short",
  });
}

export function VerificationBadge({ timestamp, dispensaryName, compact }: VerificationBadgeProps) {
  const { tier, daysAgo } = getTier(timestamp);
  const config = tierConfig[tier];
  const Icon = config.icon;
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) setShowTooltip(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  const tooltipContent = (
    <div className="text-xs leading-relaxed">
      <p className="font-medium text-zinc-200">
        {timestamp ? `Price last checked: ${formatDate(timestamp)}` : "No verification date on record"}
      </p>
      {dispensaryName && <p className="text-zinc-400 mt-0.5">Source: {dispensaryName} menu</p>}
      {tier === "stale" && <p className="text-red-300 mt-1">This price may have changed. Visit the dispensary site for current pricing.</p>}
      {tier === "unverified" && <p className="text-zinc-400 mt-1">This price has not been independently verified against the dispensary menu.</p>}
    </div>
  );

  const baseClasses = `inline-flex items-center gap-1 border transition-colors hover:opacity-80 ${config.bgClass} ${config.textClass} ${config.borderClass}`;

  return (
    <div className="relative inline-flex" ref={badgeRef}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={compact
          ? `${baseClasses} px-1.5 py-0.5 rounded text-[10px] font-medium`
          : `${baseClasses} px-2.5 py-1 rounded-full text-xs font-medium gap-1.5 cursor-help`}
        aria-label={`Price verification: ${config.label(daysAgo)}`}
      >
        <Icon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{config.label(daysAgo)}</span>
      </button>
      {showTooltip && (
        <div className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl ${compact ? "w-56" : "w-64 p-3"}`}>
          {tooltipContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

export function StrainVerificationSummary({ prices }: { prices: { last_verified?: string; dispensary?: string }[] }) {
  const mostRecent = prices
    .filter((p) => p.last_verified)
    .sort((a, b) => (b.last_verified! > a.last_verified! ? 1 : -1))[0];
  return <VerificationBadge timestamp={mostRecent?.last_verified} dispensaryName={mostRecent?.dispensary} />;
}
