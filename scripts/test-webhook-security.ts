#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * VAPI Webhook Security Test Suite
 * Tests all security controls implemented in the webhook
 * 
 * Usage: deno run --allow-net --allow-env scripts/test-webhook-security.ts
 */

import { createHmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  duration?: number;
}

interface TestConfig {
  webhookUrl: string;
  webhookSecret: string;
}

class WebhookSecurityTester {
  private config: TestConfig;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  async runAllTests(): Promise<void> {
    console.log('🔒 Starting VAPI Webhook Security Test Suite\n');
    console.log(`Target: ${this.config.webhookUrl}\n`);

    // Test categories
    await this.testHMACSecurity();
    await this.testInputValidation();
    await this.testRateLimiting();
    await this.testPayloadSizeLimits();
    await this.testErrorHandling();
    await this.testBusinessRules();

    this.printResults();
  }

  private async testHMACSecurity(): Promise<void> {
    console.log('🔐 Testing HMAC Security...');

    // Test 1: Valid HMAC signature
    await this.test(
      'HMAC - Valid Signature',
      async () => {
        const payload = JSON.stringify({ 
          type: 'health-check', 
          timestamp: new Date().toISOString() 
        });
        const signature = await this.generateHmacSignature(payload);
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: payload
        });

        return response.status === 200;
      }
    );

    // Test 2: Invalid HMAC signature
    await this.test(
      'HMAC - Invalid Signature Rejection',
      async () => {
        const payload = JSON.stringify({ 
          type: 'health-check', 
          timestamp: new Date().toISOString() 
        });
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': 'hmac-sha256=invalid-signature-12345'
          },
          body: payload
        });

        return response.status === 401;
      }
    );

    // Test 3: Missing HMAC signature
    await this.test(
      'HMAC - Missing Signature Rejection',
      async () => {
        const payload = JSON.stringify({ 
          type: 'health-check', 
          timestamp: new Date().toISOString() 
        });
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });

        return response.status === 401;
      }
    );
  }

  private async testInputValidation(): Promise<void> {
    console.log('📝 Testing Input Validation...');

    // Test 1: Invalid JSON
    await this.test(
      'Input - Invalid JSON Rejection',
      async () => {
        const signature = await this.generateHmacSignature('invalid-json');
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: 'invalid-json'
        });

        return response.status === 400;
      }
    );

    // Test 2: Invalid schema
    await this.test(
      'Input - Schema Validation',
      async () => {
        const payload = JSON.stringify({
          type: 'call-started',
          timestamp: 'invalid-timestamp',
          call: {
            id: 'not-a-uuid',
            assistantId: 'also-not-a-uuid'
          }
        });
        const signature = await this.generateHmacSignature(payload);
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: payload
        });

        return response.status === 400;
      }
    );

    // Test 3: Valid payload structure
    await this.test(
      'Input - Valid Payload Acceptance',
      async () => {
        const payload = JSON.stringify({
          type: 'call-started',
          timestamp: new Date().toISOString(),
          call: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            assistantId: '550e8400-e29b-41d4-a716-446655440001',
            phoneNumber: '+15551234567'
          }
        });
        const signature = await this.generateHmacSignature(payload);
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: payload
        });

        return response.status === 200;
      }
    );
  }

  private async testRateLimiting(): Promise<void> {
    console.log('⏱️ Testing Rate Limiting...');

    // Test: Rate limit enforcement
    await this.test(
      'Rate Limiting - Enforcement',
      async () => {
        const payload = JSON.stringify({ 
          type: 'health-check', 
          timestamp: new Date().toISOString() 
        });
        const signature = await this.generateHmacSignature(payload);

        // Send requests rapidly to trigger rate limiting
        const promises = [];
        for (let i = 0; i < 110; i++) { // Exceed the 100 req/min limit
          promises.push(
            fetch(this.config.webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-vapi-signature': `hmac-sha256=${signature}`
              },
              body: payload
            })
          );
        }

        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r.status === 429);
        
        return rateLimited;
      }
    );
  }

  private async testPayloadSizeLimits(): Promise<void> {
    console.log('📦 Testing Payload Size Limits...');

    // Test: Large payload rejection
    await this.test(
      'Payload Size - Large Payload Rejection',
      async () => {
        // Create a payload larger than 1MB
        const largeData = 'x'.repeat(1024 * 1024 + 1000);
        const payload = JSON.stringify({
          type: 'call-started',
          timestamp: new Date().toISOString(),
          call: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            assistantId: '550e8400-e29b-41d4-a716-446655440001',
            analysis: { largeField: largeData }
          }
        });
        const signature = await this.generateHmacSignature(payload);
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: payload
        });

        return response.status === 400;
      }
    );
  }

  private async testErrorHandling(): Promise<void> {
    console.log('🚨 Testing Error Handling...');

    // Test: Proper error responses
    await this.test(
      'Error Handling - Structured Error Response',
      async () => {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid'
        });

        if (response.status !== 401) return false;

        const errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        
        return errorJson.error && 
               errorJson.error.code && 
               errorJson.error.message &&
               !errorJson.error.stack; // No stack trace in production
      }
    );
  }

  private async testBusinessRules(): Promise<void> {
    console.log('💼 Testing Business Rules...');

    // Test: Function call with business validation
    await this.test(
      'Business Rules - Service Validation',
      async () => {
        const payload = JSON.stringify({
          type: 'function-call',
          timestamp: new Date().toISOString(),
          toolCalls: [{
            toolCallId: '550e8400-e29b-41d4-a716-446655440000',
            function: {
              name: 'validateServiceRequest',
              arguments: { service: 'piscine cleaning' } // Should be refused
            }
          }]
        });
        const signature = await this.generateHmacSignature(payload);
        
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-signature': `hmac-sha256=${signature}`
          },
          body: payload
        });

        if (response.status !== 200) return false;

        const result = await response.json();
        return result.results?.[0]?.result?.accepted === false;
      }
    );
  }

  private async test(name: string, testFn: () => Promise<boolean>): Promise<void> {
    const startTime = performance.now();
    
    try {
      const passed = await testFn();
      const duration = performance.now() - startTime;
      
      this.results.push({
        name,
        status: passed ? 'PASS' : 'FAIL',
        details: passed ? 'Test passed' : 'Test failed',
        duration: Math.round(duration)
      });
      
      console.log(`  ${passed ? '✅' : '❌'} ${name} (${Math.round(duration)}ms)`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.results.push({
        name,
        status: 'FAIL',
        details: error instanceof Error ? error.message : String(error),
        duration: Math.round(duration)
      });
      
      console.log(`  ❌ ${name} (${Math.round(duration)}ms) - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateHmacSignature(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.webhookSecret);
    const payloadData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, payloadData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`\n📊 Summary: ${passed}/${total} tests passed`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  • ${r.name}: ${r.details}`);
        });
    }
    
    if (passed === total) {
      console.log('\n🎉 All security tests passed! Webhook is secure.');
    } else {
      console.log(`\n⚠️ ${failed} security test(s) failed. Review and fix before production.`);
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(r => {
      const statusIcon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${statusIcon} ${r.name} (${r.duration}ms)`);
      if (r.status === 'FAIL') {
        console.log(`     ${r.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
async function main() {
  const config: TestConfig = {
    webhookUrl: Deno.env.get('WEBHOOK_URL') || 'http://localhost:54321/functions/v1/vapi-webhook',
    webhookSecret: Deno.env.get('VAPI_WEBHOOK_SECRET') || 'test-secret'
  };

  if (!config.webhookSecret || config.webhookSecret === 'test-secret') {
    console.log('⚠️ Warning: Using default test secret. Set VAPI_WEBHOOK_SECRET for production testing.');
  }

  const tester = new WebhookSecurityTester(config);
  await tester.runAllTests();
}

if (import.meta.main) {
  await main();
}