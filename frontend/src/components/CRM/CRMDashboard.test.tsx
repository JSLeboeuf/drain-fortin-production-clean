import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMDashboard } from './CRMDashboard';
import * as statsService from '../../services/statsService';

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

// Mock des services
vi.mock('../../services/statsService');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

describe('CRMDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with all sections', async () => {
    // Mock des stats
    vi.spyOn(statsService, 'getDashboardStats').mockResolvedValue({
      clients: { total: 150, active: 45, new: 12 },
      interventions: { today: 5, week: 23, month: 89 },
      sms: { sent: 234, delivered: 230, failed: 4 },
      revenue: { month: 45000, year: 380000 }
    });

    render(<CRMDashboard />, { wrapper: createWrapper() });

    // Vérifier que les sections principales sont présentes
    await waitFor(() => {
      expect(screen.getByText(/dashboard crm/i)).toBeInTheDocument();
    });

    // Vérifier les métriques
    await waitFor(() => {
      expect(screen.getByText(/clients actifs/i)).toBeInTheDocument();
      expect(screen.getByText(/interventions/i)).toBeInTheDocument();
      expect(screen.getByText(/sms envoyés/i)).toBeInTheDocument();
    });
  });

  it('should handle real-time updates', async () => {
    const mockStats = {
      clients: { total: 150, active: 45, new: 12 },
      interventions: { today: 5, week: 23, month: 89 },
      sms: { sent: 234, delivered: 230, failed: 4 },
      revenue: { month: 45000, year: 380000 }
    };

    vi.spyOn(statsService, 'getDashboardStats').mockResolvedValue(mockStats);
    
    render(<CRMDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(statsService.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('should display alerts by priority', async () => {
    const mockAlerts = [
      { id: '1', priority: 'P1', title: 'Urgence', client_info: { name: 'Test' } },
      { id: '2', priority: 'P2', title: 'Municipal', client_info: { name: 'Ville' } }
    ];

    vi.spyOn(statsService, 'getActiveAlerts').mockResolvedValue(mockAlerts);

    render(<CRMDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/P1/)).toBeInTheDocument();
      expect(screen.getByText(/P2/)).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    vi.spyOn(statsService, 'getDashboardStats').mockRejectedValue(
      new Error('Network error')
    );

    render(<CRMDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/erreur de chargement/i)).toBeInTheDocument();
    });
  });

  it('should refresh data on interval', async () => {
    vi.useFakeTimers();
    
    vi.spyOn(statsService, 'getDashboardStats').mockResolvedValue({
      clients: { total: 150, active: 45, new: 12 },
      interventions: { today: 5, week: 23, month: 89 },
      sms: { sent: 234, delivered: 230, failed: 4 },
      revenue: { month: 45000, year: 380000 }
    });

    render(<CRMDashboard />, { wrapper: createWrapper() });

    expect(statsService.getDashboardStats).toHaveBeenCalledTimes(1);

    // Avancer le temps de 30 secondes
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(statsService.getDashboardStats).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });
});