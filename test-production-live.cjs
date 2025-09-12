/**
 * LIVE PRODUCTION TEST SUITE
 * Tests the actual deployed Drain Fortin system
 * Date: 2025-09-12
 */

const https = require('https');
const crypto = require('crypto');

const PRODUCTION_URL = 'phiduqxcufdmgjvdipyu.supabase.co';
const WEBHOOK_PATH = '/functions/v1/vapi-webhook';
const WEBHOOK_SECRET = 'drain-fortin-secret-2024';

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTPS requests
function makeRequest(options, payload = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Generate HMAC signature
function generateHMAC(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Test runner
async function runTest(name, testFn) {
  console.log(`\nRunning: ${name}...`);
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`✅ PASS: ${name}`);
      results.passed++;
    } else {
      console.log(`❌ FAIL: ${name} - ${result.error}`);
      results.failed++;
    }
    results.tests.push({ name, ...result });
    return result;
  } catch (error) {
    console.log(`❌ ERROR: ${name} - ${error.message}`);
    results.failed++;
    results.tests.push({ name, success: false, error: error.message });
    return { success: false, error: error.message };
  }
}

// TEST SUITE
async function runProductionTests() {
  console.log('🧪 DRAIN FORTIN PRODUCTION TEST SUITE');
  console.log('=====================================');
  console.log(`Target: https://${PRODUCTION_URL}${WEBHOOK_PATH}`);
  console.log('');

  // Test 1: Missing Signature
  await runTest('Security: Missing HMAC Signature', async () => {
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ type: 'test' }));

    if (response.statusCode === 401) {
      const body = JSON.parse(response.body);
      if (body.error?.code === 'MISSING_SIGNATURE') {
        return { success: true, statusCode: 401, code: 'MISSING_SIGNATURE' };
      }
    }
    return { success: false, error: `Expected 401, got ${response.statusCode}` };
  });

  // Test 2: Invalid Signature
  await runTest('Security: Invalid HMAC Signature', async () => {
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': 'invalid123'
      }
    }, JSON.stringify({ type: 'test' }));

    if (response.statusCode === 401) {
      const body = JSON.parse(response.body);
      if (body.error?.code === 'INVALID_SIGNATURE') {
        return { success: true, statusCode: 401, code: 'INVALID_SIGNATURE' };
      }
    }
    return { success: false, error: `Expected 401 INVALID_SIGNATURE, got ${response.statusCode}` };
  });

  // Test 3: Valid Health Check
  await runTest('Business: Health Check with Valid Signature', async () => {
    const payload = JSON.stringify({ type: 'health-check' });
    const signature = generateHMAC(payload, WEBHOOK_SECRET);
    
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': signature
      }
    }, payload);

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      if (body.status === 'healthy' || body.message) {
        return { success: true, statusCode: 200, response: body };
      }
    }
    return { success: false, error: `Expected 200 with health response, got ${response.statusCode}` };
  });

  // Test 4: Large Payload
  await runTest('Security: Payload Size Limit', async () => {
    const largePayload = JSON.stringify({ 
      data: 'x'.repeat(2000000) // 2MB payload
    });
    
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': largePayload.length,
        'x-vapi-signature': 'test'
      }
    }, largePayload);

    if (response.statusCode === 413) {
      return { success: true, statusCode: 413, message: 'Payload limit enforced' };
    }
    return { success: false, error: `Expected 413, got ${response.statusCode}` };
  });

  // Test 5: Invalid JSON
  await runTest('Validation: Invalid JSON Handling', async () => {
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': 'test'
      }
    }, '{invalid json}');

    if (response.statusCode === 400 || response.statusCode === 401) {
      return { success: true, statusCode: response.statusCode };
    }
    return { success: false, error: `Expected 400/401, got ${response.statusCode}` };
  });

  // Test 6: CORS Preflight
  await runTest('CORS: OPTIONS Preflight', async () => {
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
      }
    });

    if (response.statusCode === 200 || response.statusCode === 204) {
      const corsHeaders = response.headers['access-control-allow-origin'];
      if (corsHeaders) {
        return { success: true, statusCode: response.statusCode, cors: corsHeaders };
      }
    }
    return { success: false, error: `CORS not properly configured` };
  });

  // Test 7: Tool Call Processing
  await runTest('Business: Tool Call Processing', async () => {
    const payload = JSON.stringify({
      type: 'tool-calls',
      toolCalls: [{
        id: 'test-123',
        function: {
          name: 'getQuote',
          arguments: { service: 'debouchage' }
        }
      }]
    });
    const signature = generateHMAC(payload, WEBHOOK_SECRET);
    
    const response = await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': signature
      }
    }, payload);

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      if (body.results || body.success) {
        return { success: true, statusCode: 200, toolProcessed: true };
      }
    }
    return { success: false, error: `Tool call processing failed` };
  });

  // Test 8: Response Time Performance
  await runTest('Performance: Response Time < 200ms', async () => {
    const startTime = Date.now();
    const payload = JSON.stringify({ type: 'health-check' });
    const signature = generateHMAC(payload, WEBHOOK_SECRET);
    
    await makeRequest({
      hostname: PRODUCTION_URL,
      path: WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': signature
      }
    }, payload);

    const responseTime = Date.now() - startTime;
    if (responseTime < 200) {
      return { success: true, responseTime: `${responseTime}ms` };
    }
    return { success: false, error: `Response time ${responseTime}ms exceeds 200ms limit` };
  });

  // Generate Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is production ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Review the results above.');
  }

  // Write detailed report
  const fs = require('fs');
  const reportPath = './test-results-production.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);

  return results;
}

// Execute tests
if (require.main === module) {
  runProductionTests()
    .then(() => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runProductionTests };