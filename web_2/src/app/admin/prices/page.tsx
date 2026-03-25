"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingDown, Database } from "lucide-react";
import type { PriceDrop } from "@/db/schema";

export default function PriceHistoryPage() {
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchDrops() {
      try {
        const { data, error } = await supabase
          .from("price_drops")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        setDrops(data || []);
      } catch (error) {
        console.error("Failed to fetch price drops:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDrops();
  }, []);

  const filteredDrops = drops.filter(drop =>
    drop.strainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drop.dispensary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalDrops: drops.length,
    avgDrop: drops.length > 0
      ? drops.reduce((sum, d) => sum + parseFloat(d.dropPercent), 0) / drops.length
      : 0,
    largestDrop: drops.length > 0
      ? Math.max(...drops.map(d => parseFloat(d.dropPercent)))
      : 0,
    last24h: drops.filter(d =>
      new Date(d.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Price History</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Price History</h1>
        <p className="text-muted-foreground mt-1">Price drops and scraper health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Drops
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Drop
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDrop.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Drop
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.largestDrop.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 24h
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last24h}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Price Drops</CardTitle>
          <CardDescription>Historical price decreases across all dispensaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by strain or dispensary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Dispensary</TableHead>
                  <TableHead>Old Price</TableHead>
                  <TableHead>New Price</TableHead>
                  <TableHead>Drop</TableHead>
                  <TableHead>Notified</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No price drops found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrops.map((drop) => (
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
                          -{parseFloat(drop.dropPercent).toFixed(0)}% (${parseFloat(drop.dropAmount).toFixed(2)})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={drop.notified === "sent" ? "default" : "outline"}>
                          {drop.notified}
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
          <CardTitle>Scraper Health</CardTitle>
          <CardDescription>Monitor data collection status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Scraper status monitoring coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
