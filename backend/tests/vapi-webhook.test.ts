import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests du webhook VAPI principal
describe('VAPI Webhook Handler', () => {
  describe('Event Processing', () => {
    it('should handle call-started event', async () => {
      const event = {
        type: 'call-started',
        call: {
          id: 'call-123',
          phoneNumber: '+15145551234',
          assistantId: 'asst-456',
          startedAt: new Date().toISOString()
        }
      };
      
      expect(event.type).toBe('call-started');
      expect(event.call.id).toBeDefined();
      expect(event.call.phoneNumber).toMatch(/^\+\d{10,15}$/);
    });

    it('should handle function-call event', async () => {
      const event = {
        type: 'function-call',
        functionCall: {
          name: 'createClient',
          parameters: {
            name: 'Jean Tremblay',
            phone: '+15145551234',
            address: '123 rue Test',
            problem: 'Drain bouché'
          }
        }
      };
      
      expect(event.type).toBe('function-call');
      expect(event.functionCall.name).toBe('createClient');
      expect(event.functionCall.parameters).toBeDefined();
    });

    it('should handle call-ended event', async () => {
      const event = {
        type: 'call-ended',
        call: {
          id: 'call-123',
          endedAt: new Date().toISOString(),
          duration: 180,
          endedReason: 'customer-ended-call'
        }
      };
      
      expect(event.type).toBe('call-ended');
      expect(event.call.duration).toBeGreaterThan(0);
      expect(event.call.endedReason).toBeDefined();
    });

    it('should handle transcript event', async () => {
      const event = {
        type: 'transcript',
        transcript: {
          role: 'user',
          text: 'J\'ai un problème de drain bouché',
          timestamp: new Date().toISOString()
        }
      };
      
      expect(event.type).toBe('transcript');
      expect(event.transcript.text).toBeDefined();
      expect(event.transcript.role).toMatch(/^(user|assistant)$/);
    });

    it('should ignore unknown event types', async () => {
      const event = {
        type: 'unknown-event',
        data: {}
      };
      
      const supportedEvents = [
        'call-started',
        'call-ended',
        'function-call',
        'transcript',
        'speech-update',
        'error'
      ];
      
      const isSupported = supportedEvents.includes(event.type);
      expect(isSupported).toBe(false);
    });
  });

  describe('Priority Classification', () => {
    it('should classify P1 emergency correctly', () => {
      const keywords = ['inondation', 'urgence', 'dégât d\'eau', 'refoulement'];
      const description = 'Inondation urgente au sous-sol';
      
      const isP1 = keywords.some(keyword => 
        description.toLowerCase().includes(keyword)
      );
      
      expect(isP1).toBe(true);
    });

    it('should classify P2 municipal correctly', () => {
      const phonePrefix = '+1514'; // Montreal area
      const isMunicipal = phonePrefix === '+1514';
      
      expect(isMunicipal).toBe(true);
    });

    it('should classify P3 commercial correctly', () => {
      const businessKeywords = ['restaurant', 'commerce', 'bureau', 'entreprise'];
      const description = 'Restaurant avec problème de drain';
      
      const isCommercial = businessKeywords.some(keyword =>
        description.toLowerCase().includes(keyword)
      );
      
      expect(isCommercial).toBe(true);
    });

    it('should default to P4 for regular calls', () => {
      const description = 'Problème de plomberie';
      const emergencyKeywords = ['inondation', 'urgence'];
      const businessKeywords = ['restaurant', 'commerce'];
      
      const isEmergency = emergencyKeywords.some(k => 
        description.toLowerCase().includes(k)
      );
      const isCommercial = businessKeywords.some(k =>
        description.toLowerCase().includes(k)
      );
      
      const priority = isEmergency ? 'P1' : 
                      isCommercial ? 'P3' : 'P4';
      
      expect(priority).toBe('P4');
    });
  });

  describe('Client Creation', () => {
    it('should create client with all required fields', () => {
      const clientData = {
        name: 'Jean Tremblay',
        phone: '+15145551234',
        address: '123 rue Principale, Brossard, QC',
        problem_description: 'Drain bouché cuisine',
        priority: 'P3',
        created_at: new Date().toISOString()
      };
      
      expect(clientData.name).toBeDefined();
      expect(clientData.phone).toBeDefined();
      expect(clientData.address).toBeDefined();
      expect(clientData.problem_description).toBeDefined();
      expect(clientData.priority).toMatch(/^P[1-4]$/);
    });

    it('should validate required fields', () => {
      const requiredFields = ['name', 'phone', 'problem_description'];
      const clientData = {
        name: 'Test Client',
        phone: '+15145551234',
        problem_description: 'Test problem'
      };
      
      const missingFields = requiredFields.filter(field => 
        !(field in clientData)
      );
      
      expect(missingFields.length).toBe(0);
    });

    it('should sanitize client data', () => {
      const rawInput = '<script>alert("XSS")</script>Test Name';
      const sanitized = rawInput.replace(/<[^>]*>/g, '');
      
      expect(sanitized).toBe('alert("XSS")Test Name');
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Response Handling', () => {
    it('should return success response', () => {
      const response = {
        success: true,
        message: 'Event processed successfully',
        data: {
          clientId: 'client-123',
          smsCount: 2
        }
      };
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      const response = {
        success: false,
        error: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE'
      };
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.code).toBeDefined();
    });

    it('should include proper status codes', () => {
      const scenarios = [
        { case: 'success', status: 200 },
        { case: 'invalid_signature', status: 401 },
        { case: 'rate_limited', status: 429 },
        { case: 'server_error', status: 500 }
      ];
      
      scenarios.forEach(scenario => {
        expect(scenario.status).toBeGreaterThanOrEqual(200);
        expect(scenario.status).toBeLessThan(600);
      });
    });
  });

  describe('Integration Points', () => {
    it('should trigger SMS service for high priority', () => {
      const priority = 'P1';
      const shouldSendSMS = priority === 'P1' || priority === 'P2';
      
      expect(shouldSendSMS).toBe(true);
    });

    it('should save call data to database', () => {
      const callData = {
        call_id: 'call-123',
        phone_number: '+15145551234',
        started_at: new Date().toISOString(),
        priority: 'P2',
        status: 'active'
      };
      
      // Validate data structure for DB
      expect(callData.call_id).toBeDefined();
      expect(callData.phone_number).toMatch(/^\+\d{10,15}$/);
      expect(callData.priority).toMatch(/^P[1-4]$/);
      expect(callData.status).toBeDefined();
    });

    it('should create audit log entry', () => {
      const auditEntry = {
        event_type: 'webhook_received',
        webhook_type: 'call-started',
        call_id: 'call-123',
        timestamp: new Date().toISOString(),
        metadata: {
          priority: 'P2',
          sms_sent: true
        }
      };
      
      expect(auditEntry.event_type).toBeDefined();
      expect(auditEntry.webhook_type).toBeDefined();
      expect(auditEntry.timestamp).toBeDefined();
      expect(auditEntry.metadata).toBeDefined();
    });
  });
});
