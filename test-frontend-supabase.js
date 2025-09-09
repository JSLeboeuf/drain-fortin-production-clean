/**
 * Test Frontend-Supabase Direct Connection
 * Vérifie que le frontend peut accéder directement à Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration depuis .env
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function testFrontendSupabase() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   TEST FRONTEND-SUPABASE CONNECTION           ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const tests = {
    frontend: false,
    supabase_connection: false,
    constraints_table: false,
    realtime: false,
    edge_functions: false
  };

  // 1. Test Frontend Access
  console.log(`${colors.cyan}🌐 TEST FRONTEND ACCESS${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const frontendUrl = 'http://localhost:5173';
    const response = await fetch(frontendUrl);
    
    if (response.ok) {
      console.log(`${colors.green}✅ Frontend accessible at ${frontendUrl}${colors.reset}`);
      tests.frontend = true;
      
      // Check if it's the right app
      const html = await response.text();
      if (html.includes('Drain Fortin') || html.includes('Paul')) {
        console.log(`${colors.green}✅ Correct application loaded${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ Frontend not accessible: ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Frontend error: ${error.message}${colors.reset}`);
  }

  // 2. Test Supabase Direct Connection
  console.log(`\n${colors.cyan}🗄️ TEST SUPABASE DIRECT CONNECTION${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    // Test authentication endpoint
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (authResponse.ok) {
      console.log(`${colors.green}✅ Supabase Auth service healthy${colors.reset}`);
      tests.supabase_connection = true;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Auth health check failed: ${error.message}${colors.reset}`);
  }

  // 3. Test Constraints Table (we know this one exists)
  console.log(`\n${colors.cyan}📊 TEST CONSTRAINTS TABLE${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const { data, error, count } = await supabase
      .from('constraints')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log(`${colors.red}❌ Constraints table error: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Constraints table accessible${colors.reset}`);
      console.log(`   Found ${count || data?.length || 0} constraints`);
      tests.constraints_table = true;
      
      if (data && data.length > 0) {
        console.log(`   Sample constraint: ${data[0].name || data[0].constraint_name || 'N/A'}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Constraints query error: ${error.message}${colors.reset}`);
  }

  // 4. Test Realtime Connection
  console.log(`\n${colors.cyan}🔄 TEST REALTIME CONNECTION${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const channel = supabase.channel('test-channel');
    
    // Subscribe to presence
    channel
      .on('presence', { event: 'sync' }, () => {
        console.log(`${colors.green}✅ Realtime presence synced${colors.reset}`);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`${colors.green}✅ Realtime channel subscribed${colors.reset}`);
          tests.realtime = true;
        }
      });
    
    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    await supabase.removeChannel(channel);
  } catch (error) {
    console.log(`${colors.red}❌ Realtime error: ${error.message}${colors.reset}`);
  }

  // 5. Test Edge Functions
  console.log(`\n${colors.cyan}⚡ TEST EDGE FUNCTIONS${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`;
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   Response Status: ${response.status}`);
    
    if (response.status === 401 || response.status === 400 || response.status === 405) {
      console.log(`${colors.green}✅ Edge function exists (secured)${colors.reset}`);
      tests.edge_functions = true;
    } else if (response.status === 404) {
      console.log(`${colors.red}❌ Edge function not deployed${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Edge function test error: ${error.message}${colors.reset}`);
  }

  // 6. Test Missing Tables
  console.log(`\n${colors.cyan}🔍 CHECK MISSING TABLES${colors.reset}`);
  console.log('─────────────────────────────────');
  
  const requiredTables = ['call_logs', 'leads', 'sms_logs', 'appointments'];
  const missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${colors.red}❌ Table ${table}: Missing or inaccessible${colors.reset}`);
        missingTables.push(table);
      } else {
        console.log(`${colors.green}✅ Table ${table}: Exists${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.red}❌ Table ${table}: Error checking${colors.reset}`);
      missingTables.push(table);
    }
  }

  // Summary
  console.log(`\n${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}📊 CONNECTION SUMMARY${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);

  const totalTests = Object.keys(tests).length;
  const passedTests = Object.values(tests).filter(v => v).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(0);

  console.log(`Tests passed: ${passedTests}/${totalTests} (${successRate}%)\n`);

  Object.entries(tests).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    const color = value ? colors.green : colors.red;
    const name = key.replace(/_/g, ' ').toUpperCase();
    console.log(`${color}${icon} ${name}${colors.reset}`);
  });

  if (missingTables.length > 0) {
    console.log(`\n${colors.yellow}⚠️ MISSING TABLES TO CREATE:${colors.reset}`);
    missingTables.forEach(table => {
      console.log(`   - ${table}`);
    });
    
    console.log(`\n${colors.yellow}📝 TO CREATE TABLES:${colors.reset}`);
    console.log('1. Go to: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/sql');
    console.log('2. Copy content from: create-supabase-tables.sql');
    console.log('3. Paste in SQL editor and click "Run"');
  }

  // Recommendations
  console.log(`\n${colors.yellow}💡 NEXT STEPS${colors.reset}`);
  console.log('─────────────────────────────────');
  
  if (!tests.frontend) {
    console.log('• Start frontend: cd frontend && npm run dev');
  }
  if (missingTables.length > 0) {
    console.log('• Create missing tables in Supabase SQL editor');
  }
  if (!tests.edge_functions) {
    console.log('• Deploy edge functions: npx supabase functions deploy');
  }
  
  if (passedTests === totalTests && missingTables.length === 0) {
    console.log(`${colors.green}🎉 Everything is connected and ready!${colors.reset}`);
    console.log(`\n📞 To test the system:`);
    console.log(`   1. Open dashboard: http://localhost:5173`);
    console.log(`   2. Call Paul: +1 (450) 280-3222`);
  }

  return { tests, missingTables };
}

// Run the test
testFrontendSupabase().catch(console.error);