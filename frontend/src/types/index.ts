export interface LiveCall {
  id: string;
  phoneNumber: string;
  startTime: Date;
  duration: number;
  transcript: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'active' | 'completed' | 'transferred' | 'failed';
  isLive: boolean;
  metadata?: Record<string, any>;
}

// Remarque: pour éviter les dépendances croisées fragiles, les types backend
// ne sont plus ré-exportés depuis le dossier racine. Définissez ici les
// interfaces strictement nécessaires au frontend.

// Frontend-specific Call interface (extends backend)
export interface Call {
  id: string;
  phoneNumber: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'active' | 'completed' | 'transferred' | 'failed' | 'in-progress';
  recordingUrl?: string;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalCalls: number;
  averageCallDuration: number;
  emergenciesDetected: number;
  constraintsRespected: number;
  totalConstraints: number;
  trends: {
    calls: number;
    callDuration: number;
    emergencies: number;
  };
}

export interface CallFilters {
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  status?: string;
  search?: string;
}

export interface Analytics {
  id: string;
  date: string;
  totalCalls: number;
  avgCallDuration: number;
  emergenciesDetected: number;
  constraintsRespected: number;
  topKeywords: Array<{
    name: string;
    count: number;
    frequency: number;
  }>;
}

export interface Settings {
  id: string;
  key: string;
  value: any;
  updatedAt: Date;
}

export interface Constraint {
  id: string;
  name: string;
  active: boolean;
  condition: string;
  action: string;
  baseValue?: string | number | boolean | null;
  overrideValue?: string | number | boolean | null;
}

export interface TestCallRequest {
  phoneNumber: string;
  scenario: string;
  service: string;
  zone: string;
}

export interface WebSocketMessage {
  type: 'call:new' | 'call:update' | 'call:end' | 'call:test' | 'alert:p1' | 'transcript' | 
        'auth:request' | 'auth:success' | 'auth:failed' | 'ping' | 'pong' | 
        'connection:failed' | 'metrics:update';
  data: any;
  timestamp: number;
  id: string;
  signature?: string; // HMAC signature pour validation
}

export interface SecureWebSocketConfig {
  maxMessageSize: number;
  rateLimitMs: number;
  heartbeatIntervalMs: number;
  authTimeoutMs: number;
  maxReconnectAttempts: number;
}

export interface WebSocketAuthToken {
  token: string;
  expiresAt: number;
  permissions: string[];
  userId?: string;
}
