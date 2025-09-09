import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SkipLink from "@/components/SkipLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GlobalP1Banner from "@/components/GlobalP1Banner";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import GlobalShortcuts from "@/components/GlobalShortcuts";
import GlobalHelpOverlay from "@/components/GlobalHelpOverlay";
import GlobalFab from "@/components/GlobalFab";
import { RealtimeConnection } from "@/components/RealtimeConnection";

// Route-based code splitting avec lazy loading
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Calls = lazy(() => import("@/pages/Calls"));
const CallDetail = lazy(() => import("@/pages/CallDetail"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const SettingsPrompts = lazy(() => import("@/pages/SettingsPrompts"));
const SettingsPricing = lazy(() => import("@/pages/SettingsPricing"));
const SettingsConstraints = lazy(() => import("@/pages/SettingsConstraints"));
const Test = lazy(() => import("@/pages/Test"));
const TestConnections = lazy(() => import("@/pages/TestConnections"));
const DrainFortinServices = lazy(() => import("@/pages/services/DrainFortinServices"));
const RealTimeMonitoring = lazy(() => import("@/pages/RealTimeMonitoring"));
const GuillaumeSettings = lazy(() => import("@/pages/settings/GuillaumeSettings"));
const ClientIntake = lazy(() => import("@/pages/ClientIntake"));
const PricingTool = lazy(() => import("@/pages/PricingTool"));
const Templates = lazy(() => import("@/pages/Templates"));
const CRM = lazy(() => import("@/pages/CRM"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Composant de fallback pour le chargement
function Fallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calls" component={Calls} />
      <Route path="/calls/:id" component={CallDetail} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/prompts" component={SettingsPrompts} />
      <Route path="/settings/pricing" component={SettingsPricing} />
      <Route path="/settings/constraints" component={SettingsConstraints} />
      <Route path="/settings/guillaume" component={GuillaumeSettings} />
      <Route path="/services" component={DrainFortinServices} />
      <Route path="/intake" component={ClientIntake} />
      <Route path="/pricing" component={PricingTool} />
      <Route path="/templates" component={Templates} />
      <Route path="/crm" component={CRM} />
      <Route path="/monitoring" component={RealTimeMonitoring} />
      <Route path="/test" component={Test} />
      <Route path="/test-connections" component={TestConnections} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GlobalP1Banner />
          <NetworkStatusBanner />
          <GlobalShortcuts />
          <GlobalHelpOverlay />
          <GlobalFab />
          <SkipLink />
          <RealtimeConnection />
          <Toaster />
          <Suspense fallback={<Fallback />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
