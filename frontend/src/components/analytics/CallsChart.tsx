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

export default function CallsChart({ data, title = "Appels des dernières 24h" }: CallsChartProps) {
  const [timeframe, setTimeframe] = useState("24h");

  return (
    <Card className="card-premium animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary font-bold text-lg" data-testid="text-chart-title">{title}</CardTitle>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={timeframe === "24h" ? "default" : "outline"}
              onClick={() => setTimeframe("24h")}
              className={timeframe === "24h" ? "btn-primary-gradient" : "hover:bg-primary/10"}
              data-testid="button-timeframe-24h"
            >
              24h
            </Button>
            <Button
              size="sm"
              variant={timeframe === "7j" ? "default" : "outline"}
              onClick={() => setTimeframe("7j")}
              className={timeframe === "7j" ? "btn-primary-gradient" : "hover:bg-primary/10"}
              data-testid="button-timeframe-7d"
            >
              7j
            </Button>
            <Button
              size="sm"
              variant={timeframe === "30j" ? "default" : "outline"}
              onClick={() => setTimeframe("30j")}
              className={timeframe === "30j" ? "btn-primary-gradient" : "hover:bg-primary/10"}
              data-testid="button-timeframe-30d"
            >
              30j
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72" data-testid="chart-calls">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px hsla(0,0%,0%,0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ 
                  fill: 'hsl(var(--chart-1))', 
                  stroke: 'hsl(var(--background))', 
                  strokeWidth: 2, 
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  fill: 'hsl(var(--chart-1))', 
                  stroke: 'hsl(var(--background))', 
                  strokeWidth: 2 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
