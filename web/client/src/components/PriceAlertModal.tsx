/**
 * PriceAlertModal — Modal for creating a price alert on a strain.
 * Pre-fills strain info, lets user set target price and optionally select a dispensary.
 * Requires login — shows login prompt if not authenticated.
 */
import { useState, useMemo } from "react";
import { Bell, DollarSign, Store, Loader2, AlertTriangle, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strainId: string;
  strainName: string;
  currentPrice?: number | null;
  dispensaries?: string[];
}

export default function PriceAlertModal({
  open,
  onOpenChange,
  strainId,
  strainName,
  currentPrice,
  dispensaries = [],
}: PriceAlertModalProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [targetPrice, setTargetPrice] = useState<string>(
    currentPrice ? String(Math.floor(currentPrice * 0.8)) : ""
  );
  const [selectedDispensary, setSelectedDispensary] = useState<string>("");

  const createAlert = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Price alert created!", {
        description: `We'll notify you when ${strainName} drops to $${targetPrice}${selectedDispensary ? ` at ${selectedDispensary}` : " at any dispensary"}.`,
      });
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      utils.alerts.hasAlert.invalidate({ strainId });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create alert", {
        description: error.message,
      });
    },
  });

  const priceNum = parseFloat(targetPrice);
  const isValidPrice = !isNaN(priceNum) && priceNum > 0;
  const isAboveCurrentPrice = currentPrice != null && priceNum >= currentPrice;

  const handleSubmit = () => {
    if (!isValidPrice) return;
    createAlert.mutate({
      strainId,
      strainName,
      targetPrice: priceNum,
      dispensary: selectedDispensary || null,
      currentPrice: currentPrice ?? undefined,
    });
  };

  // Suggested prices: 10%, 20%, 30% below current
  const suggestedPrices = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return [];
    return [
      { label: "10% off", price: Math.floor(currentPrice * 0.9) },
      { label: "20% off", price: Math.floor(currentPrice * 0.8) },
      { label: "30% off", price: Math.floor(currentPrice * 0.7) },
    ].filter((s) => s.price > 0);
  }, [currentPrice]);

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-cta" />
              Sign In Required
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a free account to set price alerts and get notified when strains drop in price.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <a
              href={getLoginUrl()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Set Alerts
            </a>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-cta" />
            Set Price Alert
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Get notified when <span className="text-foreground font-medium">{strainName}</span> drops to your target price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Current Price Display */}
          {currentPrice != null && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Current lowest price: </span>
                <span className="font-price font-bold text-savings">${currentPrice}</span>
              </div>
            </div>
          )}

          {/* Target Price Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-price">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
                className="w-full bg-background/80 border border-border/50 rounded-lg pl-8 pr-4 py-3 text-sm text-foreground font-price placeholder:text-muted-foreground focus:outline-none focus:border-cta/50 focus:shadow-cta transition-all"
              />
            </div>

            {/* Warning if above current price */}
            {isAboveCurrentPrice && (
              <div className="flex items-center gap-2 mt-2 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Target is at or above the current price. You'll be notified immediately when prices are checked.</span>
              </div>
            )}

            {/* Suggested prices */}
            {suggestedPrices.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] text-muted-foreground">Quick set:</span>
                {suggestedPrices.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setTargetPrice(String(s.price))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      targetPrice === String(s.price)
                        ? "bg-cta/15 border-cta/30 text-cta"
                        : "bg-background/50 border-border/30 text-muted-foreground hover:border-cta/20 hover:text-foreground"
                    }`}
                  >
                    ${s.price} ({s.label})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dispensary Selector */}
          {dispensaries.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Store className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
                Dispensary (optional)
              </label>
              <select
                value={selectedDispensary}
                onChange={(e) => setSelectedDispensary(e.target.value)}
                className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-cta/50 transition-all appearance-none"
              >
                <option value="">Any dispensary</option>
                {dispensaries.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Leave as "Any dispensary" to be notified about any price drop statewide.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isValidPrice || createAlert.isPending}
            className="w-full bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta font-semibold"
          >
            {createAlert.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            {createAlert.isPending ? "Creating Alert..." : "Set Price Alert"}
          </Button>

          <p className="text-[11px] text-muted-foreground/60 text-center">
            We check prices every Tuesday and Friday. Max 20 alerts per account. Alerts expire after 90 days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
