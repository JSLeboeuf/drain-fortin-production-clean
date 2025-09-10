// TypeScript types for VAPI webhook system
import type { 
  WebhookPayload,
  CallData,
  ToolCall,
  StructuredData 
} from '../validation/vapi-schemas.ts';

// Re-export main types from schemas
export type {
  WebhookPayload,
  HealthCheckPayload,
  CallStartedPayload,
  CallEndedPayload,
  ToolCallsPayload,
  TranscriptPayload,
  FunctionCallPayload,
  MessagePayload,
  CallData,
  ToolCall,
  StructuredData
} from '../validation/vapi-schemas.ts';

// Function result types for tool calls
export interface ValidateServiceRequestResult {
  accepted: boolean;
  reason: 'service_available' | 'service_not_offered' | 'service_restricted';
  message: string;
  serviceType?: string;
  restrictions?: string[];
}

export interface CalculateQuoteResult {
  min: number;
  max: number;
  currency: 'CAD';
  message: string;
  factors?: {
    basePrice: number;
    complexity: number;
    urgency: number;
    location: number;
  };
  estimatedDuration?: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
}

export interface ClassifyPriorityResult {
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  reason: 'urgence_immediate' | 'municipal' | 'high_value' | 'standard' | 'inspection_required';
  sla_seconds: number;
  escalation?: {
    required: boolean;
    to: string[];
    reason: string;
  };
  businessHours?: boolean;
}

export interface EvaluateSchedulingResult {
  window: string;
  canSchedule: boolean;
  message: string;
  earliestDate?: string;
  nextAvailableSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    type: 'morning' | 'afternoon' | 'emergency';
  }>;
  requirements?: string[];
}

export interface SendSMSAlertResult {
  sent: boolean;
  sids?: string[];
  priority: string;
  error?: string;
  status?: number;
  body?: string;
  recipients?: {
    successful: string[];
    failed: Array<{
      phoneNumber: string;
      error: string;
    }>;
  };
}

// Union type for all function results
export type FunctionResult = 
  | ValidateServiceRequestResult
  | CalculateQuoteResult
  | ClassifyPriorityResult
  | EvaluateSchedulingResult
  | SendSMSAlertResult;

// Function call response format
export interface ToolCallResponse {
  toolCallId: string;
  result: FunctionResult | { error: string; message: string };
}

export interface FunctionCallResponse {
  results: ToolCallResponse[];
}

// Database record types matching the Supabase schema
export interface VAPICallRecord {
  id?: number;
  call_id: string;
  assistant_id: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended' | 'active' | 'completed';
  started_at: string;
  ended_at?: string;
  call_duration?: number;
  analysis?: Record<string, any>;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  postal_code?: string;
  problem_description?: string;
  service_type?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  priority_reason?: string;
  sla_seconds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ToolCallRecord {
  id?: number;
  call_id: string;
  tool_name: string;
  tool_call_id: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  timestamp: string;
  execution_time_ms?: number;
  success?: boolean;
  error_message?: string;
  created_at?: string;
}

export interface CallTranscriptRecord {
  id?: number;
  call_id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  confidence?: number;
  timestamp: string;
  word_count?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  created_at?: string;
}

export interface CallMessageRecord {
  id?: number;
  call_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  message: string;
  timestamp: string;
  message_type?: 'text' | 'function_call' | 'function_result' | 'system';
  metadata?: Record<string, any>;
  created_at?: string;
}

// Service configuration types
export interface ServicePricing {
  debouchage_camera: { min: number; max: number; unit: 'per_service' };
  racines_alesage: { min: number; max: number; unit: 'per_service' };
  gainage_installation: { min: number; max: number; unit: 'per_foot' };
  drain_francais: { min: number; max: number; unit: 'per_foot' };
  inspection: { min: number; max: number; unit: 'per_service' };
}

export interface ServiceScheduling {
  drain_francais: { window: string; requiresAssessment: boolean };
  inspection: { window: string; requiresAssessment: false };
  gainage: { window: string; requiresAssessment: true };
  debouchage_camera: { window: string; requiresAssessment: false };
  racines_alesage: { window: string; requiresAssessment: false };
}

// Business logic types
export interface PriorityClassification {
  keywords: {
    P1: string[]; // Emergency keywords
    P2: string[]; // Municipal keywords  
    P3: string[]; // High value keywords
  };
  valueThresholds: {
    P3: number; // High value threshold
  };
  slaSeconds: {
    P1: 0;      // Immediate
    P2: 120;    // 2 minutes
    P3: 3600;   // 1 hour
    P4: 1800;   // 30 minutes
  };
}

export interface ServiceValidation {
  accepted: string[]; // Accepted service keywords
  refused: string[];  // Refused service keywords
  requiresAssessment: string[]; // Services requiring on-site assessment
}

// Error context types for better error handling
export interface WebhookErrorContext {
  payloadType?: string;
  callId?: string;
  toolCallId?: string;
  operation?: string;
  payloadSize?: number;
  timestamp?: string;
  signature?: string;
  userAgent?: string;
}

export interface SecurityEventContext {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'vapi-webhook' | 'rate-limiter' | 'hmac-validator' | 'payload-validator';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Response types for API consistency
export interface WebhookResponse {
  success: boolean;
  type: string;
  timestamp?: string;
  callId?: string;
  processed?: boolean;
  warnings?: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode?: number;
    details?: any;
    context?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

// Metrics and monitoring types
export interface WebhookMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByType: Record<string, number>;
  errorsByCode: Record<string, number>;
  securityEvents: number;
  rateLimitViolations: number;
  lastReset: string;
}

export interface CallMetrics {
  totalCalls: number;
  completedCalls: number;
  averageCallDuration: number;
  callsByPriority: Record<string, number>;
  toolCallsByFunction: Record<string, number>;
  successfulToolCalls: number;
  failedToolCalls: number;
}

// Configuration types
export interface WebhookConfig {
  maxPayloadSize: number;
  maxRequestsPerMinute: number;
  hmacSecret: string;
  enforceHttps: boolean;
  maxClockSkew: number;
  requiredHeaders: readonly string[];
  allowedContentTypes: readonly string[];
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  maxRecipientsPerSMS: number;
  maxSMSLength: number;
  retryAttempts: number;
}

// Utility types
export type WebhookEventType = WebhookPayload['type'];
export type ServiceType = keyof ServicePricing;
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type CallStatus = VAPICallRecord['status'];
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Type guards
export function isCallStartedPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').CallStartedPayload {
  return payload.type === 'call-started';
}

export function isCallEndedPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').CallEndedPayload {
  return payload.type === 'call-ended';
}

export function isFunctionCallPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').FunctionCallPayload {
  return payload.type === 'function-call';
}

export function isToolCallsPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').ToolCallsPayload {
  return payload.type === 'tool-calls';
}

export function isTranscriptPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').TranscriptPayload {
  return payload.type === 'transcript';
}

export function isHealthCheckPayload(payload: WebhookPayload): payload is import('../validation/vapi-schemas.ts').HealthCheckPayload {
  return payload.type === 'health-check';
}