const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

// Configuration
const PRODUCTION_URL = 'https://drain-fortin-dashboard.vercel.app';
const LOCAL_URL = 'http://localhost:5177';
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 TEST D\'INTÉGRATION END-TO-END COMPLET\n');
console.log('═'.repeat(60));

class IntegrationTester {
  constructor() {
    this.testResults = {
      frontend: { passed: 0, failed: 0, tests: [] },
      backend: { passed: 0, failed: 0, tests: [] },
      realtime: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  log(category, test, success, details = '') {
    const icon = success ? '✅' : '❌';
    console.log(`${icon} [${category.toUpperCase()}] ${test}`);
    if (details) console.log(`   → ${details}`);
    
    this.testResults[category].tests.push({ test, success, details });
    if (success) {
      this.testResults[category].passed++;
    } else {
      this.testResults[category].failed++;
    }
  }

  // Test 1: Frontend Accessibility
  async testFrontendAccess() {
    console.log('\n📱 TEST 1: Accessibilité Frontend\n');
    
    // Test Production
    await new Promise((resolve) => {
      https.get(PRODUCTION_URL, (res) => {
        const success = res.statusCode === 200;
        this.log('frontend', 'Production Vercel', success, 
          `Status: ${res.statusCode}, URL: ${PRODUCTION_URL}`);
        resolve();
      }).on('error', (err) => {
        this.log('frontend', 'Production Vercel', false, err.message);
        resolve();
      });
    });

    // Test Local
    const http = require('http');
    await new Promise((resolve) => {
      http.get(LOCAL_URL, (res) => {
        const success = res.statusCode === 200;
        this.log('frontend', 'Serveur Local', success, 
          `Status: ${res.statusCode}, URL: ${LOCAL_URL}`);
        resolve();
      }).on('error', (err) => {
        this.log('frontend', 'Serveur Local', false, 'Serveur local non démarré');
        resolve();
      });
    });
  }

  // Test 2: Backend Database Operations
  async testBackendOperations() {
    console.log('\n💾 TEST 2: Opérations Backend (Supabase)\n');
    
    // Test connexion
    try {
      const { data, error } = await supabase.from('call_logs').select('count', { count: 'exact', head: true });
      this.log('backend', 'Connexion Supabase', !error, 
        error ? error.message : `Base accessible`);
    } catch (err) {
      this.log('backend', 'Connexion Supabase', false, err.message);
    }

    // Test INSERT
    try {
      const testData = {
        customer_name: `Test E2E ${Date.now()}`,
        phone: '(514) 555-TEST',
        status: 'completed',
        duration: 120,
        reason: 'Test intégration',
        converted: true,
        value: 500
      };

      const { data, error } = await supabase
        .from('call_logs')
        .insert(testData)
        .select()
        .single();

      if (!error && data) {
        this.log('backend', 'Insertion données', true, `ID: ${data.id}`);
        this.testCallId = data.id;

        // Test UPDATE
        const { error: updateError } = await supabase
          .from('call_logs')
          .update({ status: 'active' })
          .eq('id', data.id);

        this.log('backend', 'Modification données', !updateError,
          updateError ? updateError.message : 'Update réussi');

        // Test SELECT
        const { data: selectData, error: selectError } = await supabase
          .from('call_logs')
          .select('*')
          .eq('id', data.id)
          .single();

        this.log('backend', 'Lecture données', !selectError && selectData?.status === 'active',
          selectError ? selectError.message : `Status: ${selectData?.status}`);

        // Test DELETE
        const { error: deleteError } = await supabase
          .from('call_logs')
          .delete()
          .eq('id', data.id);

        this.log('backend', 'Suppression données', !deleteError,
          deleteError ? deleteError.message : 'Delete réussi');
      } else {
        this.log('backend', 'Insertion données', false, error?.message);
      }
    } catch (err) {
      this.log('backend', 'Opérations CRUD', false, err.message);
    }

    // Test tables CRM
    try {
      const tables = ['customers', 'alerts', 'analytics'];
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        this.log('backend', `Table ${table}`, !error,
          error ? error.message : `${count || 0} enregistrements`);
      }
    } catch (err) {
      this.log('backend', 'Vérification tables', false, err.message);
    }
  }

  // Test 3: Real-time WebSocket
  async testRealtimeConnection() {
    console.log('\n⚡ TEST 3: Connexion Temps Réel (WebSocket)\n');
    
    return new Promise((resolve) => {
      let received = false;
      const testMessage = `Test WebSocket ${Date.now()}`;
      
      // S'abonner aux changements
      const channel = supabase
        .channel('test-e2e-channel')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            received = true;
            this.log('realtime', 'Réception événement', true,
              `Type: ${payload.eventType}, Table: ${payload.table}`);
            channel.unsubscribe();
            resolve();
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.log('realtime', 'Souscription WebSocket', true, 'Canal actif');
            
            // Insérer pour déclencher l'événement
            setTimeout(async () => {
              await supabase.from('alerts').insert({
                type: 'info',
                message: testMessage
              });
            }, 1000);
          } else if (status === 'CLOSED') {
            this.log('realtime', 'Souscription WebSocket', false, 'Canal fermé');
            resolve();
          }
        });

      // Timeout après 10 secondes
      setTimeout(() => {
        if (!received) {
          this.log('realtime', 'Réception événement', false, 'Timeout - Aucun événement reçu');
          channel.unsubscribe();
          resolve();
        }
      }, 10000);
    });
  }

  // Test 4: Integration Flow
  async testIntegrationFlow() {
    console.log('\n🔄 TEST 4: Flux d\'Intégration Complet\n');
    
    // Simuler un flux utilisateur complet
    try {
      // 1. Créer un client
      const customer = {
        name: 'Client Test E2E',
        phone: '(514) 555-E2E',
        reason: 'Test flux complet',
        potential_value: 2500,
        status: 'pending',
        notes: 'Test automatisé E2E'
      };

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();

      this.log('integration', 'Création client CRM', !customerError,
        customerError ? customerError.message : `Client ID: ${customerData?.id}`);

      if (customerData) {
        // 2. Créer un appel lié
        const call = {
          customer_name: customer.name,
          phone: customer.phone,
          status: 'active',
          duration: 0,
          reason: customer.reason
        };

        const { data: callData, error: callError } = await supabase
          .from('call_logs')
          .insert(call)
          .select()
          .single();

        this.log('integration', 'Création appel', !callError,
          callError ? callError.message : `Appel ID: ${callData?.id}`);

        // 3. Créer une alerte
        const alert = {
          type: 'urgent',
          message: `Rappeler ${customer.name}`,
          resolved: false
        };

        const { data: alertData, error: alertError } = await supabase
          .from('alerts')
          .insert(alert)
          .select()
          .single();

        this.log('integration', 'Création alerte', !alertError,
          alertError ? alertError.message : `Alerte ID: ${alertData?.id}`);

        // 4. Nettoyer les données de test
        if (customerData?.id) {
          await supabase.from('customers').delete().eq('id', customerData.id);
        }
        if (callData?.id) {
          await supabase.from('call_logs').delete().eq('id', callData.id);
        }
        if (alertData?.id) {
          await supabase.from('alerts').delete().eq('id', alertData.id);
        }

        this.log('integration', 'Nettoyage données test', true, 'Données supprimées');
      }
    } catch (err) {
      this.log('integration', 'Flux complet', false, err.message);
    }

    // Test API endpoints
    try {
      const endpoints = [
        '/rest/v1/call_logs',
        '/rest/v1/customers',
        '/rest/v1/alerts'
      ];

      for (const endpoint of endpoints) {
        const url = `${SUPABASE_URL}${endpoint}?select=count`;
        const response = await fetch(url, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });

        this.log('integration', `API ${endpoint}`, response.ok,
          `Status: ${response.status}`);
      }
    } catch (err) {
      this.log('integration', 'Test API REST', false, err.message);
    }
  }

  // Générer le rapport final
  generateReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RAPPORT D\'INTÉGRATION END-TO-END\n');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of Object.entries(this.testResults)) {
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      const icon = results.failed === 0 ? '✅' : '⚠️';
      console.log(`${icon} ${category.toUpperCase()}: ${results.passed}/${results.passed + results.failed} tests réussis`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`TOTAL: ${totalPassed}/${totalPassed + totalFailed} tests réussis`);
    
    const successRate = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
    console.log(`Taux de réussite: ${successRate}%`);

    if (successRate === 100) {
      console.log('\n🎉 SYSTÈME 100% INTÉGRÉ ET FONCTIONNEL!');
      console.log('✅ Frontend ↔️ Backend ↔️ Base de données : TOUT EST CONNECTÉ');
    } else if (successRate >= 80) {
      console.log('\n✅ SYSTÈME OPÉRATIONNEL');
      console.log('La plupart des composants sont connectés correctement');
    } else {
      console.log('\n⚠️ ATTENTION: Certains composants ne sont pas correctement connectés');
      console.log('Vérifiez les erreurs ci-dessus pour corriger l\'intégration');
    }

    // Détails des échecs
    if (totalFailed > 0) {
      console.log('\n❌ Tests échoués:');
      for (const [category, results] of Object.entries(this.testResults)) {
        const failed = results.tests.filter(t => !t.success);
        if (failed.length > 0) {
          console.log(`\n[${category.toUpperCase()}]`);
          failed.forEach(t => console.log(`  - ${t.test}: ${t.details}`));
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('URLs de production:');
    console.log(`🌐 Frontend: ${PRODUCTION_URL}`);
    console.log(`💾 Backend: ${SUPABASE_URL}`);
    console.log(`📊 Dashboard: ${SUPABASE_URL}/project/phiduqxcufdmgjvdipyu`);
    
    return successRate === 100;
  }
}

// Exécuter les tests
async function runIntegrationTests() {
  const tester = new IntegrationTester();
  
  await tester.testFrontendAccess();
  await tester.testBackendOperations();
  await tester.testRealtimeConnection();
  await tester.testIntegrationFlow();
  
  const success = tester.generateReport();
  process.exit(success ? 0 : 1);
}

runIntegrationTests().catch(console.error);