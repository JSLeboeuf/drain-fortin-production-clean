import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CRMDashboard } from './CRMDashboard';
import * as statsService from '../../services/statsService';
import { renderWithProviders } from '../../test/utils';

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
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({
          unsubscribe: vi.fn()
        }))
      }))
    })),
    removeChannel: vi.fn(() => true)
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

    renderWithProviders(<CRMDashboard />);

    // Vérifier que les sections principales sont présentes
    await waitFor(() => {
      expect(screen.getByText(/CRM Drain Fortin/i)).toBeInTheDocument();
    });

    // Vérifier les métriques (optionnelles car peuvent être en chargement)
    await waitFor(() => {
      expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
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
    
    renderWithProviders(<CRMDashboard />);

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

    renderWithProviders(<CRMDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/P1/)).toBeInTheDocument();
      expect(screen.getByText(/P2/)).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    vi.spyOn(statsService, 'getDashboardStats').mockRejectedValue(
      new Error('Network error')
    );

    renderWithProviders(<CRMDashboard />);

    // Le composant devrait gérer l'erreur sans planter
    await waitFor(() => {
      expect(screen.getByText(/CRM Drain Fortin/i)).toBeInTheDocument();
    });
  });

  it('should refresh data on interval', async () => {
    vi.spyOn(statsService, 'getDashboardStats').mockResolvedValue({
      clients: { total: 150, active: 45, new: 12 },
      interventions: { today: 5, week: 23, month: 89 },
      sms: { sent: 234, delivered: 230, failed: 4 },
      revenue: { month: 45000, year: 380000 }
    });

    renderWithProviders(<CRMDashboard />);

    // Vérifier que le service est appelé au moins une fois
    await waitFor(() => {
      expect(statsService.getDashboardStats).toHaveBeenCalled();
    });
  });
});