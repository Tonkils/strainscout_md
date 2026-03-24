import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MapPageClient from "./MapPageClient";

export const metadata: Metadata = {
  title: "Dispensary Map",
  description: "Interactive map of all Maryland cannabis dispensaries. Find the nearest dispensary, filter by strain, and get directions.",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  return (
    <Suspense fallback={
      <div role="status" className="flex items-center justify-center min-h-[60vh]">
        <Loader2 aria-hidden="true" className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-muted-foreground">Loading map…</span>
      </div>
    }>
      <MapPageClient />
    </Suspense>
  );
}
