"use client";

import { useState, useEffect } from "react";
import { Leaf } from "lucide-react";

const AGE_KEY = "strainscout_age_verified";

export default function AgeGate({ onVerified }: { onVerified: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(AGE_KEY) === "true") {
      onVerified();
    } else {
      setVisible(true);
    }
  }, [onVerified]);

  if (!mounted || !visible) return null;

  const handleYes = () => {
    localStorage.setItem(AGE_KEY, "true");
    setVisible(false);
    onVerified();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      {denied ? (
        <div className="text-center max-w-sm">
          <p className="font-serif text-2xl text-foreground mb-3">Access Restricted</p>
          <p className="text-muted-foreground text-sm">
            You must be 21 or older to view cannabis pricing information.
          </p>
        </div>
      ) : (
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">
            Are you 21 or older?
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            You must be of legal age to view cannabis pricing information.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDenied(true)}
              className="flex-1 py-3.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              No
            </button>
            <button
              onClick={handleYes}
              className="flex-1 py-3.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-cta"
            >
              Yes, I&apos;m 21+
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
