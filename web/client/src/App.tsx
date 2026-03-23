import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";

// Eager-load Home (above the fold, first paint)
import Home from "./pages/Home";

// Lazy-load all other pages for code splitting
const MapView = lazy(() => import("./pages/MapView"));
const CompareStrains = lazy(() => import("./pages/CompareStrains"));
const TopValue = lazy(() => import("./pages/TopValue"));
const StrainDetail = lazy(() => import("./pages/StrainDetail"));
const Account = lazy(() => import("./pages/Account"));
const DispensaryDirectory = lazy(() => import("./pages/DispensaryDirectory"));
const DispensaryDetail = lazy(() => import("./pages/DispensaryDetail"));
const Deals = lazy(() => import("./pages/Deals"));
const Alerts = lazy(() => import("./pages/Alerts"));
const MarketDashboard = lazy(() => import("./pages/MarketDashboard"));
const DispensaryCompare = lazy(() => import("./pages/DispensaryCompare"));
const Moderation = lazy(() => import("./pages/Moderation"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal"));
const AdminPartners = lazy(() => import("./pages/AdminPartners"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/map"} component={MapView} />
        <Route path={"/compare"} component={CompareStrains} />
        <Route path={"/top-value"} component={TopValue} />
        <Route path={"/strain/:id"} component={StrainDetail} />
        <Route path={"/account"} component={Account} />
        <Route path={"/dispensaries"} component={DispensaryDirectory} />
        <Route path={"/dispensary/:slug"} component={DispensaryDetail} />
        <Route path={"/deals"} component={Deals} />
        <Route path={"/alerts"} component={Alerts} />
        <Route path={"/market"} component={MarketDashboard} />
        <Route path={"/compare/dispensaries"} component={DispensaryCompare} />
        <Route path={"/moderation"} component={Moderation} />
        <Route path={"/partner"} component={PartnerPortal} />
        <Route path={"/admin/partners"} component={AdminPartners} />
        <Route path={"/search"} component={CompareStrains} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
