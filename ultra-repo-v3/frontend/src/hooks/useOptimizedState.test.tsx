/**
 * Test Suite for Performance Optimization Hooks
 * Validates debouncing, throttling, and state management optimizations
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  useDebouncedState,
  useThrottledState,
  useLazyState,
  usePersistentState,
  useAsyncState
} from './useOptimizedState';

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Performance Optimization Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useDebouncedState', () => {
    it('should debounce state updates', () => {
      const { result } = renderHook(() => useDebouncedState('initial', 300));
      
      const [value, debouncedValue, setValue] = result.current;
      
      expect(value).toBe('initial');
      expect(debouncedValue).toBe('initial');
      
      // Update value multiple times quickly
      act(() => {
        setValue('update1');
      });
      
      act(() => {
        setValue('update2');
      });
      
      act(() => {
        setValue('final');
      });
      
      // Immediate value should be updated
      expect(result.current[0]).toBe('final');
      // Debounced value should still be initial
      expect(result.current[1]).toBe('initial');
      
      // Advance timers to trigger debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Now debounced value should be updated
      expect(result.current[1]).toBe('final');
    });

    it('should reset debounce timer on rapid updates', () => {
      const { result } = renderHook(() => useDebouncedState('', 300));
      const [, , setValue] = result.current;
      
      act(() => {
        setValue('first');
      });
      
      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      act(() => {
        setValue('second');
      });
      
      // Advance remaining time from first update
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      // Should still be initial because timer was reset
      expect(result.current[1]).toBe('');
      
      // Advance full debounce time
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Now should have the second value
      expect(result.current[1]).toBe('second');
    });
  });

  describe('useThrottledState', () => {
    it('should throttle state updates', () => {
      const { result } = renderHook(() => useThrottledState('initial', 100));
      
      const [value, throttledValue, setValue] = result.current;
      
      expect(value).toBe('initial');
      expect(throttledValue).toBe('initial');
      
      // First update should go through immediately
      act(() => {
        setValue('update1');
      });
      
      expect(result.current[0]).toBe('update1');
      expect(result.current[1]).toBe('update1');
      
      // Rapid updates should be throttled
      act(() => {
        setValue('update2');
      });
      
      act(() => {
        setValue('update3');
      });
      
      expect(result.current[0]).toBe('update3');
      expect(result.current[1]).toBe('update1'); // Still throttled
      
      // Advance time to allow next throttled update
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      expect(result.current[1]).toBe('update3');
    });
  });

  describe('useLazyState', () => {
    it('should initialize state lazily', () => {
      const expensiveCalculation = vi.fn(() => 'expensive result');
      
      const { result } = renderHook(() => useLazyState(expensiveCalculation));
      
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      expect(result.current[0]).toBe('expensive result');
    });

    it('should not reinitialize on rerenders', () => {
      const expensiveCalculation = vi.fn(() => 'expensive result');
      
      const { result, rerender } = renderHook(() => useLazyState(expensiveCalculation));
      
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      
      rerender();
      rerender();
      
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      expect(result.current[0]).toBe('expensive result');
    });
  });

  describe('usePersistentState', () => {
    it('should persist state to localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => 
        usePersistentState('testKey', 'defaultValue')
      );
      
      expect(result.current[0]).toBe('defaultValue');
      
      act(() => {
        result.current[1]('newValue');
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'testKey',
        expect.any(String)
      );
    });

    it('should load persisted state from localStorage', () => {
      const persistedData = JSON.stringify({
        value: 'persistedValue',
        timestamp: Date.now(),
        encrypted: false
      });
      
      mockLocalStorage.getItem.mockReturnValue(persistedData);
      
      const { result } = renderHook(() => 
        usePersistentState('testKey', 'defaultValue')
      );
      
      expect(result.current[0]).toBe('persistedValue');
    });

    it('should handle expired persisted data', () => {
      const expiredData = JSON.stringify({
        value: 'expiredValue',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        encrypted: false
      });
      
      mockLocalStorage.getItem.mockReturnValue(expiredData);
      
      const { result } = renderHook(() => 
        usePersistentState('testKey', 'defaultValue', {
          ttl: 24 * 60 * 60 * 1000 // 24 hours
        })
      );
      
      expect(result.current[0]).toBe('defaultValue');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('useAsyncState', () => {
    it('should handle async operations with loading states', async () => {
      const asyncOperation = vi.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => useAsyncState(asyncOperation));
      
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      
      act(() => {
        result.current.execute();
      });
      
      expect(result.current.loading).toBe(true);
      
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      
      expect(result.current.data).toBe('success');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle async operation errors', async () => {
      const asyncOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      const { result } = renderHook(() => useAsyncState(asyncOperation));
      
      act(() => {
        result.current.execute();
      });
      
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(new Error('Test error'));
    });

    it('should reset state correctly', async () => {
      const asyncOperation = vi.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => useAsyncState(asyncOperation));
      
      act(() => {
        result.current.execute();
      });
      
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      
      expect(result.current.data).toBe('success');
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});