"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Trash2, Search, ArrowLeft, CheckCircle, Clock, AlertTriangle } from "lucide-react";

type AlertItem = {
  id: number;
  strainName: string;
  strainId: string;
  dispensary: string;
  targetPrice: number;
  currentPrice: number | null;
  status: "active" | "paused" | "triggered";
  createdAt: string;
};

const STATUS_CONFIG = {
  active: { label: "Active", icon: Bell, color: "text-savings", bg: "bg-savings/10 border-savings/20" },
  paused: { label: "Paused", icon: BellOff, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  triggered: { label: "Triggered", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

// Demo alerts shown to users before they set up real ones
const DEMO_ALERTS: AlertItem[] = [
  { id: 1, strainName: "Wedding Cake", strainId: "wedding-cake", dispensary: "Any dispensary", targetPrice: 30, currentPrice: 35, status: "active", createdAt: "2026-03-01" },
  { id: 2, strainName: "Blue Dream", strainId: "blue-dream", dispensary: "Any dispensary", targetPrice: 25, currentPrice: 25, status: "triggered", createdAt: "2026-02-15" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(DEMO_ALERTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "triggered">("all");
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const filtered = alerts
    .filter((a) => filter === "all" || a.status === filter)
    .filter((a) =>
      !searchQuery ||
      a.strainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.dispensary.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const togglePause = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "paused" ? "active" : "paused" } : a
      )
    );
  };

  const deleteAlert = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-10">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Price Alerts</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Get notified when cannabis prices drop at Maryland dispensaries. Set your target price and we&apos;ll email you when it&apos;s hit.
          </p>
        </div>
      </section>

      {/* Email signup CTA */}
      {!emailSubmitted && (
        <div className="border-b border-cta/20 bg-cta/5">
          <div className="container py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Start tracking price drops</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enter your email to receive alerts when strain prices drop in Maryland.</p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); if (email) setEmailSubmitted(true); }}
                className="flex gap-2 w-full sm:w-auto"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 sm:w-64 bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cta/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover transition-colors shadow-cta whitespace-nowrap"
                >
                  Sign Up Free
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {emailSubmitted && (
        <div className="border-b border-savings/20 bg-savings/5">
          <div className="container py-4">
            <div className="flex items-center gap-2 text-savings text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>You&apos;re signed up! We&apos;ll notify you at <strong>{email}</strong> when prices drop.</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="container py-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-card border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg px-1 py-1">
            {(["all", "active", "paused", "triggered"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((alert) => {
              const cfg = STATUS_CONFIG[alert.status];
              const StatusIcon = cfg.icon;
              const priceMet = alert.currentPrice != null && alert.currentPrice <= alert.targetPrice;

              return (
                <div key={alert.id} className={`bg-card border rounded-lg p-4 ${priceMet ? "border-savings/30" : "border-border/30"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={`/strain/${alert.strainId}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                          {alert.strainName}
                        </Link>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{alert.dispensary}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Target: </span>
                          <span className="font-price font-bold text-foreground">${alert.targetPrice}</span>
                        </div>
                        {alert.currentPrice != null && (
                          <div>
                            <span className="text-muted-foreground text-xs">Current: </span>
                            <span className={`font-price font-bold ${priceMet ? "text-savings" : "text-foreground"}`}>
                              ${alert.currentPrice}
                            </span>
                          </div>
                        )}
                        {priceMet && (
                          <span className="text-[10px] text-savings font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Price met!
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePause(alert.id)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title={alert.status === "paused" ? "Resume" : "Pause"}
                      >
                        {alert.status === "paused" ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/20">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Created {alert.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No alerts found</p>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || filter !== "all"
                ? "Try clearing your filters."
                : "Browse strains and tap \"Alert Me\" to track price drops."}
            </p>
            <Link href="/compare" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta">
              Browse Strains
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
