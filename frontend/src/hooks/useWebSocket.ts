/**
 * ULTRA-OPTIMIZED WEBSOCKET HOOK
 * Real-time updates with automatic reconnection and event handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  
  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, [url]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectCount(0);
        onConnect?.();
        
        // Subscribe to VAPI events
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'vapi-events'
        }));
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle different message types
          switch (message.type) {
            case 'connected':
              console.log('WebSocket handshake complete:', message.data);
              break;
              
            case 'pong':
              // Ping response, connection is alive
              break;
              
            case 'vapi-event':
              handleVapiEvent(message.data);
              break;
              
            case 'call-started':
              toast.info(`New call started: ${message.data?.phoneNumber}`);
              break;
              
            case 'call-ended':
              toast.success(`Call completed (${message.data?.duration}s)`);
              break;
              
            case 'speech-update':
              // Real-time transcription update
              break;
              
            case 'handoff-triggered':
              toast.warning('Call requires human intervention!', {
                duration: 10000,
                important: true
              });
              break;
              
            case 'alert':
              handleAlert(message.data);
              break;
              
            default:
              onMessage?.(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Attempt reconnection
        if (reconnectCount < maxReconnectAttempts) {
          const nextReconnectCount = reconnectCount + 1;
          setReconnectCount(nextReconnectCount);
          
          console.log(`Reconnecting in ${reconnectInterval}ms (attempt ${nextReconnectCount}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          toast.error('WebSocket connection lost. Please refresh the page.');
        }
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      onError?.(error as Event);
    }
  }, [getWebSocketUrl, onConnect, onDisconnect, onError, onMessage, reconnectCount, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  // Handle VAPI events
  const handleVapiEvent = (data: any) => {
    console.log('VAPI Event:', data);
    
    // Update UI based on event type
    switch (data.type) {
      case 'assistant-request':
        // Assistant is processing
        break;
      case 'assistant-response':
        // Assistant responded
        break;
      case 'tool-call':
        // Tool was executed
        break;
      default:
        // Generic VAPI event
        break;
    }
    
    // Pass to parent handler
    onMessage?.({
      type: 'vapi-event',
      data,
      timestamp: new Date().toISOString()
    });
  };

  // Handle alerts
  const handleAlert = (alert: any) => {
    const severity = alert.severity || 'info';
    const message = alert.message || 'System alert';
    
    switch (severity) {
      case 'high':
      case 'critical':
        toast.error(message, { duration: 10000, important: true });
        break;
      case 'medium':
        toast.warning(message, { duration: 7000 });
        break;
      default:
        toast.info(message);
    }
  };

  // Setup and cleanup
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []); // Empty deps, only run once

  // Public API
  return {
    isConnected,
    reconnectCount,
    sendMessage,
    connect,
    disconnect
  };
}

// Global WebSocket instance for singleton pattern
let globalWebSocket: ReturnType<typeof useWebSocket> | null = null;

export function useGlobalWebSocket(options?: UseWebSocketOptions) {
  if (!globalWebSocket) {
    globalWebSocket = useWebSocket(options);
  }
  return globalWebSocket;
}