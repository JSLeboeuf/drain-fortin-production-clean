// Comprehensive Zod validation schemas for VAPI webhook payloads
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Base timestamp schema with validation
const timestampSchema = z.string()
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/))
  .transform((val) => new Date(val).toISOString())
  .refine((val) => !isNaN(Date.parse(val)), "Invalid timestamp format");

// UUID validation schema
const uuidSchema = z.string().uuid("Invalid UUID format");

// Phone number validation (E.164 format with some flexibility)
const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .min(10, "Phone number too short")
  .max(17, "Phone number too long");

// Email validation
const emailSchema = z.string().email("Invalid email format").max(254);

// Postal code validation (Canadian format)
const postalCodeSchema = z.string()
  .regex(/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, "Invalid Canadian postal code")
  .transform((val) => val.toUpperCase().replace(/\s/g, ''));

// Priority levels for business logic
const prioritySchema = z.enum(['P1', 'P2', 'P3', 'P4']);

// Service type validation
const serviceTypeSchema = z.enum([
  'debouchage_camera',
  'racines_alesage', 
  'gainage_installation',
  'drain_francais',
  'inspection',
  'gainage'
]);

// Call status validation
const callStatusSchema = z.enum([
  'queued',
  'ringing', 
  'in-progress',
  'forwarding',
  'ended'
]);

// Transcript role validation
const transcriptRoleSchema = z.enum(['user', 'assistant', 'system']);

// Message role validation  
const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

// Tool call function arguments schemas
const validateServiceRequestArgsSchema = z.object({
  service: z.string().min(1, "Service description required").max(500)
});

const calculateQuoteArgsSchema = z.object({
  serviceType: serviceTypeSchema,
  description: z.string().optional(),
  estimatedValue: z.number().positive().optional()
});

const classifyPriorityArgsSchema = z.object({
  description: z.string().min(1, "Description required").max(1000),
  estimatedValue: z.number().positive().optional()
});

const evaluateSchedulingArgsSchema = z.object({
  serviceType: serviceTypeSchema,
  priority: prioritySchema.optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const sendSMSAlertArgsSchema = z.object({
  message: z.string().min(1, "Message required").max(1600), // SMS length limit
  phoneNumbers: z.array(phoneNumberSchema).min(1, "At least one phone number required").max(10),
  priority: prioritySchema
});

// Tool call function schema with discriminated union
const toolCallFunctionSchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('validateServiceRequest'),
    arguments: validateServiceRequestArgsSchema
  }),
  z.object({
    name: z.literal('calculateQuote'),
    arguments: calculateQuoteArgsSchema
  }),
  z.object({
    name: z.literal('classifyPriority'),
    arguments: classifyPriorityArgsSchema
  }),
  z.object({
    name: z.literal('evaluateScheduling'),
    arguments: evaluateSchedulingArgsSchema
  }),
  z.object({
    name: z.literal('sendSMSAlert'),
    arguments: sendSMSAlertArgsSchema
  })
]);

// Individual tool call schema
const toolCallSchema = z.object({
  toolCallId: uuidSchema,
  function: toolCallFunctionSchema
});

// Call analysis structured data schema
const structuredDataSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  courriel: emailSchema.optional(),
  adresse: z.string().min(1).max(200).optional(),
  codePostal: postalCodeSchema.optional(),
  description: z.string().min(1).max(1000).optional(),
  estimatedValue: z.number().positive().optional(),
  serviceType: serviceTypeSchema.optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional()
}).strict();

// Call analysis schema
const callAnalysisSchema = z.object({
  summary: z.string().max(500).optional(),
  structuredData: structuredDataSchema.optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  duration: z.number().positive().optional(),
  wordCount: z.number().nonnegative().optional()
}).strict();

// Call object schema
const callSchema = z.object({
  id: uuidSchema,
  assistantId: uuidSchema,
  phoneNumber: phoneNumberSchema.optional(),
  customerId: uuidSchema.optional(),
  status: callStatusSchema.optional(),
  startedAt: timestampSchema.optional(),
  endedAt: timestampSchema.optional(),
  duration: z.number().positive().optional(),
  analysis: callAnalysisSchema.optional()
}).strict();

// Message schema
const messageSchema = z.object({
  role: messageRoleSchema,
  message: z.string().min(1, "Message content required").max(5000),
  timestamp: timestampSchema
}).strict();

// Transcript schema
const transcriptSchema = z.object({
  role: transcriptRoleSchema,
  transcript: z.string().min(1, "Transcript content required").max(5000),
  timestamp: timestampSchema,
  confidence: z.number().min(0).max(1).optional()
}).strict();

// Base webhook payload schema
const baseWebhookPayloadSchema = z.object({
  type: z.string().min(1, "Event type required"),
  timestamp: timestampSchema,
  call: callSchema.optional(),
  message: messageSchema.optional(),
  toolCalls: z.array(toolCallSchema).optional(),
  transcript: transcriptSchema.optional()
}).strict();

// Webhook event type discriminated union schemas
export const healthCheckPayloadSchema = z.object({
  type: z.literal('health-check'),
  timestamp: timestampSchema
}).strict();

export const callStartedPayloadSchema = z.object({
  type: z.literal('call-started'),
  timestamp: timestampSchema,
  call: callSchema.refine(
    (call) => call.id && call.assistantId,
    "Call ID and assistant ID required for call-started events"
  )
}).strict();

export const callEndedPayloadSchema = z.object({
  type: z.literal('call-ended'), 
  timestamp: timestampSchema,
  call: callSchema.refine(
    (call) => call.id && call.assistantId && call.endedAt,
    "Call ID, assistant ID, and end time required for call-ended events"
  )
}).strict();

export const toolCallsPayloadSchema = z.object({
  type: z.literal('tool-calls'),
  timestamp: timestampSchema,
  call: callSchema.refine(
    (call) => call.id,
    "Call ID required for tool-calls events"
  ),
  toolCalls: z.array(toolCallSchema).min(1, "At least one tool call required")
}).strict();

export const transcriptPayloadSchema = z.object({
  type: z.literal('transcript'),
  timestamp: timestampSchema,
  call: callSchema.refine(
    (call) => call.id,
    "Call ID required for transcript events"
  ),
  transcript: transcriptSchema
}).strict();

export const functionCallPayloadSchema = z.object({
  type: z.literal('function-call'),
  timestamp: timestampSchema,
  call: callSchema.optional(),
  toolCalls: z.array(toolCallSchema).min(1, "At least one tool call required")
}).strict();

export const messagePayloadSchema = z.object({
  type: z.literal('message'),
  timestamp: timestampSchema,
  call: callSchema.refine(
    (call) => call.id,
    "Call ID required for message events"
  ),
  message: messageSchema
}).strict();

// Main discriminated union for all webhook payloads
export const webhookPayloadSchema = z.discriminatedUnion('type', [
  healthCheckPayloadSchema,
  callStartedPayloadSchema,
  callEndedPayloadSchema,
  toolCallsPayloadSchema,
  transcriptPayloadSchema,
  functionCallPayloadSchema,
  messagePayloadSchema
]);

// Type exports for TypeScript
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type HealthCheckPayload = z.infer<typeof healthCheckPayloadSchema>;
export type CallStartedPayload = z.infer<typeof callStartedPayloadSchema>;
export type CallEndedPayload = z.infer<typeof callEndedPayloadSchema>;
export type ToolCallsPayload = z.infer<typeof toolCallsPayloadSchema>;
export type TranscriptPayload = z.infer<typeof transcriptPayloadSchema>;
export type FunctionCallPayload = z.infer<typeof functionCallPayloadSchema>;
export type MessagePayload = z.infer<typeof messagePayloadSchema>;
export type CallData = z.infer<typeof callSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type StructuredData = z.infer<typeof structuredDataSchema>;

// Validation helper functions
export function validateWebhookPayload(data: unknown): { 
  success: true; 
  data: WebhookPayload; 
} | { 
  success: false; 
  errors: z.ZodError; 
} {
  const result = webhookPayloadSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

export function validatePayloadSize(payload: string, maxSizeBytes = 1024 * 1024): boolean {
  return new TextEncoder().encode(payload).length <= maxSizeBytes;
}

export function sanitizeForLogging(payload: WebhookPayload): Record<string, any> {
  const sanitized = { ...payload };
  
  // Remove or mask sensitive data for logging
  if (sanitized.call?.phoneNumber) {
    const phone = sanitized.call.phoneNumber;
    sanitized.call.phoneNumber = phone.slice(0, 4) + '*'.repeat(Math.max(0, phone.length - 7)) + phone.slice(-3);
  }
  
  if (sanitized.call?.analysis?.structuredData?.courriel) {
    const email = sanitized.call.analysis.structuredData.courriel;
    const [user, domain] = email.split('@');
    sanitized.call.analysis.structuredData.courriel = 
      user.slice(0, 2) + '*'.repeat(Math.max(0, user.length - 4)) + user.slice(-2) + '@' + domain;
  }
  
  if (sanitized.call?.analysis?.structuredData?.adresse) {
    // Keep only first word and postal code pattern for privacy
    const address = sanitized.call.analysis.structuredData.adresse;
    const words = address.split(' ');
    sanitized.call.analysis.structuredData.adresse = words[0] + ' [MASKED]';
  }
  
  return sanitized;
}

// Business validation functions
export function validateBusinessRules(payload: WebhookPayload): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check for required business data in call-ended events
  if (payload.type === 'call-ended' && payload.call?.analysis?.structuredData) {
    const data = payload.call.analysis.structuredData;
    
    if (!data.nom && !data.courriel) {
      violations.push("Customer identification (name or email) required for completed calls");
    }
    
    if (!data.description) {
      violations.push("Problem description required for service requests");
    }
    
    if (data.codePostal && !/^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ] ?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/.test(data.codePostal)) {
      violations.push("Invalid postal code format - must be valid Canadian postal code");
    }
  }
  
  // Validate tool calls for business logic compliance
  if (payload.type === 'function-call' || payload.type === 'tool-calls') {
    payload.toolCalls?.forEach((toolCall, index) => {
      const { name, arguments: args } = toolCall.function;
      
      if (name === 'sendSMSAlert') {
        const smsArgs = args as z.infer<typeof sendSMSAlertArgsSchema>;
        
        // Check for inappropriate SMS content
        const prohibitedWords = ['urgent', 'emergency', 'immediate', 'asap'];
        const hasProhibited = prohibitedWords.some(word => 
          smsArgs.message.toLowerCase().includes(word) && smsArgs.priority !== 'P1'
        );
        
        if (hasProhibited) {
          violations.push(`Tool call ${index}: SMS contains urgency language but priority is not P1`);
        }
        
        if (smsArgs.phoneNumbers.length > 5) {
          violations.push(`Tool call ${index}: Excessive SMS recipients (${smsArgs.phoneNumbers.length})`);
        }
      }
      
      if (name === 'calculateQuote') {
        const quoteArgs = args as z.infer<typeof calculateQuoteArgsSchema>;
        
        if (quoteArgs.estimatedValue && quoteArgs.estimatedValue > 50000) {
          violations.push(`Tool call ${index}: Quote value unusually high (${quoteArgs.estimatedValue})`);
        }
      }
    });
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

// Schema metadata for OpenAPI documentation
export const SCHEMA_METADATA = {
  version: '1.0.0',
  description: 'VAPI Webhook payload validation schemas for Drain Fortin system',
  supportedEvents: [
    'health-check',
    'call-started', 
    'call-ended',
    'tool-calls',
    'transcript',
    'function-call',
    'message'
  ],
  maxPayloadSize: '1MB',
  requiredHeaders: ['x-vapi-signature', 'content-type'],
  supportedFunctions: [
    'validateServiceRequest',
    'calculateQuote', 
    'classifyPriority',
    'evaluateScheduling',
    'sendSMSAlert'
  ]
} as const;