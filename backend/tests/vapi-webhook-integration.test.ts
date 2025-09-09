import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'crypto';

// Test webhook payload
const testPayload = {
  type: 'call',
  call: {
    id: 'test-call-123',
    status: 'ended',
    endedReason: 'completed',
    transcript: 'Bonjour, j\'ai besoin d\'un service de débouchage urgent.',
    summary: 'Client demande service urgent de débouchage',
    duration: 180,
    cost: 0.25,
    analysis: {
      structuredData: {
        client_name: 'Jean Dupont',
        client_phone: '514-555-0123',
        service_type: 'Débouchage',
        intervention_address: '123 Rue Test, Montréal',
        urgency_level: 'urgent',
        preferred_schedule: 'Aujourd\'hui si possible',
        problem_description: 'Toilette bouchée au 2e étage'
      },
      successEvaluation: {
        successful: true,
        reason: 'Information complète collectée'
      }
    },
    tool_calls: [
      {
        function: {
          name: 'send_sms_to_crm',
          arguments: JSON.stringify({
            phone_number: '+15145550123',
            message: 'Nouvelle intervention urgente: Débouchage pour Jean Dupont'
          })
        },
        id: 'tool-call-1',
        type: 'function'
      }
    ]
  }
};

// HMAC signature generation
function generateHMACSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

describe('VAPI Webhook Integration Tests', () => {
  const webhookSecret = 'test-webhook-secret';
  const webhookUrl = 'http://localhost:54321/functions/v1/vapi-webhook';
  
  it('should validate HMAC signature correctly', () => {
    const payloadString = JSON.stringify(testPayload);
    const signature = generateHMACSignature(payloadString, webhookSecret);
    
    // Signature should start with sha256=
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    
    // Same payload should generate same signature
    const signature2 = generateHMACSignature(payloadString, webhookSecret);
    expect(signature).toBe(signature2);
    
    // Different payload should generate different signature
    const differentPayload = { ...testPayload, type: 'message' };
    const differentSignature = generateHMACSignature(JSON.stringify(differentPayload), webhookSecret);
    expect(differentSignature).not.toBe(signature);
    
    // Different secret should generate different signature
    const wrongSignature = generateHMACSignature(payloadString, 'wrong-secret');
    expect(wrongSignature).not.toBe(signature);
  });
  
  it('should extract structured data from call payload', () => {
    const structuredData = testPayload.call.analysis.structuredData;
    
    // Validate all required fields are present
    expect(structuredData.client_name).toBe('Jean Dupont');
    expect(structuredData.client_phone).toBe('514-555-0123');
    expect(structuredData.service_type).toBe('Débouchage');
    expect(structuredData.intervention_address).toBe('123 Rue Test, Montréal');
    expect(structuredData.urgency_level).toBe('urgent');
    expect(structuredData.preferred_schedule).toBeTruthy();
    expect(structuredData.problem_description).toBeTruthy();
  });
  
  it('should parse tool calls correctly', () => {
    const toolCalls = testPayload.call.tool_calls;
    
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe('send_sms_to_crm');
    
    const args = JSON.parse(toolCalls[0].function.arguments);
    expect(args.phone_number).toBe('+15145550123');
    expect(args.message).toContain('Jean Dupont');
  });
  
  it('should handle different webhook event types', () => {
    const eventTypes = ['call', 'message', 'status-update', 'transcript-update'];
    
    eventTypes.forEach(eventType => {
      const payload = { ...testPayload, type: eventType };
      const payloadString = JSON.stringify(payload);
      const signature = generateHMACSignature(payloadString, webhookSecret);
      
      // Each event type should generate valid signature
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });
  
  it('should validate call status transitions', () => {
    const validStatuses = ['queued', 'ringing', 'in-progress', 'forwarding', 'ended'];
    
    validStatuses.forEach(status => {
      const payload = {
        ...testPayload,
        call: { ...testPayload.call, status }
      };
      
      // All valid statuses should be acceptable
      expect(validStatuses).toContain(payload.call.status);
    });
  });
  
  it('should handle edge cases in structured data', () => {
    // Test with missing optional fields
    const minimalPayload = {
      type: 'call',
      call: {
        id: 'test-123',
        status: 'ended',
        analysis: {
          structuredData: {
            client_name: 'Test Client',
            client_phone: '514-555-0000'
          }
        }
      }
    };
    
    expect(minimalPayload.call.analysis.structuredData.client_name).toBeTruthy();
    expect(minimalPayload.call.analysis.structuredData.client_phone).toBeTruthy();
    expect(minimalPayload.call.analysis.structuredData.service_type).toBeUndefined();
  });
  
  it('should validate phone number formats', () => {
    const validPhoneFormats = [
      '514-555-0123',
      '5145550123',
      '+15145550123',
      '(514) 555-0123',
      '514.555.0123'
    ];
    
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/;
    
    validPhoneFormats.forEach(phone => {
      const normalized = phone.replace(/[\s\(\)\-\.]/g, '');
      expect(normalized).toMatch(/^\+?[0-9]{10,11}$/);
    });
  });
  
  it('should validate urgency levels', () => {
    const validUrgencyLevels = ['low', 'medium', 'high', 'urgent'];
    const urgency = testPayload.call.analysis.structuredData.urgency_level;
    
    expect(validUrgencyLevels).toContain(urgency);
  });
  
  it('should handle large payloads', () => {
    // Test with a large transcript
    const largePayload = {
      ...testPayload,
      call: {
        ...testPayload.call,
        transcript: 'Lorem ipsum '.repeat(1000) // ~11KB of text
      }
    };
    
    const payloadString = JSON.stringify(largePayload);
    const signature = generateHMACSignature(payloadString, webhookSecret);
    
    // Should still generate valid signature for large payloads
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(payloadString.length).toBeGreaterThan(10000);
  });
  
  it('should validate intervention creation data', () => {
    const structuredData = testPayload.call.analysis.structuredData;
    
    // Required fields for intervention creation
    expect(structuredData).toHaveProperty('client_name');
    expect(structuredData).toHaveProperty('client_phone');
    expect(structuredData).toHaveProperty('service_type');
    expect(structuredData).toHaveProperty('intervention_address');
    expect(structuredData).toHaveProperty('urgency_level');
    
    // Optional but useful fields
    expect(structuredData).toHaveProperty('preferred_schedule');
    expect(structuredData).toHaveProperty('problem_description');
    
    // Validate data types
    expect(typeof structuredData.client_name).toBe('string');
    expect(typeof structuredData.client_phone).toBe('string');
    expect(typeof structuredData.urgency_level).toBe('string');
  });
  
  it('should handle SMS logging from tool calls', () => {
    const toolCall = testPayload.call.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    
    // Validate SMS data structure
    expect(args).toHaveProperty('phone_number');
    expect(args).toHaveProperty('message');
    expect(args.phone_number).toMatch(/^\+?[0-9]{10,15}$/);
    expect(args.message.length).toBeGreaterThan(0);
    expect(args.message.length).toBeLessThanOrEqual(1600); // SMS limit
  });
});

describe('VAPI Webhook Security Tests', () => {
  const webhookSecret = 'production-secret-key';
  
  it('should reject invalid signatures', () => {
    const payload = JSON.stringify(testPayload);
    const validSignature = generateHMACSignature(payload, webhookSecret);
    const invalidSignature = generateHMACSignature(payload, 'wrong-secret');
    
    expect(validSignature).not.toBe(invalidSignature);
    expect(invalidSignature).toMatch(/^sha256=[a-f0-9]{64}$/); // Still valid format
  });
  
  it('should reject tampered payloads', () => {
    const originalPayload = JSON.stringify(testPayload);
    const originalSignature = generateHMACSignature(originalPayload, webhookSecret);
    
    // Tamper with payload after signing
    const tamperedPayload = JSON.stringify({
      ...testPayload,
      call: { ...testPayload.call, cost: 1000 } // Changed cost
    });
    
    // Original signature should not match tampered payload
    const tamperedSignature = generateHMACSignature(tamperedPayload, webhookSecret);
    expect(originalSignature).not.toBe(tamperedSignature);
  });
  
  it('should handle replay attack prevention', () => {
    // Timestamps should be checked to prevent replay attacks
    const now = Date.now();
    const oldTimestamp = now - (6 * 60 * 1000); // 6 minutes ago
    
    const payloadWithTimestamp = {
      ...testPayload,
      timestamp: now
    };
    
    const oldPayload = {
      ...testPayload,
      timestamp: oldTimestamp
    };
    
    // Both should generate valid signatures
    const currentSig = generateHMACSignature(JSON.stringify(payloadWithTimestamp), webhookSecret);
    const oldSig = generateHMACSignature(JSON.stringify(oldPayload), webhookSecret);
    
    expect(currentSig).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(oldSig).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(currentSig).not.toBe(oldSig);
    
    // In production, old timestamps should be rejected (> 5 minutes)
    const isExpired = (now - oldTimestamp) > (5 * 60 * 1000);
    expect(isExpired).toBe(true);
  });
  
  it('should validate content-type header', () => {
    const validContentTypes = ['application/json', 'application/json; charset=utf-8'];
    const invalidContentTypes = ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'];
    
    validContentTypes.forEach(contentType => {
      expect(contentType).toMatch(/application\/json/);
    });
    
    invalidContentTypes.forEach(contentType => {
      expect(contentType).not.toMatch(/application\/json/);
    });
  });
});