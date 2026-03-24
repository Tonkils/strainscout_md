import Link from "next/link";
import { Leaf, Search, Home, GitCompareArrows } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-primary/50" />
          </div>
        </div>

        <p className="font-price text-6xl font-bold text-primary/30 mb-2">404</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">Page Not Found</h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-8 leading-relaxed">
          That strain, dispensary, or page doesn&apos;t exist — or it may have moved.
          Try searching or browse all strains below.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-card border border-border/50 text-foreground text-sm font-medium hover:border-primary/40 transition-colors"
          >
            <GitCompareArrows className="w-4 h-4" />
            Browse Strains
          </Link>
          <Link
            href="/dispensaries"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-card border border-border/50 text-foreground text-sm font-medium hover:border-primary/40 transition-colors"
          >
            <Search className="w-4 h-4" />
            Find Dispensaries
          </Link>
        </div>
      </div>
    </div>
  );
}
