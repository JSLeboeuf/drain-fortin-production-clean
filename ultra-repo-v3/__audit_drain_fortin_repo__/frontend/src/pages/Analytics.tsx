import { useMemo, useState } from "react";
import { Clock, Sparkles, Phone, TrendingUp, Percent } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import MetricsCard from "@/components/dashboard/MetricsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "@/lib/services";

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
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl">
            <TableSkeleton rows={6} />
          </div>
        </main>
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
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Analytics" subtitle="Métriques et analyse des performances" />

        <PageErrorBoundary pageName="Analytics">
          <div className="flex-1 overflow-y-auto p-6" data-panel>
            <div className="sticky top-0 z-10 -mt-6 pt-6 pb-2 bg-gray-50/80 dark:bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 dark:supports-[backdrop-filter]:bg-background/60">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Aperçu des performances</h2>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-32" data-testid="select-timeframe">
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
              <div className="text-xs text-muted-foreground mt-1">Dernière mise à jour: {new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="h-px bg-border mt-2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricsCard title="Total des appels" value={String(summary.totalCalls)} change={0} icon={<Phone className="h-6 w-6 text-primary" />} trend="stable" />
              <MetricsCard title="Durée moyenne" value={`${summary.avgDuration} sec`} change={0} icon={<Clock className="h-6 w-6 text-blue-500" />} trend="stable" />
              <MetricsCard title="Taux de réponse" value={`${summary.answeredPct}%`} change={0} icon={<Sparkles className="h-6 w-6 text-amber-500" />} trend="stable" />
              <MetricsCard title="Conversion" value={`${summary.conversionPct}%`} change={0} icon={<Percent className="h-6 w-6 text-green-600" />} trend="stable" />
            </div>

            {summary.totalCalls === 0 ? (
              <Card className="mt-6">
                <CardContent className="py-10 text-center">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
                  <div className="text-sm text-muted-foreground mb-4">Aucune métrique disponible pour cette période. Essayez un autre intervalle ou revenez plus tard.</div>
                  <div className="flex items-center justify-center gap-4">
                    <a href="/dashboard" className="text-primary text-sm hover:underline">Tableau de bord</a>
                    <a href="/intake" className="text-primary text-sm hover:underline">Nouvelle demande</a>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Principales intentions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort("intent")}>
                              Intention {intSortKey === "intent" ? (intSortDir === "asc" ? "▲" : "▼") : null}
                            </th>
                            <th className="py-2 pl-4 cursor-pointer" onClick={() => toggleSort("count")}>
                              Occurrences {intSortKey === "count" ? (intSortDir === "asc" ? "▲" : "▼") : null}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedIntents.map((it) => (
                            <tr key={it.intent} className="border-t">
                              <td className="py-2 pr-4">{it.intent}</td>
                              <td className="py-2 pl-4 font-medium">{it.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance actuelle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Appels traités aujourd'hui</span>
                        <span className="font-medium" aria-live="polite">{summary.totalCalls}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Durée moyenne par appel</span>
                        <span className="font-medium">{summary.avgDuration} sec</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Taux de réponse</span>
                        <span className="font-medium">{summary.answeredPct}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </PageErrorBoundary>
      </main>
    </div>
  );
}
