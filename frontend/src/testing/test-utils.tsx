/**
 * Advanced Testing Utilities
 * Comprehensive testing helpers and utilities
 */

import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Custom render with providers
export function renderWithProviders(
  ui: ReactElement,
  {
    initialState = {},
    ...renderOptions
  }: RenderOptions & { initialState?: any } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    // Add your providers here
    return <>{children}</>;
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    user: userEvent.setup()
  };
}

// Mock data generators
export const mockData = {
  user: (overrides = {}) => ({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    ...overrides
  }),

  call: (overrides = {}) => ({
    id: 'call-456',
    status: 'completed',
    duration: 180,
    startTime: new Date('2024-01-01T10:00:00'),
    endTime: new Date('2024-01-01T10:03:00'),
    ...overrides
  }),

  constraint: (overrides = {}) => ({
    id: 'constraint-789',
    name: 'Test Constraint',
    value: 100,
    type: 'limit',
    active: true,
    ...overrides
  })
};

// Performance testing utilities
export class PerformanceTester {
  private marks = new Map<string, number>();
  private measures: Array<{ name: string; duration: number }> = [];

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) {
      throw new Error(`Start mark ${startMark} not found`);
    }
    
    const duration = (end || performance.now()) - start;
    this.measures.push({ name, duration });
    
    return duration;
  }

  getReport(): string {
    return this.measures
      .map(m => `${m.name}: ${m.duration.toFixed(2)}ms`)
      .join('\n');
  }

  assertPerformance(name: string, maxDuration: number): void {
    const measure = this.measures.find(m => m.name === name);
    if (!measure) {
      throw new Error(`Measure ${name} not found`);
    }
    
    if (measure.duration > maxDuration) {
      throw new Error(
        `Performance assertion failed: ${name} took ${measure.duration.toFixed(2)}ms ` +
        `(max: ${maxDuration}ms)`
      );
    }
  }

  reset(): void {
    this.marks.clear();
    this.measures = [];
  }
}

// Accessibility testing
export async function checkA11y(
  container: HTMLElement,
  options = {}
): Promise<void> {
  // Check for basic accessibility issues
  const issues: string[] = [];

  // Check images for alt text
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image missing alt text: ${img.src}`);
    }
  });

  // Check buttons for accessible text
  const buttons = container.querySelectorAll('button');
  buttons.forEach(btn => {
    if (!btn.textContent?.trim() && !btn.getAttribute('aria-label')) {
      issues.push('Button missing accessible text');
    }
  });

  // Check form inputs for labels
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach((input: Element) => {
    const id = input.id;
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        issues.push(`Form input missing label: ${id}`);
      }
    }
  });

  // Check heading hierarchy
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let lastLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    if (level - lastLevel > 1) {
      issues.push(`Heading hierarchy skip: h${lastLevel} to h${level}`);
    }
    lastLevel = level;
  });

  if (issues.length > 0) {
    throw new Error(`Accessibility issues found:\n${issues.join('\n')}`);
  }
}

// Snapshot testing utilities
export function createSnapshot(data: any): string {
  return JSON.stringify(data, null, 2);
}

export function compareSnapshots(actual: any, expected: any): boolean {
  return createSnapshot(actual) === createSnapshot(expected);
}

// Mock timers utilities
export const timers = {
  setup() {
    vi.useFakeTimers();
    return {
      advance: (ms: number) => vi.advanceTimersByTime(ms),
      runAll: () => vi.runAllTimers(),
      runPending: () => vi.runOnlyPendingTimers(),
      clear: () => vi.clearAllTimers(),
      restore: () => vi.useRealTimers()
    };
  }
};

// Network mocking utilities
export class NetworkMock {
  private responses = new Map<string, any>();
  private requests: Array<{ url: string; method: string; body?: any }> = [];

  mockResponse(url: string | RegExp, response: any, status = 200): void {
    const key = url instanceof RegExp ? url.source : url;
    this.responses.set(key, { response, status });
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    this.requests.push({
      url,
      method: options.method || 'GET',
      body: options.body
    });

    for (const [pattern, mockData] of this.responses) {
      if (url.includes(pattern) || new RegExp(pattern).test(url)) {
        return new Response(JSON.stringify(mockData.response), {
          status: mockData.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    throw new Error(`No mock found for ${url}`);
  }

  getRequests(): typeof this.requests {
    return [...this.requests];
  }

  clear(): void {
    this.responses.clear();
    this.requests = [];
  }
}

// Component testing helpers
export const componentHelpers = {
  // Wait for async updates
  async waitForUpdate(callback: () => void, timeout = 1000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        callback();
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    throw new Error('Timeout waiting for update');
  },

  // Simulate user interactions
  async simulateTyping(element: HTMLElement, text: string, delay = 50): Promise<void> {
    const user = userEvent.setup({ delay });
    await user.type(element, text);
  },

  // Check render count
  createRenderCounter() {
    let count = 0;
    return {
      increment: () => count++,
      get: () => count,
      reset: () => count = 0,
      assertRenderCount: (expected: number) => {
        if (count !== expected) {
          throw new Error(`Expected ${expected} renders, got ${count}`);
        }
      }
    };
  }
};

// State testing utilities
export function createStateTester<T>(initialState: T) {
  let currentState = initialState;
  const history: T[] = [initialState];
  
  return {
    getState: () => currentState,
    setState: (newState: T) => {
      currentState = newState;
      history.push(newState);
    },
    getHistory: () => [...history],
    reset: () => {
      currentState = initialState;
      history.length = 0;
      history.push(initialState);
    },
    assertState: (expected: Partial<T>) => {
      Object.entries(expected).forEach(([key, value]) => {
        if ((currentState as any)[key] !== value) {
          throw new Error(
            `State assertion failed: ${key} is ${(currentState as any)[key]}, expected ${value}`
          );
        }
      });
    }
  };
}

// Error boundary testing
export function createErrorBoundaryTester() {
  const errors: Error[] = [];
  
  const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasError, setHasError] = React.useState(false);
    
    React.useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        errors.push(new Error(error.message));
        setHasError(true);
      };
      
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);
    
    if (hasError) {
      return <div>Error occurred</div>;
    }
    
    return <>{children}</>;
  };
  
  return {
    ErrorBoundary,
    getErrors: () => [...errors],
    clearErrors: () => errors.length = 0,
    assertNoErrors: () => {
      if (errors.length > 0) {
        throw new Error(`Unexpected errors: ${errors.map(e => e.message).join(', ')}`);
      }
    }
  };
}

// Memory leak detector for tests
export function createMemoryLeakDetector() {
  const allocations = new WeakMap();
  const leaks: string[] = [];
  
  return {
    track(object: object, name: string): void {
      allocations.set(object, name);
    },
    
    checkLeaks(): void {
      // In a real implementation, this would use Chrome DevTools Protocol
      // or similar to check for actual memory leaks
      if (leaks.length > 0) {
        throw new Error(`Memory leaks detected: ${leaks.join(', ')}`);
      }
    },
    
    reset(): void {
      leaks.length = 0;
    }
  };
}

// Custom matchers
export const customMatchers = {
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${floor} - ${ceiling}`
          : `Expected ${received} to be within range ${floor} - ${ceiling}`
    };
  },
  
  toHaveBeenCalledBefore(received: vi.Mock, other: vi.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        pass: false,
        message: () => 'One or both functions were not called'
      };
    }
    
    const pass = Math.max(...receivedCalls) < Math.min(...otherCalls);
    return {
      pass,
      message: () =>
        pass
          ? `Expected first function not to be called before second`
          : `Expected first function to be called before second`
    };
  }
};