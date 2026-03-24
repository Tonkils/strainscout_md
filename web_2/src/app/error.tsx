"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center w-full max-w-lg text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-6" />
        <h2 className="font-serif text-2xl text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          An unexpected error occurred. Try refreshing the page or go back home.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
