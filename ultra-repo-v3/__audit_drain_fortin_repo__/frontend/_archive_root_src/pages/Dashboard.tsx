import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { Phone, Users, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Données mockées pour le développement
const mockStats = {
  totalCalls: 156,
  totalLeads: 23,
  urgentCalls: 8,
  avgDuration: 8.5,
  conversionRate: 68,
  activeClients: 145,
  todayInterventions: 12,
  monthRevenue: 42500,
};

const mockRecentCalls = [
  {
    id: '1',
    phoneNumber: '+1 514-123-4567',
    duration: 450,
    priority: 'P2',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: '2',
    phoneNumber: '+1 438-987-6543',
    duration: 180,
    priority: 'P1',
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
  },
  {
    id: '3',
    phoneNumber: '+1 450-555-0123',
    duration: 720,
    priority: 'P3',
    status: 'in_progress',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentCallItem({ call }: { call: typeof mockRecentCalls[0] }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'text-red-600 bg-red-100';
      case 'P2': return 'text-orange-600 bg-orange-100';
      case 'P3': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(call.priority)}`}>
          {call.priority}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {call.phoneNumber}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')} min
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
          {call.status === 'in_progress' ? 'En cours' : 'Terminé'}
        </div>
        <Button variant="ghost" size="sm">
          <Phone className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Simulation d'un état de chargement
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simuler le chargement des données
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Chargement du tableau de bord..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                CRM Drain Fortin
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tableau de bord - Surveillance en temps réel
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Appels aujourd'hui"
            value={mockStats.totalCalls}
            icon={Phone}
            color="blue"
          />
          <StatCard
            title="Clients actifs"
            value={mockStats.activeClients}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Interventions"
            value={mockStats.todayInterventions}
            subtitle="Prévu aujourd'hui"
            icon={Calendar}
            color="orange"
          />
          <StatCard
            title="Revenus"
            value={formatCurrency(mockStats.monthRevenue)}
            subtitle="Ce mois-ci"
            icon={DollarSign}
            color="green"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Taux de conversion
                  </span>
                  <span className="font-medium text-green-600">
                    {mockStats.conversionRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Durée moyenne
                  </span>
                  <span className="font-medium">
                    {mockStats.avgDuration} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Appels urgents
                  </span>
                  <span className="font-medium text-red-600">
                    {mockStats.urgentCalls}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads Générés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {mockStats.totalLeads}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Aujourd'hui
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  Nouveau client
                </Button>
                <Button className="w-full" variant="outline">
                  Planifier intervention
                </Button>
                <Button className="w-full" variant="outline">
                  Envoyer SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Appels Récents</span>
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {mockRecentCalls.map((call) => (
                <RecentCallItem key={call.id} call={call} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
