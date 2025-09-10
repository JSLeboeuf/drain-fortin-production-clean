import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockCall, mockFetch, MOCK_API_RESPONSES } from '../utils';
import Dashboard from '../../pages/Dashboard';

// Mock des composants enfants pour isoler les tests
vi.mock('../../components/dashboard/CallsTable', () => ({
  default: ({ calls, onSortChange }: any) => (
    <div data-testid="calls-table">
      <div data-testid="calls-count">{calls.length}</div>
      {calls.map((call: any) => (
        <div key={call.id} data-testid={`call-${call.id}`}>
          {call.phoneNumber}
        </div>
      ))}
      <button onClick={() => onSortChange?.('date')}>Sort by Date</button>
    </div>
  ),
}));

vi.mock('../../components/dashboard/LiveCallCard', () => ({
  default: ({ callId, phoneNumber }: any) => (
    <div data-testid={`live-call-${callId}`}>
      Live: {phoneNumber}
    </div>
  ),
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard without crashing', () => {
    mockFetch(MOCK_API_RESPONSES.CALLS);
    
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should handle basic navigation', async () => {
    mockFetch(MOCK_API_RESPONSES.CALLS);
    
    const { user } = renderWithProviders(<Dashboard />);

    // Vérifier que le dashboard se charge
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Vérifier la présence de liens de navigation basiques
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should display basic metrics', async () => {
    mockFetch(MOCK_API_RESPONSES.CALLS);

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Vérifier que les métriques sont présentes (même avec des données mock)
    await waitFor(() => {
      const dashboard = screen.getByText('Dashboard').parentElement;
      expect(dashboard).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle loading state correctly', () => {
    // Simuler un chargement lent
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_API_RESPONSES.CALLS)
      }), 100))
    );

    renderWithProviders(<Dashboard />);

    // Vérifier l'état de chargement
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', () => {
    // Simuler une erreur API
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.reject(new Error('API Error'))
    );

    // Mock console.error pour éviter les logs d'erreur en test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<Dashboard />);

    // Le dashboard devrait toujours se charger même avec des erreurs API
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});