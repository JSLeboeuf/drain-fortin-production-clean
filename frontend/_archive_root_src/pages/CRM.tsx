import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { Users, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';

export default function CRM() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Chargement du CRM..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gestion CRM
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gestion des clients et interventions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button size="sm">
                Nouveau client
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clients actifs</p>
                  <p className="text-2xl font-bold text-gray-900">145</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Interventions</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Messages SMS</p>
                  <p className="text-2xl font-bold text-gray-900">89</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alertes</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Clients récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Jean Dupont', phone: '+1 514-123-4567', status: 'Actif' },
                  { name: 'Marie Tremblay', phone: '+1 438-987-6543', status: 'Nouveau' },
                  { name: 'Pierre Martin', phone: '+1 450-555-0123', status: 'VIP' },
                ].map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.phone}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      client.status === 'VIP' ? 'bg-purple-100 text-purple-800' :
                      client.status === 'Nouveau' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  📞 Nouveau client par téléphone
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  📧 Envoyer SMS groupé
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  📅 Planifier intervention
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  📊 Générer rapport
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
