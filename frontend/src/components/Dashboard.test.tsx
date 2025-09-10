import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock components and services
vi.mock('@/hooks/useInterventionsData', () => ({
  useInterventionsData: vi.fn(() => ({
    data: [
      { id: '1', status: 'pending', client_name: 'Test Client 1', urgency_level: 'high' },
      { id: '2', status: 'in_progress', client_name: 'Test Client 2', urgency_level: 'medium' },
      { id: '3', status: 'completed', client_name: 'Test Client 3', urgency_level: 'low' }
    ],
    isLoading: false,
    error: null
  }))
}));

vi.mock('@/hooks/useCallsData', () => ({
  useCallsData: vi.fn(() => ({
    data: [
      { id: '1', status: 'ended', duration: 180, created_at: new Date().toISOString() },
      { id: '2', status: 'ended', duration: 240, created_at: new Date().toISOString() }
    ],
    isLoading: false,
    error: null
  }))
}));

// Test wrapper
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

describe('Dashboard Component Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metrics Display', () => {
    it('should display all key metrics correctly', async () => {
      const Dashboard = (await import('@/pages/Dashboard')).default;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check for main metric cards
        expect(screen.getByText(/Interventions/i)).toBeInTheDocument();
        expect(screen.getByText(/Appels/i)).toBeInTheDocument();
        expect(screen.getByText(/Taux de r\u00e9solution/i)).toBeInTheDocument();
      });
    });

    it('should calculate metrics accurately', async () => {
      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // With 3 interventions (1 completed out of 3)
        const resolutionRate = screen.getByText(/33%/); // 1/3 = 33%
        expect(resolutionRate).toBeInTheDocument();
      });
    });

    it('should update metrics in real-time', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      const mockUseInterventions = vi.mocked(useInterventionsData);
      
      // Initial data
      mockUseInterventions.mockReturnValue({
        data: [
          { id: '1', status: 'pending', client_name: 'Test', urgency_level: 'high' }
        ],
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      const { rerender } = render(<Dashboard />, { wrapper: createWrapper() });

      // Update data
      mockUseInterventions.mockReturnValue({
        data: [
          { id: '1', status: 'completed', client_name: 'Test', urgency_level: 'high' },
          { id: '2', status: 'pending', client_name: 'Test2', urgency_level: 'low' }
        ],
        isLoading: false,
        error: null
      });

      rerender(<Dashboard />);

      await waitFor(() => {
        // Resolution rate should update to 50% (1/2)
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      const { useCallsData } = await import('@/hooks/useCallsData');
      
      vi.mocked(useInterventionsData).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      });
      
      vi.mocked(useCallsData).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Aucune intervention/i)).toBeInTheDocument();
        expect(screen.getByText(/0%/)).toBeInTheDocument(); // 0% resolution rate
      });
    });

    it('should handle loading state', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      
      vi.mocked(useInterventionsData).mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      
      vi.mocked(useInterventionsData).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Erreur/i)).toBeInTheDocument();
      });
    });

    it('should handle null/undefined values in data', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      
      vi.mocked(useInterventionsData).mockReturnValue({
        data: [
          { id: '1', status: null, client_name: undefined, urgency_level: null },
          { id: '2', status: 'pending', client_name: 'Test', urgency_level: 'high' }
        ],
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      // Should not crash and display what it can
      await waitFor(() => {
        expect(screen.getByText(/Test/)).toBeInTheDocument();
      });
    });

    it('should handle very large datasets efficiently', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      
      // Generate 1000 interventions
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        status: i % 3 === 0 ? 'completed' : 'pending',
        client_name: `Client ${i}`,
        urgency_level: ['low', 'medium', 'high'][i % 3]
      }));

      vi.mocked(useInterventionsData).mockReturnValue({
        data: largeDataset,
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      const startTime = performance.now();
      render(<Dashboard />, { wrapper: createWrapper() });
      const renderTime = performance.now() - startTime;

      // Should render within reasonable time (< 1 second)
      expect(renderTime).toBeLessThan(1000);
      
      await waitFor(() => {
        // Should show correct calculation (333 completed out of 1000)
        expect(screen.getByText(/33/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate average response time', async () => {
      const { useCallsData } = await import('@/hooks/useCallsData');
      
      vi.mocked(useCallsData).mockReturnValue({
        data: [
          { id: '1', status: 'ended', duration: 120, created_at: new Date().toISOString() },
          { id: '2', status: 'ended', duration: 180, created_at: new Date().toISOString() },
          { id: '3', status: 'ended', duration: 240, created_at: new Date().toISOString() }
        ],
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Average duration: (120 + 180 + 240) / 3 = 180 seconds = 3 minutes
        expect(screen.getByText(/3 min/i)).toBeInTheDocument();
      });
    });

    it('should display urgency distribution', async () => {
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      
      vi.mocked(useInterventionsData).mockReturnValue({
        data: [
          { id: '1', status: 'pending', client_name: 'A', urgency_level: 'urgent' },
          { id: '2', status: 'pending', client_name: 'B', urgency_level: 'urgent' },
          { id: '3', status: 'pending', client_name: 'C', urgency_level: 'high' },
          { id: '4', status: 'pending', client_name: 'D', urgency_level: 'medium' },
          { id: '5', status: 'pending', client_name: 'E', urgency_level: 'low' }
        ],
        isLoading: false,
        error: null
      });

      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/2 urgent/i)).toBeInTheDocument();
        expect(screen.getByText(/1 high/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should filter interventions by status', async () => {
      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      const filterButton = await screen.findByRole('button', { name: /Filtrer/i });
      await userEvent.click(filterButton);

      const pendingFilter = await screen.findByRole('checkbox', { name: /En attente/i });
      await userEvent.click(pendingFilter);

      await waitFor(() => {
        // Should only show pending interventions
        expect(screen.queryByText(/Test Client 3/)).not.toBeInTheDocument(); // completed
        expect(screen.getByText(/Test Client 1/)).toBeInTheDocument(); // pending
      });
    });

    it('should refresh data on demand', async () => {
      const Dashboard = (await import('@/components/Dashboard')).Dashboard;
      render(<Dashboard />, { wrapper: createWrapper() });

      const refreshButton = await screen.findByRole('button', { name: /Actualiser/i });
      await userEvent.click(refreshButton);

      // Should trigger data refetch
      const { useInterventionsData } = await import('@/hooks/useInterventionsData');
      expect(vi.mocked(useInterventionsData)).toHaveBeenCalled();
    });
  });
});

describe('Dashboard Stress Tests', () => {
  it('should handle rapid status updates', async () => {
    const Dashboard = (await import('@/components/Dashboard')).Dashboard;
    const { rerender } = render(<Dashboard />, { wrapper: createWrapper() });

    // Simulate 10 rapid updates
    for (let i = 0; i < 10; i++) {
      rerender(<Dashboard />);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Should still be functional
    expect(screen.getByText(/Interventions/i)).toBeInTheDocument();
  });

  it('should handle memory efficiently with large updates', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    const { Dashboard } = await import('@/components/Dashboard');
    const { unmount } = render(<Dashboard />, { wrapper: createWrapper() });
    
    unmount();
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryLeak = finalMemory - initialMemory;
    
    // Should not leak more than 10MB
    expect(memoryLeak).toBeLessThan(10 * 1024 * 1024);
  });
});