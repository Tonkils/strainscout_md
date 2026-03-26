/**
 * StrainCardSkeleton — loading placeholder matching DealCard dimensions.
 * Uses animate-pulse with bg-muted blocks. No text or numbers shown.
 */
export default function StrainCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden h-full flex flex-col animate-pulse">
      <div className="p-5 flex flex-col flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-12 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>

        {/* Strain name */}
        <div className="h-6 w-3/4 bg-muted rounded mb-1" />

        {/* Brand */}
        <div className="h-3 w-1/2 bg-muted rounded mb-2" />

        {/* THC + terpenes */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-12 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>

        {/* Price section */}
        <div className="mt-auto">
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="h-3 w-8 bg-muted rounded mb-1" />
              <div className="h-8 w-20 bg-muted rounded" />
            </div>
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
          {/* Dispensary + buy button row */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-6 w-12 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Price spread bar area */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-3 w-8 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-8 bg-muted rounded" />
        </div>
        <div className="h-1.5 rounded-full bg-muted" />
      </div>
    </div>
  );
}
