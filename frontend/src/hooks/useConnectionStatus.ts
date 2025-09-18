/**
 * Custom hook for connection status
 * Manages WebSocket connection state and reconnection logic
 */

import { useState, useEffect } from 'react';

import type { UseConnectionStatusResult } from '@/types';

export const useConnectionStatus = (): UseConnectionStatusResult => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const reconnect = (): void => {
    setStatus('connecting');
    setReconnectAttempts(prev => prev + 1);
    
    // Simulate connection attempt
    setTimeout(() => {
      const isConnected = Math.random() > 0.2; // 80% success rate
      setStatus(isConnected ? 'connected' : 'disconnected');
    }, 2000);
  };

  useEffect(() => {
    // Initial connection
    reconnect();

    // Set up periodic connection check
    const interval = setInterval(() => {
      if (status === 'disconnected') {
        reconnect();
      }
    }, 10000); // Try to reconnect every 10 seconds

    return () => clearInterval(interval);
  }, [status]);

  return {
    status,
    isConnected: status === 'connected',
    reconnect,
  };
};