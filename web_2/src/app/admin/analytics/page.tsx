"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Signup {
  id: string;
  email: string;
  source: string | null;
  channel: string | null;
  city: string | null;
  region: string | null;
  subscribed_at: string;
}

interface GroupCount {
  label: string;
  count: number;
}

interface CityRow {
  city: string;
  region: string;
  count: number;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.charAt(0)}***@${domain}`;
}

function groupBy(rows: Signup[], key: keyof Signup): GroupCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const val = (row[key] as string) || "(none)";
    map.set(val, (map.get(val) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function topCities(rows: Signup[]): CityRow[] {
  const map = new Map<string, { region: string; count: number }>();
  for (const row of rows) {
    const city = row.city || "(unknown)";
    const region = row.region || "";
    const existing = map.get(city);
    if (existing) {
      existing.count++;
    } else {
      map.set(city, { region, count: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([city, { region, count }]) => ({ city, region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function HorizontalBar({
  items,
  maxCount,
}: {
  items: GroupCount[];
  maxCount: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-muted-foreground text-right">
            {item.label}
          </span>
          <div className="flex-1 bg-border/20 rounded h-6 relative">
            <div
              className="bg-cta rounded h-6 transition-all duration-500"
              style={{
                width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%",
              }}
            />
          </div>
          <span className="w-10 text-sm text-foreground tabular-nums text-right">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/30 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-border/30 rounded mb-3" />
      <div className="h-8 w-16 bg-border/30 rounded" />
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="space-y-2 animate-pulse">
      {[80, 60, 45, 30].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 h-4 bg-border/30 rounded" />
          <div className="flex-1 bg-border/20 rounded h-6">
            <div className="bg-border/30 rounded h-6" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-border/20 rounded" />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignups() {
      const { data, error } = await supabase
        .from("email_signups")
        .select("id, email, source, channel, city, region, subscribed_at")
        .order("subscribed_at", { ascending: false });

      if (!error && data) {
        setSignups(data as Signup[]);
      }
      setLoading(false);
    }
    fetchSignups();
  }, []);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const signupsThisWeek = signups.filter(
    (s) => new Date(s.subscribed_at) >= weekAgo
  );

  const bySource = groupBy(signups, "source");
  const byChannel = groupBy(signups, "channel");
  const cities = topCities(signups);

  const topChannel = byChannel.length > 0 ? byChannel[0].label : "—";
  const topCity = cities.length > 0 ? cities[0].city : "—";

  const maxSource = bySource.length > 0 ? bySource[0].count : 0;
  const maxChannel = byChannel.length > 0 ? byChannel[0].count : 0;

  const recent = signups.slice(0, 20);

  if (!loading && signups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Email signup analytics</p>
        </div>
        <div className="bg-card border border-border/30 rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-lg">No signups yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Data will appear here once users start signing up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Email signup analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-card border border-border/30 rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Signups</p>
              <p className="text-3xl font-bold tabular-nums">{signups.length}</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">This Week</p>
              <p className="text-3xl font-bold tabular-nums">
                {signupsThisWeek.length}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Top Channel</p>
              <p className="text-2xl font-bold truncate">{topChannel}</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Top City</p>
              <p className="text-2xl font-bold truncate">{topCity}</p>
            </div>
          </>
        )}
      </div>

      {/* Signups by Source */}
      <section className="bg-card border border-border/30 rounded-xl p-5">
        <h2 className="font-serif text-lg text-foreground mb-4">
          Signups by Source
        </h2>
        {loading ? (
          <SkeletonBar />
        ) : (
          <HorizontalBar items={bySource} maxCount={maxSource} />
        )}
      </section>

      {/* Signups by Channel */}
      <section className="bg-card border border-border/30 rounded-xl p-5">
        <h2 className="font-serif text-lg text-foreground mb-4">
          Signups by Channel
        </h2>
        {loading ? (
          <SkeletonBar />
        ) : (
          <HorizontalBar items={byChannel} maxCount={maxChannel} />
        )}
      </section>

      {/* Signups by City */}
      <section className="bg-card border border-border/30 rounded-xl p-5">
        <h2 className="font-serif text-lg text-foreground mb-4">
          Signups by City
        </h2>
        {loading ? (
          <SkeletonTable rows={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">City</th>
                  <th className="text-left py-2 pr-4 font-medium">Region</th>
                  <th className="text-right py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((row, i) => (
                  <tr key={row.city} className={`border-b border-border/10 ${i % 2 === 0 ? "" : "bg-card/50"}`}>
                    <td className="py-2 pr-4">{row.city}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.region || "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Signups */}
      <section className="bg-card border border-border/30 rounded-xl p-5">
        <h2 className="font-serif text-lg text-foreground mb-4">
          Recent Signups
        </h2>
        {loading ? (
          <SkeletonTable rows={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Email</th>
                  <th className="text-left py-2 pr-4 font-medium">Source</th>
                  <th className="text-left py-2 pr-4 font-medium">Channel</th>
                  <th className="text-left py-2 pr-4 font-medium">City</th>
                  <th className="text-right py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row, i) => (
                  <tr key={row.id} className={`border-b border-border/10 ${i % 2 === 0 ? "" : "bg-card/50"}`}>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {maskEmail(row.email)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.source || "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.channel || "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.city || "—"}
                    </td>
                    <td className="py-2 text-right text-muted-foreground tabular-nums">
                      {new Date(row.subscribed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
