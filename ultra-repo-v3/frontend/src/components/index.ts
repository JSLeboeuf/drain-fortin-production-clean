// Barrel exports pour components - Re-exports ciblés optimisés pour tree-shaking

// Error Handling
export { ErrorBoundary, PageErrorBoundary } from "./ErrorBoundary";

// UI Components (plus utilisés)
export { Button } from "./ui/button";
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
export { Input } from "./ui/input";
export { SecureInput } from "./ui/secure-input";
export { SecureTextarea } from "./ui/secure-textarea";
export { Label } from "./ui/label";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
export { Badge } from "./ui/badge";
export { Separator } from "./ui/separator";
export { Toaster } from "./ui/toaster";
export { toast } from "./ui/toast";
export { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// Shared Components
export { default as Sidebar } from "./shared/Sidebar";
export { default as Header } from "./shared/Header";
export { default as LoadingSpinner } from "./shared/LoadingSpinner";
export { default as DataSourceIndicator } from "./shared/DataSourceIndicator";

// Dashboard Components
export { default as MetricsCard } from "./dashboard/MetricsCard";
export { default as LiveCallCard } from "./dashboard/LiveCallCard";
export { default as CallsTable } from "./dashboard/CallsTable";
export { default as AlertBanner } from "./dashboard/AlertBanner";
export { default as EnhancedAlertBanner } from "./dashboard/EnhancedAlertBanner";
export { default as EnhancedMetricsCard } from "./dashboard/EnhancedMetricsCard";
export { default as OnboardingChecklist } from "./dashboard/OnboardingChecklist";

// Analytics Components
export { default as CallsChart } from "./analytics/CallsChart";
export { default as ConversionFunnel } from "./analytics/ConversionFunnel";
export { default as RevenueChart } from "./analytics/RevenueChart";

// Settings Components
export { default as PromptEditor } from "./settings/PromptEditor";
export { default as PriceManager } from "./settings/PriceManager";
export { default as ConstraintValidator } from "./settings/ConstraintValidator";
export { default as EffectiveValueBadge } from "./settings/EffectiveValueBadge";

// Skeletons
export { default as TableSkeleton } from "./skeletons/TableSkeleton";

// Accessibility
export { default as SkipLink } from "./SkipLink";