// Types principaux de l'application

// Types utilisateur
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'technician';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les appels
export interface Call {
  id: string;
  callId: string;
  phoneNumber: string;
  clientName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  transcript?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordingUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les clients
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'prospect';
  priority: 'low' | 'medium' | 'high' | 'vip';
  notes?: string;
  lastContact?: Date;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les interventions
export interface Intervention {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  scheduledTime: Date;
  serviceAddress: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  technicianId?: string;
  technicianName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les SMS
export interface SMS {
  id: string;
  toNumber: string;
  fromNumber: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

// Types pour les alertes
export interface Alert {
  id: string;
  type: 'sla' | 'constraint' | 'system';
  title: string;
  message: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'pending' | 'acknowledged' | 'resolved';
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  minutesSinceCreated: number;
  requiredAction?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// Types pour les statistiques
export interface DashboardStats {
  totalCalls: number;
  totalLeads: number;
  urgentCalls: number;
  avgDuration: number;
  conversionRate: number;
  activeClients: number;
  todayInterventions: number;
  monthRevenue: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  p1Alerts: number;
  p2Alerts: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  latency: number;
}

// Types pour les paramètres
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  timezone: string;
  dateFormat: string;
  currency: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  urgentAlerts: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  requireSpecialChars: boolean;
  loginAttempts: number;
}

// Types pour les erreurs
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
}

// Types pour les logs
export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  data?: Record<string, any>;
}

// Types pour les requêtes API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Types pour les formulaires
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

export interface FormData {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string;
}

// Types pour les composants UI
export interface TableColumn<T = any> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string | number;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy: keyof T;
    sortOrder: 'asc' | 'desc';
    onSort: (sortBy: keyof T, sortOrder: 'asc' | 'desc') => void;
  };
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

// Types pour les hooks personnalisés
export interface UseAsyncStateReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<void>;
  reset: () => void;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

// Types pour les événements
export type AppEvent =
  | { type: 'USER_LOGIN'; payload: { user: User } }
  | { type: 'USER_LOGOUT' }
  | { type: 'CALL_RECEIVED'; payload: { call: Call } }
  | { type: 'ALERT_CREATED'; payload: { alert: Alert } }
  | { type: 'INTERVENTION_COMPLETED'; payload: { intervention: Intervention } }
  | { type: 'SMS_SENT'; payload: { sms: SMS } };

// Types pour les thèmes
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
}

// Types utilitaires
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
