/**
 * Type definitions for VAPI Dashboard
 */

export interface Alert {
  type: 'info' | 'error' | 'warning' | 'success';
  title: string;
  message: string;
  created_at: string;
}

export interface VapiCall {
  id: string;
  customer_phone: string;
  status: 'active' | 'completed' | 'failed' | 'pending';
  duration?: number;
  created_at: string;
  transcript?: string;
  summary?: string;
  priority?: string;
}

export interface DashboardStats {
  todayCalls: number;
  successCalls: number;
  failedCalls: number;
  avgDuration: number;
}

export type ConnectionStatus = 'connected' | 'disconnected';