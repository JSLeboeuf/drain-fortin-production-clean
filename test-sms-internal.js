// SMS Testing Script - Secure Version
// This script tests SMS functionality without exposing secrets

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_FROM = process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || '+1xxxxxxxxxx';

// Test phone numbers (replace with real numbers)
const TEST_TEAM_NUMBERS = [
    process.env.TEST_PHONE_NUMBER || '+14502803222'
];

console.log('🧪 SMS Testing Script - Secure Version');
console.log('=====================================');

// Validate environment
function validateEnvironment() {
    console.log('🔍 Validating environment variables...');
    
    const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'];
    const missing = required.filter(var_name => !process.env[var_name]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(var_name => console.error(`   - ${var_name}`));
        console.error('\nPlease set these variables before running tests.');
        process.exit(1);
    }
    
    console.log('✅ Environment validation passed');
    return true;
}

// Test SMS sending function
async function sendTestSMS(to, priority = 'P4', urgency = 'TEST') {
    const urgencyEmoji = {
        'P1': '🚨',
        'P2': '⚠️', 
        'P3': '🔧',
        'P4': '📋',
        'TEST': '🧪'
    };
    
    const message = `${urgencyEmoji[priority]} ${urgency} - Drain Fortin CRM

CLIENT: Test Client
TÉL: +15145551234
ADRESSE: 123 Test Street, Montreal QC
PROBLÈME: Test message - SMS functionality verification
PRIORITÉ: ${priority}

This is a test message - please ignore.
System functioning correctly.`;

    console.log(`📤 Sending test SMS to ${to}...`);
    
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const body = new URLSearchParams({
            From: TWILIO_FROM,
            To: to,
            Body: message
        });
        
        const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`✅ SMS sent successfully to ${to}`);
        console.log(`   SID: ${result.sid}`);
        console.log(`   Status: ${result.status}`);
        
        return { success: true, sid: result.sid, to, message };
        
    } catch (error) {
        console.error(`❌ Failed to send SMS to ${to}:`, error.message);
        return { success: false, error: error.message, to };
    }
}

// Test different priority levels
async function runPriorityTests() {
    console.log('\n📊 Testing different priority levels...');
    
    const priorities = [
        { level: 'P1', description: 'URGENCE IMMÉDIATE' },
        { level: 'P2', description: 'PRIORITÉ MUNICIPALE' },
        { level: 'P3', description: 'SERVICE MAJEUR' },
        { level: 'P4', description: 'SERVICE STANDARD' }
    ];
    
    const results = [];
    
    for (const priority of priorities) {
        console.log(`\n🔄 Testing priority ${priority.level} (${priority.description})`);
        
        for (const phoneNumber of TEST_TEAM_NUMBERS) {
            const result = await sendTestSMS(phoneNumber, priority.level, priority.description);
            results.push(result);
            
            // Wait between sends to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return results;
}

// Generate test report
function generateReport(results) {
    console.log('\n📋 TEST REPORT');
    console.log('==============');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 Total tests: ${results.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
    
    if (failed.length > 0) {
        console.log('\n❌ Failed tests:');
        failed.forEach(result => {
            console.log(`   ${result.to}: ${result.error}`);
        });
    }
    
    if (successful.length > 0) {
        console.log('\n✅ Successful sends:');
        successful.forEach(result => {
            console.log(`   ${result.to}: ${result.sid}`);
        });
    }
    
    console.log('\n💡 Next steps:');
    if (failed.length > 0) {
        console.log('   • Check Twilio console for delivery status');
        console.log('   • Verify phone numbers are valid');
        console.log('   • Check account balance and permissions');
    }
    console.log('   • Test webhook integration with VAPI');
    console.log('   • Verify SMS routing in production');
}

// Main execution
async function main() {
    try {
        console.log('Starting SMS tests...\n');
        
        // Validate environment
        validateEnvironment();
        
        // Show configuration (without secrets)
        console.log('🔧 Configuration:');
        console.log(`   Account SID: ${TWILIO_ACCOUNT_SID.substring(0, 6)}...`);
        console.log(`   From number: ${TWILIO_FROM}`);
        console.log(`   Test recipients: ${TEST_TEAM_NUMBERS.length}`);
        console.log('');
        
        // Run tests
        const results = await runPriorityTests();
        
        // Generate report
        generateReport(results);
        
        console.log('\n🎉 SMS testing completed!');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { sendTestSMS, runPriorityTests, validateEnvironment };