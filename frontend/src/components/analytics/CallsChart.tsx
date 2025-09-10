import { memo, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CallsData {
  time: string;
  calls: number;
}

interface CallsChartProps {
  data: CallsData[];
  title?: string;
}

// Performance optimized CallsChart with React.memo and useMemo
const CallsChart = memo<CallsChartProps>(function CallsChart({ 
  data, 
  title = "Appels des dernières 24h" 
}) {
  const [timeframe, setTimeframe] = useState("24h");

  // Memoized data processing to avoid recalculation on every render
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Pre-process data for better performance
    return data.map((item, index) => ({
      ...item,
      // Add computed properties if needed
      index,
      formattedTime: item.time,
    }));
  }, [data]);

  // Memoized timeframe options to prevent recreating on each render
  const timeframeOptions = useMemo(() => [
    { value: "24h", label: "24h" },
    { value: "7j", label: "7j" },
    { value: "30j", label: "30j" }
  ], []);

  // Memoized chart configuration for better performance
  const chartConfig = useMemo(() => ({
    cartesianGrid: {
      strokeDasharray: "3 3",
      stroke: "hsl(var(--border))"
    },
    xAxis: {
      tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
      axisLine: { stroke: 'hsl(var(--border))' }
    },
    yAxis: {
      tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
      axisLine: { stroke: 'hsl(var(--border))' }
    },
    tooltip: {
      contentStyle: {
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        boxShadow: '0 4px 12px hsla(0,0%,0%,0.1)'
      }
    },
    line: {
      stroke: "hsl(var(--chart-1))",
      strokeWidth: 3,
      dot: { 
        fill: 'hsl(var(--chart-1))', 
        stroke: 'hsl(var(--background))', 
        strokeWidth: 2, 
        r: 4 
      },
      activeDot: { 
        r: 6, 
        fill: 'hsl(var(--chart-1))', 
        stroke: 'hsl(var(--background))', 
        strokeWidth: 2 
      }
    }
  }), []);

  // Memoized timeframe change handler
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  // Memoized empty state component
  const EmptyState = useMemo(() => (
    <div className="h-72 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <div className="text-2xl mb-2">📊</div>
        <p>Aucune donnée d'appels disponible</p>
      </div>
    </div>
  ), []);

  // Early return for empty data to prevent unnecessary renders
  if (!processedData || processedData.length === 0) {
    return (
      <Card className="card-premium animate-slide-up">
        <CardHeader>
          <CardTitle className="text-primary font-bold text-lg" data-testid="text-chart-title">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {EmptyState}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary font-bold text-lg" data-testid="text-chart-title">
            {title}
          </CardTitle>
          <div className="flex space-x-2">
            {timeframeOptions.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={timeframe === value ? "default" : "outline"}
                onClick={() => handleTimeframeChange(value)}
                className={
                  timeframe === value 
                    ? "btn-primary-gradient" 
                    : "hover:bg-primary/10"
                }
                data-testid={`button-timeframe-${value}`}
                aria-pressed={timeframe === value}
                aria-label={`Afficher les données des ${label}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72" data-testid="chart-calls">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid 
                strokeDasharray={chartConfig.cartesianGrid.strokeDasharray} 
                stroke={chartConfig.cartesianGrid.stroke} 
              />
              <XAxis 
                dataKey="time" 
                tick={chartConfig.xAxis.tick}
                axisLine={chartConfig.xAxis.axisLine}
              />
              <YAxis 
                tick={chartConfig.yAxis.tick}
                axisLine={chartConfig.yAxis.axisLine}
              />
              <Tooltip 
                contentStyle={chartConfig.tooltip.contentStyle}
                labelFormatter={(label) => `Heure: ${label}`}
                formatter={(value: number) => [value, 'Appels']}
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke={chartConfig.line.stroke}
                strokeWidth={chartConfig.line.strokeWidth}
                dot={chartConfig.line.dot}
                activeDot={chartConfig.line.activeDot}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance metrics display in dev mode */}
        {process.env['NODE_ENV'] === 'development' && (
          <div className="mt-2 text-xs text-muted-foreground">
            Data points: {processedData.length} | Timeframe: {timeframe}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Add display name for better debugging
CallsChart.displayName = 'CallsChart';

export default CallsChart;