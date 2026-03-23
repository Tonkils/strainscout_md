/*
 * StrainScout MD — Account Page (Shell)
 * Design: Botanical Data Lab
 * Placeholder for saved strains, deal alerts, and preferences
 */

import { Bell, Bookmark, Settings, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function Account() {
  const handleFeatureClick = () => {
    toast("Feature coming soon", {
      description: "Account features will be available in a future update.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Your Account</h1>
        <p className="text-muted-foreground mb-8">Manage your saved strains, deal alerts, and preferences.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
              <Bookmark className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Saved Strains</h3>
            <p className="text-sm text-muted-foreground">Bookmark your favorite strains for quick access and price tracking.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-savings flex items-center justify-center mb-4 group-hover:opacity-80 transition-opacity">
              <Bell className="w-6 h-6 text-savings" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Deal Alerts</h3>
            <p className="text-sm text-muted-foreground">Get notified when your saved strains drop in price at nearby dispensaries.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-amber-500/15 flex items-center justify-center mb-4 group-hover:bg-amber-500/25 transition-colors">
              <Heart className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Preferences</h3>
            <p className="text-sm text-muted-foreground">Set your preferred dispensaries, location, and product categories.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-accent/80 transition-colors">
              <Settings className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Settings</h3>
            <p className="text-sm text-muted-foreground">Manage your account settings, email notifications, and data preferences.</p>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
