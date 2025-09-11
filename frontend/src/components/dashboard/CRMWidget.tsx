import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingFallback from '../common/LoadingFallback';

const CRMWidget = memo(function CRMWidget() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Mock CRM data
  const { data: crmData, isLoading } = useQuery({
    queryKey: ['crm-widget'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        recentClients: [
          { id: '1', name: 'Jean Tremblay', status: 'active', lastCall: '2024-01-15', priority: 'high' },
          { id: '2', name: 'Marie Dubois', status: 'pending', lastCall: '2024-01-14', priority: 'medium' },
          { id: '3', name: 'Pierre Martin', status: 'active', lastCall: '2024-01-13', priority: 'low' },
          { id: '4', name: 'Sophie Leblanc', status: 'inactive', lastCall: '2024-01-10', priority: 'medium' }
        ],
        stats: {
          totalClients: 142,
          activeClients: 98,
          pendingCalls: 23,
          completedToday: 15
        }
      };
    },
    staleTime: 3 * 60 * 1000 // 3 minutes
  });

  if (isLoading) {
    return <LoadingFallback message="Chargement CRM..." size="md" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">CRM Dashboard</h3>
        
        {/* CRM Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {crmData?.stats.totalClients}
            </div>
            <div className="text-sm text-blue-700">Clients Total</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {crmData?.stats.activeClients}
            </div>
            <div className="text-sm text-green-700">Actifs</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {crmData?.stats.pendingCalls}
            </div>
            <div className="text-sm text-orange-700">En Attente</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {crmData?.stats.completedToday}
            </div>
            <div className="text-sm text-purple-700">Complétés</div>
          </div>
        </div>

        {/* Recent Clients */}
        <div>
          <h4 className="text-md font-medium mb-3">Clients Récents</h4>
          <div className="space-y-2">
            {crmData?.recentClients.map((client) => (
              <div
                key={client.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedClient === client.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    client.status === 'active' ? 'bg-green-500' :
                    client.status === 'pending' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-gray-500">Dernier appel: {client.lastCall}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    client.priority === 'high' ? 'bg-red-100 text-red-800' :
                    client.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {client.priority === 'high' ? 'Haute' :
                     client.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </span>
                  <span className="text-gray-400">
                    {selectedClient === client.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Details */}
      {selectedClient && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-semibold mb-3">Détails Client</h4>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-4xl mb-2">👤</div>
              <div className="font-medium">
                {crmData?.recentClients.find(c => c.id === selectedClient)?.name}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Historique complet disponible
              </div>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Voir le profil complet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-semibold mb-3">Actions Rapides</h4>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            📞 Nouvel Appel
          </button>
          <button className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            👥 Ajouter Client
          </button>
          <button className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            📊 Rapport
          </button>
          <button className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
            ⚙️ Paramètres
          </button>
        </div>
      </div>
    </div>
  );
});

export default CRMWidget;