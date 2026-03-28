/*
 * StrainScout MD — Partner Portal
 * Design: Botanical Data Lab
 * Three states: (1) Not logged in → CTA to login
 *               (2) No partnership → Claim wizard
 *               (3) Active partner → Dashboard + price update
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCatalog, type CatalogDispensary, type CatalogStrain } from "@/hooks/useCatalog";
import { toast } from "sonner";
import { trackPartnerClaimed, trackPartnerPriceSubmitted } from "@/lib/analytics";
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Search,
  DollarSign,
  Package,
  TrendingUp,
  Shield,
  Loader2,
  ArrowRight,
  LogIn,
  BadgeCheck,
} from "lucide-react";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Claim Wizard ────────────────────────────────────────────────────────────

function ClaimWizard({ dispensaries, onSuccess }: {
  dispensaries: CatalogDispensary[];
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispensary, setSelectedDispensary] = useState<CatalogDispensary | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const claimMutation = trpc.partners.claim.useMutation({
    onSuccess: () => {
      if (selectedDispensary) {
        trackPartnerClaimed(
          slugify(selectedDispensary.name),
          selectedDispensary.name,
          businessName
        );
      }
      toast.success("Partnership claim submitted!", {
        description: "We'll review your claim and get back to you within 48 hours.",
      });
      onSuccess();
    },
    onError: (err) => {
      toast.error("Claim failed", { description: err.message });
    },
  });

  const filteredDispensaries = useMemo(() => {
    if (!searchQuery) return dispensaries.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return dispensaries
      .filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q))
      .slice(0, 20);
  }, [dispensaries, searchQuery]);

  const handleSubmit = () => {
    if (!selectedDispensary) return;
    claimMutation.mutate({
      dispensarySlug: slugify(selectedDispensary.name),
      dispensaryName: selectedDispensary.name,
      businessName,
      contactEmail,
      contactPhone: contactPhone || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  s < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Dispensary */}
      {step === 1 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Select Your Dispensary
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Search for the dispensary you own or operate in Maryland.
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dispensaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredDispensaries.map((d) => (
              <button
                key={d.name}
                onClick={() => setSelectedDispensary(d)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  selectedDispensary?.name === d.name
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/30 bg-background hover:border-primary/30 text-foreground/80"
                }`}
              >
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.city} · {d.strain_count} strains tracked
                </div>
              </button>
            ))}
            {filteredDispensaries.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No dispensaries found. Try a different search.
              </p>
            )}
          </div>

          <button
            onClick={() => selectedDispensary && setStep(2)}
            disabled={!selectedDispensary}
            className="mt-4 w-full px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue with {selectedDispensary?.name || "..."}
          </button>
        </div>
      )}

      {/* Step 2: Business Information */}
      {step === 2 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Business Information
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Provide your business details for verification. We'll verify ownership
            within 48 hours.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Legal Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Green Leaf Wellness LLC"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="owner@dispensary.com"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(410) 555-0123"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              Back
            </button>
            <button
              onClick={() =>
                businessName.trim() && contactEmail.trim() && setStep(3)
              }
              disabled={!businessName.trim() || !contactEmail.trim()}
              className="flex-1 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Review Your Claim
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please confirm the details below are correct.
          </p>

          <div className="space-y-3 bg-background rounded-lg p-4 border border-border/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispensary</span>
              <span className="text-foreground font-medium">
                {selectedDispensary?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground">{selectedDispensary?.city}</span>
            </div>
            <div className="border-t border-border/30 pt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Business Name</span>
              <span className="text-foreground">{businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{contactEmail}</span>
            </div>
            {contactPhone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{contactPhone}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={claimMutation.isPending}
              className="flex-1 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {claimMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Claim
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Price Update Form ───────────────────────────────────────────────────────

function PriceUpdateForm({ strains }: { strains: CatalogStrain[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<CatalogStrain | null>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"3.5g" | "7g" | "14g" | "28g">("3.5g");

  const utils = trpc.useUtils();

  const submitMutation = trpc.partners.submitPrice.useMutation({
    onSuccess: () => {
      if (selectedStrain) {
        trackPartnerPriceSubmitted(
          selectedStrain.id,
          selectedStrain.name,
          price,
          unit,
          "partner-portal"
        );
      }
      toast.success("Price submitted!", {
        description: "Your price update is pending review.",
      });
      setSelectedStrain(null);
      setPrice("");
      setSearchQuery("");
      utils.partners.myPriceUpdates.invalidate();
      utils.partners.myStats.invalidate();
    },
    onError: (err) => {
      toast.error("Submission failed", { description: err.message });
    },
  });

  const filteredStrains = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return strains
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [strains, searchQuery]);

  const handleSubmit = () => {
    if (!selectedStrain || !price) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Invalid price", { description: "Please enter a valid price." });
      return;
    }
    submitMutation.mutate({
      strainId: selectedStrain.id,
      strainName: selectedStrain.name,
      price: priceNum,
      unit,
    });
  };

  return (
    <div className="bg-card border border-border/30 rounded-xl p-6">
      <h3 className="font-serif text-xl text-foreground mb-1">
        Submit Price Update
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Submit current prices for strains you carry. Approved prices receive a
        "Partner Verified" badge.
      </p>

      <div className="space-y-4">
        {/* Strain Search */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Strain *
          </label>
          {selectedStrain ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm font-medium text-foreground">
                  {selectedStrain.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  by {selectedStrain.brand}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedStrain(null);
                  setSearchQuery("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search strains (min 2 characters)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {filteredStrains.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStrains.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStrain(s);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0"
                    >
                      <div className="text-sm font-medium text-foreground">
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.brand} · {s.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Price *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Unit Size
            </label>
            <select
              value={unit}
              onChange={(e) =>
                setUnit(e.target.value as "3.5g" | "7g" | "14g" | "28g")
              }
              className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="3.5g">3.5g (Eighth)</option>
              <option value="7g">7g (Quarter)</option>
              <option value="14g">14g (Half)</option>
              <option value="28g">28g (Ounce)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedStrain || !price || submitMutation.isPending}
          className="w-full px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Price
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Partner Dashboard ───────────────────────────────────────────────────────

function PartnerDashboard({ strains }: { strains: CatalogStrain[] }) {
  const { data: statsData, isLoading: statsLoading } =
    trpc.partners.myStats.useQuery();
  const { data: priceUpdates } = trpc.partners.myPriceUpdates.useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!statsData) return null;

  const { partner, stats } = statsData;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/15",
      label: "Pending Verification",
      desc: "Your claim is being reviewed. You'll be able to submit prices once verified.",
    },
    verified: {
      icon: CheckCircle2,
      color: "text-savings",
      bg: "bg-savings/15",
      label: "Verified Partner",
      desc: "Your dispensary is verified. Submit prices to earn the Partner Verified badge.",
    },
    rejected: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/15",
      label: "Claim Rejected",
      desc: partner.adminNote || "Your claim was not approved. Contact support for details.",
    },
  };

  const status = statusConfig[partner.verificationStatus];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`${status.bg} border border-border/30 rounded-xl p-5`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-6 h-6 ${status.color} shrink-0 mt-0.5`} />
          <div>
            <h3 className="font-serif text-lg text-foreground">
              {partner.dispensaryName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bg}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Claimed{" "}
                {new Date(partner.claimedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{status.desc}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {partner.verificationStatus === "verified" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Total Submitted
                </span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">
                {stats.totalSubmitted}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-savings" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <p className="font-price text-2xl font-bold text-savings">
                {stats.approved}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="font-price text-2xl font-bold text-amber-400">
                {stats.pending}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Rejected</span>
              </div>
              <p className="font-price text-2xl font-bold text-destructive">
                {stats.rejected}
              </p>
            </div>
          </div>

          {/* Price Update Form */}
          <PriceUpdateForm strains={strains} />

          {/* Recent Submissions */}
          {priceUpdates && priceUpdates.length > 0 && (
            <div className="bg-card border border-border/30 rounded-xl p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                Recent Submissions
              </h3>
              <div className="space-y-2">
                {priceUpdates.slice(0, 10).map((pu) => (
                  <div
                    key={pu.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background border border-border/20"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {pu.strainName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {pu.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-price text-sm font-bold text-foreground">
                        ${pu.price}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pu.status === "approved"
                            ? "text-savings bg-savings/15"
                            : pu.status === "pending"
                            ? "text-amber-400 bg-amber-500/15"
                            : "text-destructive bg-destructive/15"
                        }`}
                      >
                        {pu.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PartnerPortal() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { catalog, loading: catalogLoading } = useCatalog();
  const { data: partnership, isLoading: partnerLoading, refetch } =
    trpc.partners.myPartnership.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const dispensaries = catalog?.dispensaries ?? [];
  const strains = catalog?.strains ?? [];

  const isLoading = authLoading || catalogLoading || (isAuthenticated && partnerLoading);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                Partner Portal
              </h1>
              <p className="text-sm text-muted-foreground">
                For Maryland dispensary owners and operators
              </p>
            </div>
          </div>

          {!isAuthenticated && !authLoading && (
            <p className="text-muted-foreground max-w-xl mt-2">
              Claim your dispensary listing, submit verified prices, and earn the
              Partner Verified badge that builds trust with customers.
            </p>
          )}
        </div>
      </section>

      <div className="container py-8 sm:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading...</span>
          </div>
        ) : !isAuthenticated ? (
          /* Not logged in — show benefits + CTA */
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                {
                  icon: BadgeCheck,
                  title: "Partner Verified Badge",
                  desc: "Your prices display with a trusted verification badge across the site.",
                },
                {
                  icon: TrendingUp,
                  title: "Increase Visibility",
                  desc: "Verified dispensaries rank higher in search results and comparisons.",
                },
                {
                  icon: DollarSign,
                  title: "Real-Time Pricing",
                  desc: "Submit current prices so customers see accurate, up-to-date information.",
                },
                {
                  icon: Shield,
                  title: "Build Trust",
                  desc: "Show customers you're committed to price transparency in Maryland.",
                },
              ].map((benefit) => (
                <div
                  key={benefit.title}
                  className="bg-card border border-border/30 rounded-lg p-5"
                >
                  <benefit.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-serif text-base text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-cta text-cta-foreground font-semibold rounded-lg hover:bg-cta-hover transition-colors shadow-cta"
              >
                <LogIn className="w-5 h-5" />
                Sign In to Claim Your Dispensary
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                Free to join. No credit card required.
              </p>
            </div>
          </div>
        ) : !partnership ? (
          /* Logged in but no claim — show wizard */
          <ClaimWizard
            dispensaries={dispensaries}
            onSuccess={() => refetch()}
          />
        ) : (
          /* Active partner — show dashboard */
          <PartnerDashboard strains={strains} />
        )}
      </div>

      <Footer />
    </div>
  );
}
