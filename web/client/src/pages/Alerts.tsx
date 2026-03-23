/**
 * Alerts Dashboard — Manage price alerts
 * Requires authentication. Shows all user alerts with status, target price,
 * and actions (pause/resume, edit, delete).
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Bell, BellOff, Trash2, Pencil, Loader2, ArrowLeft,
  CheckCircle, Clock, AlertTriangle, Pause, Play, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type AlertStatus = "active" | "paused" | "triggered" | "expired";

const STATUS_CONFIG: Record<AlertStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active: { label: "Active", icon: Bell, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  paused: { label: "Paused", icon: Pause, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  triggered: { label: "Triggered", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  expired: { label: "Expired", icon: Clock, color: "text-muted-foreground", bg: "bg-muted/10 border-border/30" },
};

export default function Alerts() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: alerts, isLoading } = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlert, setEditingAlert] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const updateAlert = trpc.alerts.update.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      toast.success("Alert updated");
      setEditingAlert(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAlert = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      toast.success("Alert deleted");
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    let result = [...alerts];
    if (filter !== "all") {
      result = result.filter((a) => a.status === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.strainName.toLowerCase().includes(q) ||
          (a.dispensary && a.dispensary.toLowerCase().includes(q))
      );
    }
    return result;
  }, [alerts, filter, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!alerts) return { all: 0, active: 0, paused: 0, triggered: 0, expired: 0 };
    return {
      all: alerts.length,
      active: alerts.filter((a) => a.status === "active").length,
      paused: alerts.filter((a) => a.status === "paused").length,
      triggered: alerts.filter((a) => a.status === "triggered").length,
      expired: alerts.filter((a) => a.status === "expired").length,
    };
  }, [alerts]);

  // Not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cta/10 flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-cta" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">Price Alerts</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to create price alerts and get notified when your favorite strains drop in price.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta"
          >
            Sign In to Get Started
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">My Price Alerts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {statusCounts.active} active · {statusCounts.triggered} triggered · Max 20 alerts
            </p>
          </div>
          <Link href="/compare">
            <Button className="bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta">
              <Bell className="w-4 h-4 mr-2" />
              Browse Strains
            </Button>
          </Link>
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["all", "active", "paused", "triggered", "expired"] as const).map((status) => {
              const count = statusCounts[status];
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    filter === status
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-card border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex-1 sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border/30 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(isLoading || authLoading) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading alerts...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !authLoading && filteredAlerts.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/30 rounded-lg">
            <BellOff className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-foreground mb-2">
              {filter !== "all" ? `No ${filter} alerts` : "No alerts yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              {filter !== "all"
                ? "Try a different filter or create new alerts from strain pages."
                : "Browse strains and tap the Alert Me button to get notified when prices drop."}
            </p>
            <Link href="/compare">
              <Button className="bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta">
                Browse Strains
              </Button>
            </Link>
          </div>
        )}

        {/* Alerts List */}
        {!isLoading && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = STATUS_CONFIG[alert.status as AlertStatus] || STATUS_CONFIG.active;
              const StatusIcon = config.icon;
              const isEditing = editingAlert === alert.id;
              const isActive = alert.status === "active";
              const isPaused = alert.status === "paused";
              const canModify = isActive || isPaused;

              return (
                <div
                  key={alert.id}
                  className={`bg-card border rounded-lg overflow-hidden transition-all ${
                    alert.status === "triggered"
                      ? "border-primary/30 shadow-lg shadow-primary/5"
                      : alert.status === "expired"
                      ? "border-border/20 opacity-70"
                      : "border-border/30"
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} shrink-0 w-fit`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </div>

                      {/* Strain Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/strain/${alert.strainId}`}
                          className="text-foreground font-medium hover:text-primary transition-colors text-sm sm:text-base truncate block"
                        >
                          {alert.strainName}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {alert.dispensary ? (
                            <span>at {alert.dispensary}</span>
                          ) : (
                            <span>Any dispensary</span>
                          )}
                          <span className="text-border">·</span>
                          <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                          {alert.expiresAt && (
                            <>
                              <span className="text-border">·</span>
                              <span>Expires {new Date(alert.expiresAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Target</p>
                          <p className="font-price text-lg font-bold text-foreground">
                            ${Number(alert.targetPrice).toFixed(0)}
                          </p>
                        </div>
                        {alert.currentPrice && (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                            <p className="font-price text-lg font-bold text-savings">
                              ${Number(alert.currentPrice).toFixed(0)}
                            </p>
                          </div>
                        )}

                        {/* Triggered info */}
                        {alert.status === "triggered" && alert.triggeredPrice && (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Hit</p>
                            <p className="font-price text-lg font-bold text-primary">
                              ${Number(alert.triggeredPrice).toFixed(0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {canModify && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Pause/Resume */}
                          <button
                            onClick={() => {
                              updateAlert.mutate({
                                id: alert.id,
                                status: isActive ? "paused" : "active",
                              });
                            }}
                            disabled={updateAlert.isPending}
                            className="p-2 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title={isActive ? "Pause alert" : "Resume alert"}
                          >
                            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingAlert(alert.id);
                              setEditPrice(String(Number(alert.targetPrice)));
                            }}
                            className="p-2 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit target price"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(alert.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Triggered: link to strain */}
                      {alert.status === "triggered" && (
                        <Link href={`/strain/${alert.strainId}`}>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            View Deal
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Triggered details with notification history */}
                    {alert.status === "triggered" && alert.triggeredDispensary && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                        <p className="text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-primary inline mr-1.5" />
                          Price dropped to <span className="font-price font-bold text-primary">${Number(alert.triggeredPrice).toFixed(0)}</span> at{" "}
                          <span className="font-medium">{alert.triggeredDispensary}</span>
                          {alert.triggeredAt && (
                            <span className="text-muted-foreground"> on {new Date(alert.triggeredAt).toLocaleDateString()}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-primary/10">
                          <span className="inline-flex items-center gap-1">
                            <Bell className="w-3 h-3 text-primary" />
                            Notification sent
                          </span>
                          {alert.triggeredAt && (
                            <span>
                              {new Date(alert.triggeredAt).toLocaleString("en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true
                              })}
                            </span>
                          )}
                          {alert.targetPrice && alert.triggeredPrice && (
                            <span className="text-savings font-price font-medium">
                              Saved ${(Number(alert.targetPrice) - Number(alert.triggeredPrice)).toFixed(0)} vs target
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        {!isLoading && alerts && alerts.length > 0 && (
          <div className="mt-8 p-4 rounded-lg bg-card border border-border/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How alerts work</p>
                <p>
                  We check prices every Tuesday and Friday against the Maryland dispensary catalog.
                  When a strain hits your target price, the alert triggers and you'll see it here.
                  Alerts expire after 90 days of no trigger. You can have up to 20 active alerts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={editingAlert !== null} onOpenChange={(open) => !open && setEditingAlert(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground">Edit Target Price</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Update the price at which you want to be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-price">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full bg-background/80 border border-border/50 rounded-lg pl-8 pr-4 py-3 text-sm text-foreground font-price focus:outline-none focus:border-cta/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingAlert(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover"
                disabled={!editPrice || parseFloat(editPrice) <= 0 || updateAlert.isPending}
                onClick={() => {
                  if (editingAlert) {
                    updateAlert.mutate({
                      id: editingAlert,
                      targetPrice: parseFloat(editPrice),
                    });
                  }
                }}
              >
                {updateAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground">Delete Alert</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete this price alert? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteAlert.isPending}
              onClick={() => {
                if (deleteConfirm) {
                  deleteAlert.mutate({ id: deleteConfirm });
                }
              }}
            >
              {deleteAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
