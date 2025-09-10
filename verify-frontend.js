const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const FRONTEND_URL = 'http://localhost:5177';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 VÉRIFICATION COMPLÈTE DU SYSTÈME DRAIN FORTIN\n');
console.log('=' .repeat(50));

let testsOK = 0;
let testsFailed = 0;

// Test 1: Vérifier le serveur frontend
async function testFrontendServer() {
  console.log('\n📱 Test 1: Serveur Frontend');
  
  return new Promise((resolve) => {
    http.get(FRONTEND_URL, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        console.log('✅ Frontend accessible sur', FRONTEND_URL);
        testsOK++;
        resolve(true);
      } else {
        console.log('❌ Frontend inaccessible - Code:', res.statusCode);
        testsFailed++;
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('❌ Frontend non démarré');
      console.log('   Lancez: cd frontend && npm run dev');
      testsFailed++;
      resolve(false);
    });
  });
}

// Test 2: Vérifier la connexion Supabase
async function testSupabaseConnection() {
  console.log('\n🔌 Test 2: Connexion Supabase');
  
  try {
    const { data, error } = await supabase
      .from('health_check')
      .select('status')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ Connexion Supabase établie');
    console.log('   URL:', SUPABASE_URL);
    testsOK++;
    return true;
  } catch (error) {
    console.log('❌ Erreur connexion Supabase:', error.message);
    testsFailed++;
    return false;
  }
}

// Test 3: Vérifier les tables
async function testTables() {
  console.log('\n📊 Test 3: Tables de données');
  
  const tables = ['call_logs', 'customers', 'alerts', 'analytics'];
  let allTablesOK = true;
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      console.log(`✅ Table ${table}: OK (${count || 0} enregistrements)`);
    } catch (error) {
      console.log(`❌ Table ${table}: Erreur - ${error.message}`);
      allTablesOK = false;
    }
  }
  
  if (allTablesOK) {
    testsOK++;
  } else {
    testsFailed++;
  }
  
  return allTablesOK;
}

// Test 4: Vérifier les temps réel
async function testRealtime() {
  console.log('\n⚡ Test 4: Connexion temps réel');
  
  return new Promise((resolve) => {
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_logs' },
        (payload) => {
          console.log('✅ Événement reçu:', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Souscription temps réel active');
          testsOK++;
          supabase.removeChannel(channel);
          resolve(true);
        } else if (status === 'CLOSED') {
          console.log('❌ Souscription temps réel fermée');
          testsFailed++;
          resolve(false);
        }
      });
    
    // Timeout après 5 secondes
    setTimeout(() => {
      console.log('⚠️ Timeout connexion temps réel');
      supabase.removeChannel(channel);
      testsFailed++;
      resolve(false);
    }, 5000);
  });
}

// Test 5: Insérer et récupérer des données
async function testDataOperations() {
  console.log('\n💾 Test 5: Opérations de données');
  
  try {
    // Insérer une alerte de test
    const testAlert = {
      type: 'info',
      message: `Test système - ${new Date().toLocaleTimeString('fr-CA')}`,
      resolved: false
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('alerts')
      .insert(testAlert)
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    console.log('✅ Insertion réussie - ID:', insertData.id);
    
    // Récupérer l'alerte
    const { data: selectData, error: selectError } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', insertData.id)
      .single();
    
    if (selectError) throw selectError;
    
    console.log('✅ Lecture réussie - Message:', selectData.message);
    
    // Supprimer l'alerte de test
    const { error: deleteError } = await supabase
      .from('alerts')
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) throw deleteError;
    
    console.log('✅ Suppression réussie');
    testsOK++;
    return true;
  } catch (error) {
    console.log('❌ Erreur opérations:', error.message);
    testsFailed++;
    return false;
  }
}

// Test 6: Vérifier les performances
async function testPerformance() {
  console.log('\n⏱️ Test 6: Performance');
  
  const startTime = Date.now();
  
  try {
    // Faire 10 requêtes en parallèle
    const promises = Array(10).fill(null).map(() => 
      supabase.from('call_logs').select('id').limit(1)
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    if (duration < 2000) {
      console.log(`✅ Excellent temps de réponse: ${duration}ms`);
      testsOK++;
    } else if (duration < 5000) {
      console.log(`⚠️ Temps de réponse acceptable: ${duration}ms`);
      testsOK++;
    } else {
      console.log(`❌ Temps de réponse lent: ${duration}ms`);
      testsFailed++;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erreur test performance:', error.message);
    testsFailed++;
    return false;
  }
}

// Exécution des tests
async function runAllTests() {
  console.log('\n🚀 Démarrage des tests...\n');
  
  await testFrontendServer();
  await testSupabaseConnection();
  await testTables();
  await testRealtime();
  await testDataOperations();
  await testPerformance();
  
  // Résumé
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RÉSUMÉ DES TESTS\n');
  console.log(`✅ Tests réussis: ${testsOK}/6`);
  console.log(`❌ Tests échoués: ${testsFailed}/6`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 SYSTÈME 100% OPÉRATIONNEL!');
    console.log('🌐 Accédez à l\'interface sur:', FRONTEND_URL);
  } else {
    console.log('\n⚠️ ATTENTION: Certains tests ont échoué');
    console.log('Vérifiez les erreurs ci-dessus pour résoudre les problèmes');
  }
  
  // Instructions finales
  console.log('\n📝 COMMANDES UTILES:');
  console.log('  • Démarrer frontend: cd frontend && npm run dev');
  console.log('  • Créer les tables: node create-supabase-tables.js');
  console.log('  • Build production: cd frontend && npm run build');
  console.log('  • Vérifier système: node verify-frontend.js');
  
  process.exit(testsFailed === 0 ? 0 : 1);
}

// Lancer les tests
runAllTests().catch(console.error);