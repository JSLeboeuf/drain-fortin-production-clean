import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Custom render function avec providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Mock wouter pour les tests de navigation
  const MockRouter = ({ children }: { children: React.ReactNode }) => {
    // Simple mock qui rend les enfants sans logique de routing
    return <div data-testid="mock-router">{children}</div>;
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockRouter>
          {children}
        </MockRouter>
      </QueryClientProvider>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Helper pour créer des mocks de données
export const createMockCall = (overrides = {}) => ({
  id: 'test-call-1',
  phoneNumber: '+1234567890',
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T10:05:00Z'),
  duration: 300,
  transcript: 'Test call transcript',
  priority: 'P3' as const,
  status: 'completed' as const,
  recordingUrl: 'https://example.com/recording.mp3',
  metadata: {
    service: 'debouchage',
    tag: 'urgent',
    scenario: 'kitchen-sink',
  },
  ...overrides,
});

export const createMockConstraint = (overrides = {}) => ({
  id: 'test-constraint-1',
  name: 'Test Constraint',
  value: true,
  type: 'boolean' as const,
  category: 'Test Category',
  description: 'Test constraint description',
  priority: 'medium' as const,
  source: 'system' as const,
  lastModified: '2024-01-01T10:00:00Z',
  modifiedBy: 'test-user',
  effectiveValue: true,
  validation: {
    required: true,
  },
  impact: {
    performance: 'low' as const,
    stability: 'medium' as const,
    security: 'high' as const,
  },
  ...overrides,
});

// Helper pour les tests d'accessibilité
export const checkAccessibility = async (container: HTMLElement) => {
  // Import dynamique d'axe-core pour les tests d'accessibilité
  const { default: axe } = await import('axe-core');
  
  const results = await axe.run(container, {
    rules: {
      // Désactiver certaines règles pour les tests
      'color-contrast': { enabled: false }, // Peut être difficile à tester en JSDOM
    },
  });

  return results;
};

// Mock pour fetch API
export const mockFetch = (responseData: any, status = 200) => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
      headers: new Headers(),
    })
  );
};

// Helper pour tester les hooks
export { renderHook } from '@testing-library/react';

// Helper pour attendre les updates asynchrones
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock pour les notifications
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// Helper pour simuler les erreurs réseau
export const simulateNetworkError = () => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.reject(new Error('Network Error'))
  );
};

// Helper pour simuler les timeouts
export const simulateTimeout = (delay = 1000) => {
  global.fetch = vi.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, delay))
  );
};

// Constantes pour les tests
export const TEST_IDS = {
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message',
  EMPTY_STATE: 'empty-state',
  CALLS_TABLE: 'calls-table',
  CONSTRAINT_VALIDATOR: 'constraint-validator',
} as const;

export const MOCK_API_RESPONSES = {
  CALLS: [createMockCall(), createMockCall({ id: 'test-call-2' })],
  CONSTRAINTS: [createMockConstraint(), createMockConstraint({ id: 'test-constraint-2' })],
  ANALYTICS: {
    totalCalls: 100,
    answeredPct: 85,
    avgDuration: 180,
    conversionPct: 25,
    topIntents: [
      { intent: 'debouchage', count: 45 },
      { intent: 'inspection', count: 32 },
    ],
  },
} as const;