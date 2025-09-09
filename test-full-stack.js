/**
 * Test Complet Full-Stack
 * Vérifie toutes les connexions et synchronisations
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.ZRUd-6UwptM3w3tZCsm7SPl7-RzMfdEs_giTW9_2N5o';
const VAPI_API_KEY = '88c0382e-069c-4ec3-b8a9-5fae174c0d7e';

// Initialiser Supabase
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

async function testFullStack() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║     TEST COMPLET FULL-STACK - DRAIN FORTIN     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const results = {
    supabase: { status: false, details: {} },
    vapi: { status: false, details: {} },
    frontend: { status: false, details: {} },
    webhook: { status: false, details: {} },
    realtime: { status: false, details: {} }
  };

  // 1. Test Frontend
  console.log(`${colors.cyan}📱 TEST FRONTEND${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const frontendResponse = await fetch('http://localhost:5173');
    results.frontend.status = frontendResponse.ok;
    results.frontend.details = {
      status: frontendResponse.status,
      url: 'http://localhost:5173'
    };
    
    if (frontendResponse.ok) {
      console.log(`${colors.green}✅ Frontend accessible${colors.reset}`);
      console.log(`   URL: http://localhost:5173`);
      console.log(`   Status: ${frontendResponse.status}`);
    } else {
      console.log(`${colors.red}❌ Frontend inaccessible${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Frontend error: ${error.message}${colors.reset}`);
    results.frontend.details.error = error.message;
  }

  // 2. Test Supabase Connection
  console.log(`\n${colors.cyan}🗄️ TEST SUPABASE${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    // Test table call_logs
    const { data: callLogs, error: callError } = await supabase
      .from('call_logs')
      .select('count(*)', { count: 'exact', head: true });

    if (!callError) {
      console.log(`${colors.green}✅ Table call_logs accessible${colors.reset}`);
      results.supabase.details.call_logs = true;
    } else {
      console.log(`${colors.red}❌ Table call_logs: ${callError.message}${colors.reset}`);
      results.supabase.details.call_logs = false;
    }

    // Test table leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('count(*)', { count: 'exact', head: true });

    if (!leadsError) {
      console.log(`${colors.green}✅ Table leads accessible${colors.reset}`);
      results.supabase.details.leads = true;
    } else {
      console.log(`${colors.red}❌ Table leads: ${leadsError.message}${colors.reset}`);
      results.supabase.details.leads = false;
    }

    // Test table constraints
    const { data: constraints, error: constraintsError } = await supabase
      .from('constraints')
      .select('*')
      .limit(5);

    if (!constraintsError && constraints) {
      console.log(`${colors.green}✅ Table constraints accessible (${constraints.length} contraintes)${colors.reset}`);
      results.supabase.details.constraints = constraints.length;
    } else {
      console.log(`${colors.red}❌ Table constraints: ${constraintsError?.message}${colors.reset}`);
      results.supabase.details.constraints = 0;
    }

    // Test table sms_logs
    const { data: smsLogs, error: smsError } = await supabase
      .from('sms_logs')
      .select('count(*)', { count: 'exact', head: true });

    if (!smsError) {
      console.log(`${colors.green}✅ Table sms_logs accessible${colors.reset}`);
      results.supabase.details.sms_logs = true;
    } else {
      console.log(`${colors.red}❌ Table sms_logs: ${smsError.message}${colors.reset}`);
      results.supabase.details.sms_logs = false;
    }

    results.supabase.status = !callError && !leadsError && !constraintsError && !smsError;

  } catch (error) {
    console.log(`${colors.red}❌ Supabase connection error: ${error.message}${colors.reset}`);
    results.supabase.details.error = error.message;
  }

  // 3. Test VAPI Connection
  console.log(`\n${colors.cyan}📞 TEST VAPI${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    if (vapiResponse.ok) {
      const assistants = await vapiResponse.json();
      const paulAssistant = assistants.find(a => 
        a.name === "Paul - Agent Drain Fortin Production"
      );

      if (paulAssistant) {
        console.log(`${colors.green}✅ Assistant Paul trouvé${colors.reset}`);
        console.log(`   ID: ${paulAssistant.id}`);
        console.log(`   Voice: ${paulAssistant.voice?.model || 'Non défini'}`);
        console.log(`   Language: ${paulAssistant.voice?.language || 'Non défini'}`);
        console.log(`   SSML: ${paulAssistant.voice?.enableSsmlParsing ? '✅' : '❌'}`);
        
        results.vapi.status = true;
        results.vapi.details = {
          assistantId: paulAssistant.id,
          voiceModel: paulAssistant.voice?.model,
          language: paulAssistant.voice?.language,
          ssml: paulAssistant.voice?.enableSsmlParsing
        };
      } else {
        console.log(`${colors.yellow}⚠️ Assistant Paul non trouvé${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ VAPI API error: ${vapiResponse.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ VAPI connection error: ${error.message}${colors.reset}`);
    results.vapi.details.error = error.message;
  }

  // 4. Test Webhook Endpoint
  console.log(`\n${colors.cyan}🔗 TEST WEBHOOK${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const webhookUrl = 'https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook';
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });

    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Status: ${webhookResponse.status}`);
    
    if (webhookResponse.status === 401 || webhookResponse.status === 400) {
      console.log(`${colors.green}✅ Webhook endpoint accessible (sécurisé)${colors.reset}`);
      results.webhook.status = true;
    } else if (webhookResponse.ok) {
      console.log(`${colors.yellow}⚠️ Webhook répond mais sans sécurité${colors.reset}`);
      results.webhook.status = true;
    } else {
      console.log(`${colors.red}❌ Webhook error: ${webhookResponse.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Webhook connection error: ${error.message}${colors.reset}`);
    results.webhook.details.error = error.message;
  }

  // 5. Test Realtime Connection
  console.log(`\n${colors.cyan}🔄 TEST REALTIME${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    const channel = supabase
      .channel('test-channel')
      .on('presence', { event: 'sync' }, () => {
        console.log(`${colors.green}✅ Realtime connection active${colors.reset}`);
        results.realtime.status = true;
      })
      .subscribe();

    // Attendre 2 secondes pour la connexion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (channel.state === 'joined') {
      console.log(`${colors.green}✅ Realtime channel joined${colors.reset}`);
      results.realtime.status = true;
    } else {
      console.log(`${colors.yellow}⚠️ Realtime state: ${channel.state}${colors.reset}`);
    }

    // Nettoyer
    await supabase.removeChannel(channel);
  } catch (error) {
    console.log(`${colors.red}❌ Realtime error: ${error.message}${colors.reset}`);
    results.realtime.details.error = error.message;
  }

  // 6. Résumé Final
  console.log(`\n${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}📊 RÉSUMÉ FINAL${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.status).length;
  const successRate = (passedTests / totalTests * 100).toFixed(0);

  console.log(`Tests réussis: ${passedTests}/${totalTests} (${successRate}%)\n`);

  Object.entries(results).forEach(([key, value]) => {
    const icon = value.status ? '✅' : '❌';
    const color = value.status ? colors.green : colors.red;
    console.log(`${color}${icon} ${key.toUpperCase()}: ${value.status ? 'OK' : 'ERREUR'}${colors.reset}`);
    
    if (value.details && Object.keys(value.details).length > 0) {
      Object.entries(value.details).forEach(([detailKey, detailValue]) => {
        if (detailKey !== 'error') {
          console.log(`   - ${detailKey}: ${detailValue}`);
        }
      });
    }
  });

  // 7. Recommandations
  console.log(`\n${colors.yellow}💡 RECOMMANDATIONS${colors.reset}`);
  console.log('─────────────────────────────────');

  if (!results.supabase.status) {
    console.log('• Vérifier les tables Supabase et les permissions');
  }
  if (!results.vapi.status) {
    console.log('• Vérifier la configuration VAPI et les clés API');
  }
  if (!results.webhook.status) {
    console.log('• Vérifier le déploiement des Edge Functions');
  }
  if (!results.realtime.status) {
    console.log('• Vérifier la configuration Realtime de Supabase');
  }

  if (passedTests === totalTests) {
    console.log(`${colors.green}🎉 Tout est parfaitement synchronisé!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ Certains composants nécessitent attention${colors.reset}`);
  }

  return results;
}

// Test de simulation d'appel
async function simulateCall() {
  console.log(`\n${colors.cyan}📞 SIMULATION D'APPEL${colors.reset}`);
  console.log('─────────────────────────────────');

  const callData = {
    call_id: `test_${Date.now()}`,
    customer_phone_masked: '450-***-3222',
    status: 'completed',
    duration_seconds: 120,
    transcript: 'Test de simulation d\'appel',
    metadata: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const { data, error } = await supabase
      .from('call_logs')
      .insert([callData])
      .select();

    if (error) {
      console.log(`${colors.red}❌ Erreur insertion: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Appel simulé inséré avec succès${colors.reset}`);
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Call ID: ${data[0].call_id}`);
      
      // Nettoyer après le test
      await supabase
        .from('call_logs')
        .delete()
        .eq('call_id', callData.call_id);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Erreur simulation: ${error.message}${colors.reset}`);
  }
}

// Exécution principale
async function main() {
  console.clear();
  
  try {
    const results = await testFullStack();
    
    // Si tout est OK, faire une simulation
    if (results.supabase.status) {
      await simulateCall();
    }
    
    console.log('\n═══════════════════════════════════════════');
    console.log('Test terminé!');
    console.log('\nPour accéder au dashboard: http://localhost:5173');
    console.log('Pour appeler Paul: +1 (438) 900-4385');
    
  } catch (error) {
    console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
  }
}

main();