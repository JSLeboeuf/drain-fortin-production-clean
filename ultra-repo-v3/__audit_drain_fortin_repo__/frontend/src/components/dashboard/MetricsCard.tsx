import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down" | "stable";
}

export default function MetricsCard({ title, value, change, icon, trend }: MetricsCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3" />;
      case "down":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-700";
      case "down":
        return "text-red-700";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className="card-premium group hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1" data-testid={`text-metric-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors" data-testid={`text-metric-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            <div className="flex items-center">
              <div className={cn("flex items-center px-2 py-1 rounded-full text-xs font-medium", getTrendColor(), {
                "bg-green-50 text-green-700 border border-green-200": trend === "up",
                "bg-red-50 text-red-700 border border-red-200": trend === "down",
                "bg-gray-50 text-gray-600 border border-gray-200": trend === "stable"
              })}>
                {getTrendIcon()}
                <span className="ml-1" data-testid={`text-metric-change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {change > 0 ? '+' : ''}{change}% vs hier
                </span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 quebec-accent">
            <div className="text-primary group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
