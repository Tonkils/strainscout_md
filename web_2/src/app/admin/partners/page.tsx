"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Store, DollarSign } from "lucide-react";
import type { DispensaryPartner, PartnerPriceUpdate } from "@/db/schema";

export default function PartnersPage() {
  const [partners, setPartners] = useState<DispensaryPartner[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<PartnerPriceUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<DispensaryPartner | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [partnersRes, updatesRes] = await Promise.all([
          supabase.from("dispensary_partners").select("*").order("claimed_at", { ascending: false }),
          supabase.from("partner_price_updates").select("*").eq("status", "pending").order("submitted_at", { ascending: false }),
        ]);

        if (partnersRes.error) throw partnersRes.error;
        if (updatesRes.error) throw updatesRes.error;

        setPartners(partnersRes.data || []);
        setPriceUpdates(updatesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch partner data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statusCount = partners.reduce((acc, p) => {
    acc[p.verificationStatus] = (acc[p.verificationStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleVerifyPartner = async (partnerId: number, status: "verified" | "rejected") => {
    try {
      const { error } = await supabase
        .from("dispensary_partners")
        .update({
          verificationStatus: status,
          adminNote: adminNote || null,
          verifiedAt: status === "verified" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", partnerId);

      if (error) throw error;

      setPartners(partners.map(p =>
        p.id === partnerId
          ? { ...p, verificationStatus: status, adminNote: adminNote || null }
          : p
      ));
      setSelectedPartner(null);
      setAdminNote("");
    } catch (error) {
      console.error("Failed to verify partner:", error);
      alert("Failed to update partner status");
    }
  };

  const handleReviewPriceUpdate = async (updateId: number, status: "approved" | "rejected", note?: string) => {
    try {
      const { error } = await supabase
        .from("partner_price_updates")
        .update({
          status,
          reviewNote: note || null,
          reviewedAt: new Date().toISOString(),
        })
        .eq("id", updateId);

      if (error) throw error;

      setPriceUpdates(priceUpdates.filter(u => u.id !== updateId));
    } catch (error) {
      console.error("Failed to review price update:", error);
      alert("Failed to update price review status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Partner Portal</h1>
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
        <h1 className="text-3xl font-bold">Partner Portal</h1>
        <p className="text-muted-foreground mt-1">Dispensary applications and price updates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.verified || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.rejected || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Updates</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priceUpdates.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="price-updates">
            Price Updates {priceUpdates.length > 0 && `(${priceUpdates.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Applications</CardTitle>
              <CardDescription>Dispensary verification requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispensary</TableHead>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No partner applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell className="font-medium">{partner.dispensaryName}</TableCell>
                          <TableCell>{partner.businessName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{partner.contactEmail}</div>
                              {partner.contactPhone && (
                                <div className="text-muted-foreground">{partner.contactPhone}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {partner.partnerTier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                partner.verificationStatus === "verified"
                                  ? "default"
                                  : partner.verificationStatus === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {partner.verificationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(partner.claimedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {partner.verificationStatus === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPartner(partner)}
                              >
                                Review
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedPartner && (
            <Card>
              <CardHeader>
                <CardTitle>Review Application</CardTitle>
                <CardDescription>{selectedPartner.dispensaryName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Business Name</div>
                    <div>{selectedPartner.businessName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Dispensary Slug</div>
                    <div>{selectedPartner.dispensarySlug}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Contact Email</div>
                    <div>{selectedPartner.contactEmail}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Contact Phone</div>
                    <div>{selectedPartner.contactPhone || "—"}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Note (optional)</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a note about this verification..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleVerifyPartner(selectedPartner.id, "verified")}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    onClick={() => handleVerifyPartner(selectedPartner.id, "rejected")}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPartner(null);
                      setAdminNote("");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="price-updates">
          <Card>
            <CardHeader>
              <CardTitle>Price Update Queue</CardTitle>
              <CardDescription>Partner-submitted price changes pending review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispensary</TableHead>
                      <TableHead>Strain</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceUpdates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No pending price updates
                        </TableCell>
                      </TableRow>
                    ) : (
                      priceUpdates.map((update) => (
                        <TableRow key={update.id}>
                          <TableCell className="font-medium">{update.dispensaryName}</TableCell>
                          <TableCell>{update.strainName}</TableCell>
                          <TableCell className="font-bold">
                            ${parseFloat(update.price).toFixed(2)}
                          </TableCell>
                          <TableCell>{update.unit}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(update.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewPriceUpdate(update.id, "approved")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewPriceUpdate(update.id, "rejected")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
