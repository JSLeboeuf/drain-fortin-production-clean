import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  User,
  Plus,
  ChevronRight
} from 'lucide-react';
import { clientService } from '@/services/crmService';
import type { Client, CRMFilters } from '@/types/crm';
import { cn } from '@/lib/utils';

export function ClientsView() {
  const [filters, setFilters] = useState<CRMFilters>({});
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch clients
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientService.getClients(filters),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update filters when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'P1': return 'text-red-600 bg-red-100';
      case 'P2': return 'text-orange-600 bg-orange-100';
      case 'P3': return 'text-yellow-600 bg-yellow-100';
      case 'P4': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'blacklist': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  return (
    <div className="flex h-full">
      {/* Client List */}
      <div className={cn(
        "flex-1 flex flex-col border-r",
        selectedClient && "max-w-md"
      )}>
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Clients</h2>
            <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3">
            <select 
              className="px-3 py-1 text-sm border rounded-lg"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value ? [e.target.value] : undefined }))}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <select 
              className="px-3 py-1 text-sm border rounded-lg"
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value ? [e.target.value] : undefined }))}
            >
              <option value="">Toutes priorités</option>
              <option value="P1">P1 - Urgent</option>
              <option value="P2">P2 - Municipal</option>
              <option value="P3">P3 - Majeur</option>
              <option value="P4">P4 - Standard</option>
            </select>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <User className="h-8 w-8 mb-2" />
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    selectedClient?.id === client.id && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {client.first_name} {client.last_name}
                          {client.company_name && (
                            <span className="text-gray-500 text-sm ml-2">
                              ({client.company_name})
                            </span>
                          )}
                        </h3>
                        {client.priority_level && (
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            getPriorityColor(client.priority_level)
                          )}>
                            {client.priority_level}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(client.phone)}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          )}
                        </div>

                        {client.address && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {client.address}, {client.city}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{client.total_interventions || 0} interventions</span>
                          <span>{client.total_sms || 0} SMS</span>
                          <span className="font-medium">
                            {formatCurrency(client.lifetime_value)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Details */}
      {selectedClient && (
        <div className="flex-1 bg-white">
          <ClientDetails 
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdate={() => refetch()}
          />
        </div>
      )}
    </div>
  );
}

// Client Details Component
function ClientDetails({ 
  client, 
  onClose, 
  onUpdate 
}: { 
  client: Client;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['client-history', client.id],
    queryFn: () => clientService.getClientHistory(client.id),
    enabled: !!client.id
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {client.first_name} {client.last_name}
            </h2>
            {client.company_name && (
              <p className="text-gray-600">{client.company_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>

        {/* Contact Info */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Téléphone</label>
            <p className="font-medium">{formatPhone(client.phone)}</p>
          </div>
          {client.email && (
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{client.email}</p>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Adresse</label>
              <p className="font-medium">
                {client.address}, {client.city} {client.postal_code}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Interventions</p>
            <p className="text-xl font-semibold">{client.total_interventions || 0}</p>
          </div>
          <div className="flex-1 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">SMS envoyés</p>
            <p className="text-xl font-semibold">{client.total_sms || 0}</p>
          </div>
          <div className="flex-1 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Valeur totale</p>
            <p className="text-xl font-semibold">
              {formatCurrency(client.lifetime_value)}
            </p>
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Interventions */}
            <div>
              <h3 className="font-medium mb-3">Interventions récentes</h3>
              {history?.interventions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune intervention</p>
              ) : (
                <div className="space-y-2">
                  {history?.interventions.slice(0, 5).map((intervention: any) => (
                    <div key={intervention.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{intervention.service_type}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(intervention.created_at).toLocaleDateString('fr-CA')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {intervention.problem_description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMS History */}
            <div>
              <h3 className="font-medium mb-3">SMS récents</h3>
              {history?.sms.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun SMS</p>
              ) : (
                <div className="space-y-2">
                  {history?.sms.slice(0, 5).map((sms: any) => (
                    <div key={sms.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-full",
                          sms.status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        )}>
                          {sms.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(sms.sent_at).toLocaleDateString('fr-CA')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {sms.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatCurrency(amount?: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount || 0);
}