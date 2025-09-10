import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface ConversionFunnelProps {
  data: FunnelData[];
  title?: string;
}

export default function ConversionFunnel({ data, title = "Entonnoir de conversion" }: ConversionFunnelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-funnel-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="chart-funnel">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="verseLayout">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={100} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="hsl(var(--chart-2))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span data-testid={`text-funnel-stage-${index}`}>{item.stage}</span>
              <span data-testid={`text-funnel-percentage-${index}`}>{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
