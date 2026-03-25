"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ThumbsUp, Star, TrendingUp } from "lucide-react";
import type { StrainVote } from "@/db/schema";

interface StrainRating {
  strainId: string;
  strainName: string;
  voteCount: number;
  avgEffectsAccuracy: number;
  avgValueForMoney: number;
  avgOverallQuality: number;
}

export default function StrainVotesPage() {
  const [votes, setVotes] = useState<StrainVote[]>([]);
  const [ratings, setRatings] = useState<StrainRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchVotes() {
      try {
        const { data, error } = await supabase
          .from("strain_votes")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const votesData = data || [];
        setVotes(votesData);

        // Calculate aggregate ratings per strain
        const strainMap = new Map<string, StrainVote[]>();
        votesData.forEach(vote => {
          const existing = strainMap.get(vote.strainId) || [];
          strainMap.set(vote.strainId, [...existing, vote]);
        });

        const ratingsData: StrainRating[] = Array.from(strainMap.entries()).map(([strainId, strainVotes]) => {
          const voteCount = strainVotes.length;
          const avgEffectsAccuracy = strainVotes.reduce((sum, v) => sum + v.effectsAccuracy, 0) / voteCount;
          const avgValueForMoney = strainVotes.reduce((sum, v) => sum + v.valueForMoney, 0) / voteCount;
          const avgOverallQuality = strainVotes.reduce((sum, v) => sum + v.overallQuality, 0) / voteCount;

          return {
            strainId,
            strainName: strainVotes[0].strainName,
            voteCount,
            avgEffectsAccuracy,
            avgValueForMoney,
            avgOverallQuality,
          };
        });

        ratingsData.sort((a, b) => b.avgOverallQuality - a.avgOverallQuality);
        setRatings(ratingsData);
      } catch (error) {
        console.error("Failed to fetch votes:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchVotes();
  }, []);

  const filteredRatings = ratings.filter(rating =>
    rating.strainName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalVotes: votes.length,
    uniqueStrains: ratings.length,
    avgQuality: ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.avgOverallQuality, 0) / ratings.length
      : 0,
    topRated: ratings.length > 0 ? ratings[0].strainName : "—",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Strain Votes</h1>
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
        <h1 className="text-3xl font-bold">Strain Votes Dashboard</h1>
        <p className="text-muted-foreground mt-1">User quality ratings and rankings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Votes</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rated Strains</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueStrains}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgQuality.toFixed(1)}/5</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Rated</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold line-clamp-1">{stats.topRated}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strain Quality Rankings</CardTitle>
          <CardDescription>Aggregate user ratings by strain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Effects Accuracy</TableHead>
                  <TableHead>Value for Money</TableHead>
                  <TableHead>Overall Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRatings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No strain ratings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRatings.map((rating, index) => (
                    <TableRow key={rating.strainId}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{rating.strainName}</TableCell>
                      <TableCell>{rating.voteCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(rating.avgEffectsAccuracy / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {rating.avgEffectsAccuracy.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(rating.avgValueForMoney / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {rating.avgValueForMoney.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-600"
                              style={{ width: `${(rating.avgOverallQuality / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">
                            {rating.avgOverallQuality.toFixed(1)}
                          </span>
                        </div>
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
          <CardTitle>Recent Votes</CardTitle>
          <CardDescription>Latest user-submitted strain ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Effects</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes.slice(0, 20).map((vote) => (
                  <TableRow key={vote.id}>
                    <TableCell className="font-medium">{vote.strainName}</TableCell>
                    <TableCell className="text-muted-foreground">User {vote.userId}</TableCell>
                    <TableCell>{vote.effectsAccuracy}/5</TableCell>
                    <TableCell>{vote.valueForMoney}/5</TableCell>
                    <TableCell className="font-bold">{vote.overallQuality}/5</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="line-clamp-1 text-sm text-muted-foreground">
                        {vote.comment || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(vote.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
