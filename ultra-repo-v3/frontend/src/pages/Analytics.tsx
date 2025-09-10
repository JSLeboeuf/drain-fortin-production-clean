import { useMemo, useState } from "react";
import { Clock, Phone, TrendingUp, Percent, BarChart3, PieChart } from "lucide-react";
import MetricsCard from "@/components/dashboard/MetricsCard";
import CallsChart from "@/components/analytics/CallsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "@/lib/services";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

type SortKey = "intent" | "count";
type SortDir = "asc" | "desc";

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("30d");
  const [intSortKey, setIntSortKey] = useState<SortKey>("count");
  const [intSortDir, setIntSortDir] = useState<SortDir>("desc");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/analytics", timeframe],
    queryFn: getAnalyticsSummary,
    staleTime: 60_000,
  });

  if (isLoading || !summary) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  const sortedIntents = useMemo(() => {
    const arr = [...(summary.topIntents || [])];
    arr.sort((a, b) => {
      const aVal = a[intSortKey] as string | number;
      const bVal = b[intSortKey] as string | number;
      if (aVal === bVal) return 0;
      const res = aVal < bVal ? -1 : 1;
      return intSortDir === "asc" ? res : -res;
    });
    return arr;
  }, [summary.topIntents, intSortKey, intSortDir]);

  const toggleSort = (key: SortKey) => {
    if (intSortKey === key) {
      setIntSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setIntSortKey(key);
      setIntSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">
              Analyse des performances et métriques des appels
            </p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium">Total des Appels</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalCalls}
              </div>
              <p className="text-sm text-gray-600 mt-1">Cette période</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium">Durée Moyenne</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.avgDuration}s
              </div>
              <p className="text-sm text-gray-600 mt-1">Par appel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-sm font-medium">Taux de Réponse</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.answeredPct}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Appels répondus</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-sm font-medium">Conversion</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.conversionPct}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Taux de conversion</p>
            </CardContent>
          </Card>
        </div>

        {summary.totalCalls === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
              <p className="text-gray-600 mb-4">
                Aucune métrique disponible pour cette période. Essayez un autre intervalle.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CallsChart 
                data={[]} // You'll need to pass real chart data here
                title={`Volume d'appels - ${timeframe}`}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-600" />
                    Distribution des Appels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Appels réussis</span>
                      </div>
                      <span className="font-medium">{Math.round((summary.answeredPct / 100) * summary.totalCalls)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Appels manqués</span>
                      </div>
                      <span className="font-medium">{summary.totalCalls - Math.round((summary.answeredPct / 100) * summary.totalCalls)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Conversions</span>
                      </div>
                      <span className="font-medium">{Math.round((summary.conversionPct / 100) * summary.totalCalls)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Intents and Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Principales Intentions</CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedIntents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune intention détectée</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedIntents.slice(0, 10).map((intent) => (
                        <div key={intent.intent} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700">{intent.intent}</span>
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                              {intent.count}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métriques de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Appels traités</span>
                      <span className="font-semibold text-lg">{summary.totalCalls}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Durée moyenne</span>
                      <span className="font-semibold text-lg">{summary.avgDuration}s</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Taux de réponse</span>
                      <span className="font-semibold text-lg text-green-600">{summary.answeredPct}%</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-gray-600">Taux de conversion</span>
                      <span className="font-semibold text-lg text-purple-600">{summary.conversionPct}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
