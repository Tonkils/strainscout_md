/*
 * StrainScout MD — Admin Partner Management
 * Admin-only page for reviewing partner claims and price submissions.
 * Two tabs: Partner Claims and Price Updates.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import {
  Shield, CheckCircle, XCircle, Clock,
  Building2, DollarSign, User, ChevronDown,
  Loader2, ArrowLeft, BadgeCheck, Send
} from "lucide-react";
import { toast } from "sonner";

type Tab = "claims" | "prices";
type ClaimFilter = "all" | "pending" | "verified" | "rejected";
type PriceFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminPartners() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("claims");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("pending");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("pending");
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const [expandedItem, setExpandedItem] = useState<{ type: "claim" | "price"; id: number } | null>(null);

  const utils = trpc.useUtils();

  // Partner claims queries
  const claimStatus = claimFilter === "all" ? undefined : claimFilter;
  const { data: partners, isLoading: partnersLoading } = trpc.partners.adminList.useQuery(
    { status: claimStatus as "pending" | "verified" | "rejected" | undefined, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: pendingClaimCount } = trpc.partners.adminPendingCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Price updates queries
  const priceStatus = priceFilter === "all" ? undefined : priceFilter;
  const { data: priceUpdates, isLoading: pricesLoading } = trpc.partners.adminPriceUpdates.useQuery(
    { status: priceStatus as "pending" | "approved" | "rejected" | undefined, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: pendingPriceCount } = trpc.partners.adminPendingPriceCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Mutations
  const verifyMutation = trpc.partners.adminVerify.useMutation({
    onSuccess: (data) => {
      toast.success(`Partner ${data.verificationStatus === "verified" ? "verified" : "rejected"}`);
      utils.partners.adminList.invalidate();
      utils.partners.adminPendingCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reviewPriceMutation = trpc.partners.adminReviewPrice.useMutation({
    onSuccess: (data) => {
      toast.success(`Price ${data.status === "approved" ? "approved" : "rejected"}`);
      utils.partners.adminPriceUpdates.invalidate();
      utils.partners.adminPendingPriceCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleVerify = (partnerId: number, action: "verified" | "rejected") => {
    verifyMutation.mutate({
      partnerId,
      action,
      adminNote: adminNote[partnerId] || undefined,
    });
  };

  const handleReviewPrice = (priceUpdateId: number, action: "approved" | "rejected") => {
    reviewPriceMutation.mutate({
      priceUpdateId,
      action,
      reviewNote: reviewNote[priceUpdateId] || undefined,
    });
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">
            This page is restricted to site administrators.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
      pending: { color: "text-amber-400", bg: "bg-amber-500/15", icon: Clock },
      verified: { color: "text-savings", bg: "bg-savings/15", icon: CheckCircle },
      rejected: { color: "text-destructive", bg: "bg-destructive/15", icon: XCircle },
      approved: { color: "text-savings", bg: "bg-savings/15", icon: CheckCircle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/moderation" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-foreground">
                Partner Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Review claims and price submissions
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card border border-border/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("claims")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "claims"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Claims
            {typeof pendingClaimCount === "number" && pendingClaimCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {pendingClaimCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("prices")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "prices"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Price Updates
            {typeof pendingPriceCount === "number" && pendingPriceCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {pendingPriceCount}
              </span>
            )}
          </button>
        </div>

        {/* Claims Tab */}
        {tab === "claims" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["pending", "verified", "rejected", "all"] as ClaimFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setClaimFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    claimFilter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground bg-card border border-border/30"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {partnersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !partners || partners.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No partner claims found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border/30 rounded-lg overflow-hidden"
                  >
                    <div
                      className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() =>
                        setExpandedItem(prev => prev?.type === "claim" && prev.id === p.id ? null : { type: "claim", id: p.id })
                      }
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {p.dispensaryName}
                          </span>
                          {statusBadge(p.verificationStatus)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.businessName} · {p.contactEmail}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(p.claimedAt).toLocaleDateString()}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedItem?.type === "claim" && expandedItem.id === p.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {expandedItem?.type === "claim" && expandedItem.id === p.id && (
                      <div className="px-5 pb-4 border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Dispensary Slug</span>
                            <p className="text-foreground">{p.dispensarySlug}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Business Name</span>
                            <p className="text-foreground">{p.businessName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Contact Email</span>
                            <p className="text-foreground">{p.contactEmail}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Phone</span>
                            <p className="text-foreground">{p.contactPhone || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Partner Tier</span>
                            <p className="text-foreground capitalize">{p.partnerTier}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">User ID</span>
                            <p className="text-foreground">{p.userId}</p>
                          </div>
                        </div>

                        {p.adminNote && (
                          <div className="mb-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                            <strong>Admin Note:</strong> {p.adminNote}
                          </div>
                        )}

                        {p.verificationStatus === "pending" && (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Admin note (optional)..."
                              value={adminNote[p.id] || ""}
                              onChange={(e) =>
                                setAdminNote((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerify(p.id, "verified")}
                                disabled={verifyMutation.isPending}
                                className="flex-1 px-4 py-2 bg-savings/15 text-savings border border-savings/25 rounded-lg text-sm font-medium hover:bg-savings/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerify(p.id, "rejected")}
                                disabled={verifyMutation.isPending}
                                className="flex-1 px-4 py-2 bg-destructive/15 text-destructive border border-destructive/25 rounded-lg text-sm font-medium hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price Updates Tab */}
        {tab === "prices" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["pending", "approved", "rejected", "all"] as PriceFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPriceFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    priceFilter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground bg-card border border-border/30"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {pricesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !priceUpdates || priceUpdates.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No price updates found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priceUpdates.map((pu) => (
                  <div
                    key={pu.id}
                    className="bg-card border border-border/30 rounded-lg overflow-hidden"
                  >
                    <div
                      className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() =>
                        setExpandedItem(prev => prev?.type === "price" && prev.id === pu.id ? null : { type: "price", id: pu.id })
                      }
                    >
                      <div className="w-9 h-9 rounded-full bg-cta/15 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-cta" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {pu.strainName}
                          </span>
                          <span className="font-price text-sm font-bold text-foreground">
                            ${pu.price}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            / {pu.unit}
                          </span>
                          {statusBadge(pu.status)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {pu.dispensaryName} · Partner #{pu.partnerId}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(pu.submittedAt).toLocaleDateString()}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedItem?.type === "price" && expandedItem.id === pu.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {expandedItem?.type === "price" && expandedItem.id === pu.id && (
                      <div className="px-5 pb-4 border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Strain ID</span>
                            <p className="text-foreground font-mono text-xs">{pu.strainId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Dispensary</span>
                            <p className="text-foreground">{pu.dispensaryName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Expires</span>
                            <p className="text-foreground">
                              {pu.expiresAt
                                ? new Date(pu.expiresAt).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Reviewed</span>
                            <p className="text-foreground">
                              {pu.reviewedAt
                                ? new Date(pu.reviewedAt).toLocaleDateString()
                                : "Not yet"}
                            </p>
                          </div>
                        </div>

                        {pu.reviewNote && (
                          <div className="mb-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                            <strong>Review Note:</strong> {pu.reviewNote}
                          </div>
                        )}

                        {pu.status === "pending" && (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Review note (optional)..."
                              value={reviewNote[pu.id] || ""}
                              onChange={(e) =>
                                setReviewNote((prev) => ({
                                  ...prev,
                                  [pu.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewPrice(pu.id, "approved")}
                                disabled={reviewPriceMutation.isPending}
                                className="flex-1 px-4 py-2 bg-savings/15 text-savings border border-savings/25 rounded-lg text-sm font-medium hover:bg-savings/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewPrice(pu.id, "rejected")}
                                disabled={reviewPriceMutation.isPending}
                                className="flex-1 px-4 py-2 bg-destructive/15 text-destructive border border-destructive/25 rounded-lg text-sm font-medium hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
