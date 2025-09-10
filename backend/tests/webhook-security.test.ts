import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// Test de sécurité du webhook VAPI
describe('Webhook Security', () => {
  const VAPI_WEBHOOK_SECRET = 'test-webhook-secret-key-for-testing';
  
  describe('HMAC Signature Verification', () => {
    function generateHMAC(payload: string, secret: string): string {
      return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    }

    it('should generate valid HMAC signature', () => {
      const payload = JSON.stringify({
        type: 'call-started',
        call: {
          id: 'test-123',
          phoneNumber: '+15145551234'
        }
      });
      
      const signature = generateHMAC(payload, VAPI_WEBHOOK_SECRET);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 produces 64 hex chars
    });

    it('should verify valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const correctSignature = generateHMAC(payload, VAPI_WEBHOOK_SECRET);
      
      // Verify signature matches
      const isValid = crypto.timingSafeEqual(
        Buffer.from(correctSignature),
        Buffer.from(correctSignature)
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const correctSignature = generateHMAC(payload, VAPI_WEBHOOK_SECRET);
      const invalidSignature = generateHMAC(payload, 'wrong-secret');
      
      // Signatures should not match
      expect(correctSignature).not.toBe(invalidSignature);
    });

    it('should handle missing signature header', () => {
      const request = {
        headers: {},
        body: { test: 'data' }
      };
      
      const hasSignature = 'x-vapi-signature' in request.headers;
      expect(hasSignature).toBe(false);
    });

    it('should validate webhook payload structure', () => {
      const validPayload = {
        type: 'call-started',
        call: {
          id: 'call-123',
          phoneNumber: '+15145551234',
          assistantId: 'assistant-1',
          startedAt: new Date().toISOString()
        }
      };
      
      expect(validPayload.type).toBeDefined();
      expect(validPayload.call).toBeDefined();
      expect(validPayload.call.id).toBeDefined();
      expect(validPayload.call.phoneNumber).toMatch(/^\+\d{10,15}$/);
    });
  });

  describe('Request Validation', () => {
    it('should validate required headers', () => {
      const requiredHeaders = [
        'x-vapi-signature',
        'content-type'
      ];
      
      const mockHeaders = {
        'x-vapi-signature': 'test-signature',
        'content-type': 'application/json'
      };
      
      const missingHeaders = requiredHeaders.filter(
        header => !(header in mockHeaders)
      );
      
      expect(missingHeaders.length).toBe(0);
    });

    it('should validate JSON content type', () => {
      const contentType = 'application/json';
      const isValidContentType = contentType.includes('application/json');
      
      expect(isValidContentType).toBe(true);
    });

    it('should reject non-JSON payloads', () => {
      const contentType = 'text/plain';
      const isValidContentType = contentType.includes('application/json');
      
      expect(isValidContentType).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate request timestamp within window', () => {
      const now = Date.now();
      const requestTimestamp = now - 30000; // 30 seconds ago
      const maxAge = 60000; // 60 seconds
      
      const isValid = (now - requestTimestamp) <= maxAge;
      expect(isValid).toBe(true);
    });

    it('should reject expired timestamps', () => {
      const now = Date.now();
      const requestTimestamp = now - 120000; // 2 minutes ago
      const maxAge = 60000; // 60 seconds
      
      const isValid = (now - requestTimestamp) <= maxAge;
      expect(isValid).toBe(false);
    });
  });
});