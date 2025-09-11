import { memo, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingFallback from '../common/LoadingFallback';

// Lazy load heavy chart components
const Chart = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));

const AnalyticsWidget = memo(function AnalyticsWidget() {
  // Mock analytics data with React Query
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics-widget'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        dailyCalls: [
          { day: 'Lun', calls: 23 },
          { day: 'Mar', calls: 45 },
          { day: 'Mer', calls: 32 },
          { day: 'Jeu', calls: 67 },
          { day: 'Ven', calls: 43 },
          { day: 'Sam', calls: 21 },
          { day: 'Dim', calls: 12 }
        ],
        metrics: {
          totalCalls: 243,
          avgDuration: '3:24',
          conversionRate: 78,
          satisfaction: 4.6
        }
      };
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const chartData = useMemo(() => analyticsData?.dailyCalls || [], [analyticsData]);

  if (isLoading) {
    return <LoadingFallback message="Chargement des analytics..." size="md" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData?.metrics.totalCalls}
            </div>
            <div className="text-sm text-blue-700">Appels Total</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {analyticsData?.metrics.conversionRate}%
            </div>
            <div className="text-sm text-green-700">Conversion</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {analyticsData?.metrics.avgDuration}
            </div>
            <div className="text-sm text-purple-700">Durée Moy.</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {analyticsData?.metrics.satisfaction}★
            </div>
            <div className="text-sm text-yellow-700">Satisfaction</div>
          </div>
        </div>

        {/* Chart Section - Lazy loaded */}
        <div className="h-64">
          <h4 className="text-md font-medium mb-2">Appels par Jour</h4>
          <Suspense fallback={<div className="flex items-center justify-center h-full bg-gray-50 rounded">Chargement graphique...</div>}>
            <div className="w-full h-full bg-gray-50 rounded flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-gray-600">Graphique Analytics</div>
                <div className="text-sm text-gray-500 mt-1">
                  {chartData.reduce((sum, item) => sum + item.calls, 0)} appels cette semaine
                </div>
              </div>
            </div>
          </Suspense>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-semibold mb-3">Insights Performance</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded">
            <span className="text-green-800">📈 Tendance positive</span>
            <span className="text-green-600 font-medium">+15%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <span className="text-blue-800">⏱️ Temps de réponse optimal</span>
            <span className="text-blue-600 font-medium">&lt;2s</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
            <span className="text-purple-800">🎯 Objectif atteint</span>
            <span className="text-purple-600 font-medium">102%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnalyticsWidget;