"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Send } from "lucide-react";
import type { PriceAlert, PriceDrop } from "@/db/schema";

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [alertsRes, dropsRes] = await Promise.all([
          supabase.from("price_alerts").select("*").order("created_at", { ascending: false }),
          supabase.from("price_drops").select("*").eq("notified", "pending").order("detected_at", { ascending: false }).limit(50),
        ]);

        if (alertsRes.error) throw alertsRes.error;
        if (dropsRes.error) throw dropsRes.error;

        setAlerts(alertsRes.data || []);
        setDrops(dropsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statusCount = alerts.reduce((acc, alert) => {
    acc[alert.status] = (acc[alert.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSendNotifications = async () => {
    alert("Notification sending not yet implemented");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Price Alerts</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Price Alerts</h1>
          <p className="text-muted-foreground mt-1">{alerts.length} total alerts</p>
        </div>
        <Button onClick={handleSendNotifications} disabled={drops.length === 0}>
          <Send className="h-4 w-4 mr-2" />
          Send Notifications ({drops.length})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Triggered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.triggered || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.paused || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drops.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Price Drops</CardTitle>
          <CardDescription>Price decreases awaiting notification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Dispensary</TableHead>
                  <TableHead>Old Price</TableHead>
                  <TableHead>New Price</TableHead>
                  <TableHead>Drop</TableHead>
                  <TableHead>Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No pending notifications
                    </TableCell>
                  </TableRow>
                ) : (
                  drops.map((drop) => (
                    <TableRow key={drop.id}>
                      <TableCell className="font-medium">{drop.strainName}</TableCell>
                      <TableCell>{drop.dispensary}</TableCell>
                      <TableCell className="line-through text-muted-foreground">
                        ${parseFloat(drop.oldPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${parseFloat(drop.newPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          -{parseFloat(drop.dropPercent).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(drop.detectedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Price Alerts</CardTitle>
          <CardDescription>User-created price watch alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Target Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.strainName}</TableCell>
                      <TableCell>${parseFloat(alert.targetPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        {alert.currentPrice ? `$${parseFloat(alert.currentPrice).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alert.status === "active"
                              ? "default"
                              : alert.status === "triggered"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
