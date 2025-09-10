import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Phone, Users, TrendingUp, AlertCircle, Calendar, Search,
  Filter, Download, ChevronRight, Menu, X, Clock, CheckCircle,
  XCircle, UserPlus, MessageSquare, Archive, Mail, PhoneCall,
  Activity, Target, DollarSign, FileText
} from 'lucide-react';

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://phiduqxcufdmgjvdipyu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Palette de couleurs
const COLORS = {
  darkGray: '#2C2C2C',
  orange: '#FF9900',
  white: '#FFFFFF',
  lightGray: '#F4F4F4',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#4B5563',
  border: '#E5E7EB'
};

// Types
interface Call {
  id: string;
  customer_name: string;
  phone: string;
  status: 'active' | 'completed' | 'missed';
  duration: number;
  reason: string;
  created_at: string;
  value?: number;
  converted?: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  last_call: string;
  reason: string;
  potential_value: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

const queryClient = new QueryClient();

function BusinessApp() {
  const [activePanel, setActivePanel] = useState<'monitoring' | 'analytics' | 'crm'>('monitoring');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Monitoring Panel Component
  const MonitoringPanel = () => {
    const [activeCalls, setActiveCalls] = useState<Call[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([
      { id: '1', type: 'urgent', message: 'Client à rappeler d\'urgence - M. Tremblay', timestamp: new Date().toISOString() },
      { id: '2', type: 'warning', message: 'Appel manqué - Service résidentiel', timestamp: new Date().toISOString() }
    ]);

    // Simulation d'appels actifs
    useEffect(() => {
      const mockCalls: Call[] = [
        {
          id: '1',
          customer_name: 'Jean Dupont',
          phone: '(514) 555-0123',
          status: 'active',
          duration: 125,
          reason: 'Urgence plomberie',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          customer_name: 'Marie Leblanc',
          phone: '(450) 555-0456',
          status: 'active',
          duration: 45,
          reason: 'Devis installation',
          created_at: new Date().toISOString()
        }
      ];
      setActiveCalls(mockCalls);
    }, []);

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="space-y-6">
        {/* Zone d'alertes */}
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="p-4 rounded-lg flex items-start gap-3 animate-pulse"
              style={{ backgroundColor: alert.type === 'urgent' ? COLORS.orange : COLORS.warning }}
            >
              <AlertCircle className="text-white mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-white font-medium">{alert.message}</p>
                <p className="text-white/80 text-sm mt-1">
                  {new Date(alert.timestamp).toLocaleTimeString('fr-CA')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Conversations actives */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.darkGray }}>
            Conversations en cours
          </h2>

          {activeCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500">Aucune conversation active</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeCalls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-all"
                  style={{ borderColor: COLORS.border }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse absolute -top-1 -right-1"></div>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.lightGray }}>
                        <Phone size={20} style={{ color: COLORS.darkGray }} />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: COLORS.darkGray }}>{call.customer_name}</h3>
                      <p className="text-sm text-gray-500">{call.phone}</p>
                      <p className="text-sm mt-1">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: COLORS.lightGray, color: COLORS.darkGray }}>
                          {call.reason}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-green-600">
                      <Clock size={16} />
                      <span className="font-mono font-medium">{formatDuration(call.duration)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">En cours</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Analytics Panel Component
  const AnalyticsPanel = () => {
    const weekData = [
      { jour: 'Lun', appels: 12 },
      { jour: 'Mar', appels: 19 },
      { jour: 'Mer', appels: 15 },
      { jour: 'Jeu', appels: 22 },
      { jour: 'Ven', appels: 28 },
      { jour: 'Sam', appels: 8 },
      { jour: 'Dim', appels: 5 }
    ];

    const topMotifs = [
      { motif: 'Urgence plomberie', count: 45, color: COLORS.danger },
      { motif: 'Devis installation', count: 32, color: COLORS.success },
      { motif: 'Entretien régulier', count: 28, color: COLORS.warning },
      { motif: 'Questions générales', count: 20, color: '#8B5CF6' },
      { motif: 'Rendez-vous', count: 15, color: '#06B6D4' }
    ];

    const stats = {
      todayCalls: 24,
      weekCalls: 109,
      treatedCalls: 92,
      untreatedCalls: 17,
      conversionRate: 68
    };

    const downloadCSV = () => {
      const csvContent = `Date,Appels,Traités,Non traités,Taux conversion
${new Date().toLocaleDateString('fr-CA')},${stats.todayCalls},${stats.treatedCalls},${stats.untreatedCalls},${stats.conversionRate}%`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analyse-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    return (
      <div className="space-y-6">
        {/* Statistiques clés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Appels aujourd'hui</p>
                <p className="text-2xl font-bold mt-1" style={{ color: COLORS.darkGray }}>{stats.todayCalls}</p>
              </div>
              <Phone className="text-gray-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cette semaine</p>
                <p className="text-2xl font-bold mt-1" style={{ color: COLORS.darkGray }}>{stats.weekCalls}</p>
              </div>
              <Calendar className="text-gray-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Traités / Non traités</p>
                <p className="text-2xl font-bold mt-1" style={{ color: COLORS.success }}>
                  {stats.treatedCalls}
                  <span className="text-lg font-normal" style={{ color: COLORS.danger }}> / {stats.untreatedCalls}</span>
                </p>
              </div>
              <Activity className="text-gray-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taux de conversion</p>
                <p className="text-2xl font-bold mt-1" style={{ color: COLORS.orange }}>{stats.conversionRate}%</p>
              </div>
              <Target className="text-gray-400" size={24} />
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendance hebdomadaire */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: COLORS.darkGray }}>Tendance hebdomadaire</h3>
              <button
                onClick={downloadCSV}
                className="px-3 py-1 rounded text-sm flex items-center gap-2"
                style={{ backgroundColor: COLORS.lightGray, color: COLORS.darkGray }}
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="jour" stroke={COLORS.text} />
                <YAxis stroke={COLORS.text} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="appels" 
                  stroke={COLORS.orange} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.orange, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 motifs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.darkGray }}>Top 5 motifs d'appel</h3>
            <div className="space-y-3">
              {topMotifs.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm" style={{ color: COLORS.darkGray }}>{item.motif}</span>
                  </div>
                  <span className="font-semibold" style={{ color: COLORS.darkGray }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Jauge de conversion */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.darkGray }}>Performance de conversion</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={COLORS.lightGray}
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={COLORS.orange}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88 * stats.conversionRate / 100} ${2 * Math.PI * 88}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: COLORS.darkGray }}>{stats.conversionRate}%</p>
                  <p className="text-sm text-gray-500">Conversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // CRM Panel Component
  const CRMPanel = () => {
    const [customers, setCustomers] = useState<Customer[]>([
      {
        id: '1',
        name: 'Robert Tremblay',
        phone: '(514) 555-0789',
        last_call: '2024-01-08',
        reason: 'Devis salle de bain',
        potential_value: 5000,
        status: 'pending',
        notes: 'Intéressé par rénovation complète'
      },
      {
        id: '2',
        name: 'Sophie Martin',
        phone: '(450) 555-0234',
        last_call: '2024-01-07',
        reason: 'Urgence tuyauterie',
        potential_value: 800,
        status: 'in_progress',
        notes: 'Rappel prévu demain'
      },
      {
        id: '3',
        name: 'Pierre Gagnon',
        phone: '(438) 555-0567',
        last_call: '2024-01-06',
        reason: 'Installation chauffe-eau',
        potential_value: 2500,
        status: 'pending',
        notes: ''
      }
    ]);

    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

    const handleAddFollowUp = () => {
      const name = prompt('Nom du client:');
      if (name) {
        const newCustomer: Customer = {
          id: Date.now().toString(),
          name,
          phone: '(xxx) xxx-xxxx',
          last_call: new Date().toISOString().split('T')[0],
          reason: 'Nouveau suivi',
          potential_value: 0,
          status: 'pending',
          notes: ''
        };
        setCustomers([...customers, newCustomer]);
      }
    };

    const handleMarkCompleted = (id: string) => {
      setCustomers(customers.map(c => 
        c.id === id ? { ...c, status: 'completed' } : c
      ));
    };

    const handleAddNote = (id: string) => {
      const note = prompt('Ajouter une note:');
      if (note) {
        setCustomers(customers.map(c => 
          c.id === id ? { ...c, notes: note } : c
        ));
      }
    };

    const filteredCustomers = customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          c.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6">
        {/* Barre d'actions */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un client..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                style={{ borderColor: COLORS.border }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              style={{ borderColor: COLORS.border }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Traités</option>
            </select>
            <button
              onClick={handleAddFollowUp}
              className="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2"
              style={{ backgroundColor: COLORS.orange }}
            >
              <UserPlus size={20} />
              Ajouter un suivi
            </button>
          </div>
        </div>

        {/* Tableau des clients */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: COLORS.lightGray }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Dernier appel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Motif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Valeur potentielle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.darkGray }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: COLORS.border }}>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium" style={{ color: COLORS.darkGray }}>{customer.name}</div>
                      {customer.notes && (
                        <div className="text-xs text-gray-500 mt-1">{customer.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.last_call).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: COLORS.lightGray, color: COLORS.darkGray }}>
                        {customer.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: COLORS.darkGray }}>
                      {customer.potential_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        customer.status === 'completed' ? 'bg-green-100 text-green-800' :
                        customer.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.status === 'completed' ? 'Traité' :
                         customer.status === 'in_progress' ? 'En cours' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.location.href = `tel:${customer.phone}`}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Appeler"
                        >
                          <PhoneCall size={16} style={{ color: COLORS.success }} />
                        </button>
                        <button
                          onClick={() => window.location.href = `sms:${customer.phone}`}
                          className="p-1 rounded hover:bg-gray-100"
                          title="SMS"
                        >
                          <MessageSquare size={16} style={{ color: COLORS.orange }} />
                        </button>
                        <button
                          onClick={() => handleAddNote(customer.id)}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Notes"
                        >
                          <FileText size={16} style={{ color: COLORS.darkGray }} />
                        </button>
                        {customer.status !== 'completed' && (
                          <button
                            onClick={() => handleMarkCompleted(customer.id)}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Marquer comme traité"
                          >
                            <CheckCircle size={16} style={{ color: COLORS.success }} />
                          </button>
                        )}
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          title="Archiver"
                        >
                          <Archive size={16} style={{ color: COLORS.text }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.lightGray }}>
      {/* Navigation latérale */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`} style={{ backgroundColor: COLORS.darkGray }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#404040' }}>
          <h1 className="text-xl font-bold text-white">Gestion d'activité</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4">
          <button
            onClick={() => setActivePanel('monitoring')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activePanel === 'monitoring' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{ backgroundColor: activePanel === 'monitoring' ? COLORS.orange : 'transparent' }}
          >
            <Phone size={20} />
            <span className="font-medium">Pilotez vos appels</span>
            {activePanel === 'monitoring' && <ChevronRight className="ml-auto" size={16} />}
          </button>

          <button
            onClick={() => setActivePanel('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activePanel === 'analytics' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{ backgroundColor: activePanel === 'analytics' ? COLORS.orange : 'transparent' }}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Analysez votre performance</span>
            {activePanel === 'analytics' && <ChevronRight className="ml-auto" size={16} />}
          </button>

          <button
            onClick={() => setActivePanel('crm')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activePanel === 'crm' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{ backgroundColor: activePanel === 'crm' ? COLORS.orange : 'transparent' }}
          >
            <Users size={20} />
            <span className="font-medium">Gérez vos suivis clients</span>
            {activePanel === 'crm' && <ChevronRight className="ml-auto" size={16} />}
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t" style={{ borderColor: '#404040' }}>
          <div className="text-xs text-gray-400">
            <p className="mb-1">Drain Fortin</p>
            <p>Système automatisé</p>
            <p className="mt-2">Version 2.0</p>
            <p>{new Date().toLocaleDateString('fr-CA')}</p>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="lg:ml-64">
        {/* Header mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white" style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ backgroundColor: COLORS.lightGray }}
          >
            <Menu size={24} style={{ color: COLORS.darkGray }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: COLORS.darkGray }}>
            {activePanel === 'monitoring' && 'Pilotez vos appels'}
            {activePanel === 'analytics' && 'Analysez votre performance'}
            {activePanel === 'crm' && 'Gérez vos suivis clients'}
          </h1>
        </div>

        {/* Contenu du panneau actif */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header desktop */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold" style={{ color: COLORS.darkGray }}>
                {activePanel === 'monitoring' && 'Pilotez vos appels'}
                {activePanel === 'analytics' && 'Analysez votre performance'}
                {activePanel === 'crm' && 'Gérez vos suivis clients'}
              </h1>
              <p className="text-gray-500 mt-1">
                {activePanel === 'monitoring' && 'Surveillez vos conversations en temps réel'}
                {activePanel === 'analytics' && 'Visualisez vos indicateurs de performance'}
                {activePanel === 'crm' && 'Gérez efficacement vos relations clients'}
              </p>
            </div>

            {/* Panneau actif */}
            {activePanel === 'monitoring' && <MonitoringPanel />}
            {activePanel === 'analytics' && <AnalyticsPanel />}
            {activePanel === 'crm' && <CRMPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

// App wrapper avec QueryClient
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BusinessApp />
    </QueryClientProvider>
  );
}