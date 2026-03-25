"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, Bell, MessageSquare, Store, TrendingDown } from "lucide-react";

interface Stats {
  emailSignups: number;
  users: number;
  activeAlerts: number;
  pendingComments: number;
  pendingPartners: number;
  priceDrops24h: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    emailSignups: 0,
    users: 0,
    activeAlerts: 0,
    pendingComments: 0,
    pendingPartners: 0,
    priceDrops24h: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: emailCount },
          { count: userCount },
          { count: alertCount },
          { count: commentCount },
          { count: partnerCount },
          { count: dropCount },
        ] = await Promise.all([
          supabase.from("email_signups").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("price_alerts").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("strain_comments").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("dispensary_partners").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
          supabase.from("price_drops").select("*", { count: "exact", head: true }).gte("detected_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        ]);

        setStats({
          emailSignups: emailCount || 0,
          users: userCount || 0,
          activeAlerts: alertCount || 0,
          pendingComments: commentCount || 0,
          pendingPartners: partnerCount || 0,
          priceDrops24h: dropCount || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Email Signups",
      value: stats.emailSignups,
      icon: Mail,
      description: "Total subscribers",
      href: "/admin/emails",
    },
    {
      title: "Users",
      value: stats.users,
      icon: Users,
      description: "Registered accounts",
      href: "/admin/users",
    },
    {
      title: "Active Alerts",
      value: stats.activeAlerts,
      icon: Bell,
      description: "Price watch alerts",
      href: "/admin/alerts",
    },
    {
      title: "Pending Comments",
      value: stats.pendingComments,
      icon: MessageSquare,
      description: "Awaiting moderation",
      href: "/admin/comments",
    },
    {
      title: "Partner Applications",
      value: stats.pendingPartners,
      icon: Store,
      description: "Pending verification",
      href: "/admin/partners",
    },
    {
      title: "Price Drops (24h)",
      value: stats.priceDrops24h,
      icon: TrendingDown,
      description: "Recent price changes",
      href: "/admin/prices",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor key metrics and system status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = card.href}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
                <CardDescription className="mt-1">{card.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
