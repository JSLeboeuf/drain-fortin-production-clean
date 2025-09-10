import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMDashboard } from './CRMDashboard';

// Test wrapper avec QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock the entire crmService module
vi.mock('@/services/crmService', () => ({
  statsService: {
    getStats: vi.fn()
  },
  alertService: {
    getActiveAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn()
  },
  interventionService: {
    getTodayInterventions: vi.fn()
  },
  smsService: {
    getSMSMessages: vi.fn()
  },
  realtimeService: {
    subscribeToAlerts: vi.fn(() => ({ _noop: true })),
    subscribeToSMS: vi.fn(() => ({ _noop: true })),
    subscribeToInterventions: vi.fn(() => ({ _noop: true })),
    unsubscribe: vi.fn()
  }
}));

// Import after mocking to get mocked version
import { statsService, alertService, interventionService, smsService } from '@/services/crmService';

describe('CRMDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with all sections', async () => {
    // Mock des stats
    vi.mocked(statsService.getStats).mockResolvedValue({
      totalClients: 150,
      activeClients: 45,
      totalInterventions: 89,
      todayInterventions: 5,
      totalSMS: 234,
      todaySMS: 234,
      totalRevenue: 380000,
      monthRevenue: 45000,
      activeAlerts: 0,
      p1Alerts: 0,
      p2Alerts: 0,
      averageResponseTime: 15,
      customerSatisfaction: 4.7
    });
    
    vi.mocked(alertService.getActiveAlerts).mockResolvedValue([]);
    vi.mocked(interventionService.getTodayInterventions).mockResolvedValue([]);
    vi.mocked(smsService.getSMSMessages).mockResolvedValue([]);

    render(<CRMDashboard />, { wrapper: createWrapper() });

    // Vérifier que les sections principales sont présentes
    await waitFor(() => {
      expect(screen.getByText(/CRM Drain Fortin/i)).toBeInTheDocument();
    });

    // Vérifier les métriques
    await waitFor(() => {
      expect(screen.getByText(/Clients actifs/i)).toBeInTheDocument();
      expect(screen.getByText(/Interventions aujourd'hui/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS envoyés/i)).toBeInTheDocument();
    });
  });

  it('should handle real-time updates', async () => {
    const mockStats = {
      totalClients: 150,
      activeClients: 45,
      totalInterventions: 89,
      todayInterventions: 5,
      totalSMS: 234,
      todaySMS: 234,
      totalRevenue: 380000,
      monthRevenue: 45000,
      activeAlerts: 0,
      p1Alerts: 0,
      p2Alerts: 0,
      averageResponseTime: 15,
      customerSatisfaction: 4.7
    };

    vi.mocked(statsService.getStats).mockResolvedValue(mockStats);
    vi.mocked(alertService.getActiveAlerts).mockResolvedValue([]);
    vi.mocked(interventionService.getTodayInterventions).mockResolvedValue([]);
    vi.mocked(smsService.getSMSMessages).mockResolvedValue([]);
    
    render(<CRMDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(statsService.getStats).toHaveBeenCalled();
    });
  });

  it('should display alerts by priority', async () => {
    const mockAlerts = [
      { id: '1', priority: 'P1', title: 'Urgence', client_name: 'Test Client', client_phone: '514-555-0001', status: 'pending', minutes_since_created: 5 },
      { id: '2', priority: 'P2', title: 'Municipal', client_name: 'Ville', client_phone: '514-555-0002', status: 'pending', minutes_since_created: 10 }
    ];

    vi.mocked(alertService.getActiveAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(statsService.getStats).mockResolvedValue({
      totalClients: 150,
      activeClients: 45,
      totalInterventions: 89,
      todayInterventions: 5,
      totalSMS: 234,
      todaySMS: 234,
      totalRevenue: 380000,
      monthRevenue: 45000,
      activeAlerts: 2,
      p1Alerts: 1,
      p2Alerts: 1,
      averageResponseTime: 15,
      customerSatisfaction: 4.7
    });
    vi.mocked(interventionService.getTodayInterventions).mockResolvedValue([]);
    vi.mocked(smsService.getSMSMessages).mockResolvedValue([]);

    render(<CRMDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/P1/)).toBeInTheDocument();
      expect(screen.getByText(/P2/)).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    vi.mocked(statsService.getStats).mockRejectedValue(
      new Error('Network error')
    );
    vi.mocked(alertService.getActiveAlerts).mockResolvedValue([]);
    vi.mocked(interventionService.getTodayInterventions).mockResolvedValue([]);
    vi.mocked(smsService.getSMSMessages).mockResolvedValue([]);

    render(<CRMDashboard />, { wrapper: createWrapper() });

    // The component should still render even with stats error
    await waitFor(() => {
      expect(screen.getByText(/CRM Drain Fortin/i)).toBeInTheDocument();
    });
  });

  it('should refresh data on interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    vi.mocked(statsService.getStats).mockResolvedValue({
      totalClients: 150,
      activeClients: 45,
      totalInterventions: 89,
      todayInterventions: 5,
      totalSMS: 234,
      todaySMS: 234,
      totalRevenue: 380000,
      monthRevenue: 45000,
      activeAlerts: 0,
      p1Alerts: 0,
      p2Alerts: 0,
      averageResponseTime: 15,
      customerSatisfaction: 4.7
    });
    vi.mocked(alertService.getActiveAlerts).mockResolvedValue([]);
    vi.mocked(interventionService.getTodayInterventions).mockResolvedValue([]);
    vi.mocked(smsService.getSMSMessages).mockResolvedValue([]);

    const { unmount } = render(<CRMDashboard />, { wrapper: createWrapper() });

    // Initial call
    await waitFor(() => {
      expect(statsService.getStats).toHaveBeenCalledTimes(1);
    });

    // Avancer le temps de 60 secondes (refetchInterval for stats)
    await vi.advanceTimersByTimeAsync(60000);

    await waitFor(() => {
      expect(statsService.getStats).toHaveBeenCalledTimes(2);
    }, { timeout: 5000 });

    unmount();
    vi.useRealTimers();
  });
});