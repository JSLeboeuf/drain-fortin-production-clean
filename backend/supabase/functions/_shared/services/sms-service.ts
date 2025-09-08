// SMS Service with retry mechanisms, circuit breaker, and structured logging
import { DrainFortinError, ExternalServiceError } from '../utils/errors.ts';
import { withRetry } from '../utils/retry.ts';
import { logger } from '../utils/logging.ts';

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SMSRequest {
  to: string[];
  message: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  callId?: string;
}

export interface SMSResult {
  sent: boolean;
  sids: string[];
  errors?: Array<{
    phone: string;
    error: string;
    statusCode?: number;
  }>;
  priority: string;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private timeoutMs = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new ExternalServiceError('twilio', 'Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    logger.debug('Circuit breaker reset to CLOSED state');
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }
}

export class SMSService {
  private circuitBreaker = new CircuitBreaker();
  
  constructor(private config: SMSConfig) {
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      throw new DrainFortinError('SMS_CONFIG_MISSING', 'SMS configuration incomplete');
    }
  }

  async sendSMSAlert(request: SMSRequest): Promise<SMSResult> {
    logger.info('SMS alert request', { 
      priority: request.priority, 
      recipients: request.to.length,
      callId: request.callId 
    });

    if (!request.to || request.to.length === 0) {
      throw new DrainFortinError('SMS_NO_RECIPIENTS', 'No phone numbers provided');
    }

    const results: SMSResult = {
      sent: false,
      sids: [],
      errors: [],
      priority: request.priority
    };

    // Send SMS to each recipient with retry logic
    for (const phoneNumber of request.to) {
      try {
        const sid = await this.sendSingleSMS(phoneNumber, request.message, request.callId);
        results.sids.push(sid);
        results.sent = true;
        
        logger.info('SMS sent successfully', { 
          phone: this.maskPhoneNumber(phoneNumber), 
          sid,
          priority: request.priority 
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors!.push({
          phone: this.maskPhoneNumber(phoneNumber),
          error: errorMessage,
          statusCode: error instanceof ExternalServiceError ? 502 : 500
        });
        
        logger.error('SMS sending failed', {
          phone: this.maskPhoneNumber(phoneNumber),
          error: errorMessage,
          priority: request.priority
        });
      }
    }

    // Log final result
    logger.info('SMS alert completed', {
      sent: results.sent,
      successCount: results.sids.length,
      errorCount: results.errors?.length || 0,
      priority: request.priority
    });

    return results;
  }

  private async sendSingleSMS(to: string, message: string, callId?: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
        
        const body = new URLSearchParams();
        body.set('From', this.config.fromNumber);
        body.set('To', to);
        body.set('Body', message);
        
        // Add callback URL for delivery tracking if needed
        if (callId) {
          // body.set('StatusCallback', `${WEBHOOK_URL}/sms-status/${callId}`);
        }

        const auth = 'Basic ' + btoa(`${this.config.accountSid}:${this.config.authToken}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Authorization': auth, 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'DrainFortin/1.0'
          },
          body
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          throw new ExternalServiceError(
            'twilio',
            `HTTP ${response.status}: ${errorDetails.message || 'SMS send failed'}`,
            { status: response.status, details: errorDetails }
          );
        }

        const result = await response.json();
        
        if (!result.sid) {
          throw new ExternalServiceError(
            'twilio', 
            'No message SID returned',
            result
          );
        }

        return result.sid;
      }, 3, 1000); // 3 retries with 1 second base delay
    });
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + '*'.repeat(phone.length - 6) + phone.slice(-3);
  }

  // Get SMS delivery status
  async getDeliveryStatus(sid: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages/${sid}.json`;
      const auth = 'Basic ' + btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': auth }
      });

      if (!response.ok) {
        throw new ExternalServiceError('twilio', `Failed to get delivery status: ${response.status}`);
      }

      return response.json();
    });
  }

  // Health check for SMS service
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Simple check by validating account (without sending SMS)
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}.json`;
      const auth = 'Basic ' + btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': auth }
      });

      if (response.ok) {
        return { healthy: true, message: 'SMS service operational' };
      } else {
        return { healthy: false, message: `SMS service error: ${response.status}` };
      }
    } catch (error) {
      return { 
        healthy: false, 
        message: `SMS service unreachable: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}