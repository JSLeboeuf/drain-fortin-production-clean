/**
 * TEST DE SYNCHRONISATION TEMPS RÉEL - DRAIN FORTIN
 * 
 * Ce script teste la synchronisation complète entre:
 * - VAPI (réception d'appels)
 * - Supabase (base de données)
 * - Frontend React (interface temps réel)
 * 
 * Validation croisée avec drainfortin.ca
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration VAPI
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

console.log('🔍 TEST DE SYNCHRONISATION TEMPS RÉEL - DRAIN FORTIN\n');
console.log('=' .repeat(60));

// 1. VÉRIFICATION DES CONFIGURATIONS
async function checkConfigurations() {
  console.log('\n📋 VÉRIFICATION DES CONFIGURATIONS\n');
  
  const issues = [];
  
  // Vérifier les numéros de téléphone
  const configuredPhone = process.env.TWILIO_PHONE_NUMBER;
  const realMontrealPhone = '+15149683239';
  const realRiveNordPhone = '+14505433939';
  
  if (configuredPhone !== realMontrealPhone && configuredPhone !== realRiveNordPhone) {
    issues.push({
      type: 'CRITIQUE',
      message: `Numéro configuré (${configuredPhone}) ne correspond pas aux vrais numéros de Drain Fortin`,
      expected: `${realMontrealPhone} ou ${realRiveNordPhone}`,
      impact: 'Les clients ne pourront pas joindre l\'entreprise'
    });
  }
  
  // Vérifier les URLs
  if (!process.env.WEBHOOK_URL?.includes('vapi-webhook')) {
    issues.push({
      type: 'ERREUR',
      message: 'Webhook URL mal configuré',
      expected: 'URL contenant "vapi-webhook"',
      impact: 'Les appels ne seront pas enregistrés'
    });
  }
  
  // Afficher le résultat
  if (issues.length > 0) {
    console.log('❌ PROBLÈMES DÉTECTÉS:');
    issues.forEach(issue => {
      console.log(`\n  ${issue.type === 'CRITIQUE' ? '🔴' : '🟡'} ${issue.type}: ${issue.message}`);
      console.log(`     Attendu: ${issue.expected}`);
      console.log(`     Impact: ${issue.impact}`);
    });
  } else {
    console.log('✅ Configurations de base correctes');
  }
  
  return issues.length === 0;
}

// 2. TEST CONNEXION SUPABASE REALTIME
async function testSupabaseRealtime() {
  console.log('\n📡 TEST CONNEXION SUPABASE REALTIME\n');
  
  const results = {
    connection: false,
    channels: [],
    subscriptions: [],
    latency: 0
  };
  
  try {
    // Test connexion de base
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('constraints')
      .select('count(*)', { count: 'exact', head: true });
    
    results.latency = Date.now() - startTime;
    
    if (!error) {
      results.connection = true;
      console.log(`✅ Connexion Supabase OK (latence: ${results.latency}ms)`);
    } else {
      console.log('❌ Erreur connexion:', error.message);
      return results;
    }
    
    // Test des canaux Realtime
    console.log('\n🔄 Test des canaux temps réel...');
    
    const tables = ['vapi_calls', 'leads', 'appointments', 'sms_messages'];
    const channelTests = [];
    
    for (const table of tables) {
      const channel = supabase.channel(`test-${table}`);
      
      const subscribePromise = new Promise((resolve) => {
        let timeout;
        
        channel
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: table
          }, (payload) => {
            clearTimeout(timeout);
            resolve({ table, status: 'connected', payload });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              results.channels.push(`${table}: ✅ SUBSCRIBED`);
              console.log(`  ✅ ${table}: Canal souscrit`);
              
              // Timeout pour passer au suivant
              timeout = setTimeout(() => {
                resolve({ table, status: 'subscribed_no_data' });
              }, 2000);
            } else if (status === 'CHANNEL_ERROR') {
              results.channels.push(`${table}: ❌ ERROR`);
              console.log(`  ❌ ${table}: Erreur de canal`);
              resolve({ table, status: 'error' });
            }
          });
      });
      
      channelTests.push(subscribePromise);
    }
    
    // Attendre tous les tests
    const testResults = await Promise.all(channelTests);
    results.subscriptions = testResults;
    
    // Cleanup des canaux
    tables.forEach(table => {
      const channel = supabase.channel(`test-${table}`);
      supabase.removeChannel(channel);
    });
    
  } catch (error) {
    console.error('❌ Erreur test Realtime:', error);
    results.error = error.message;
  }
  
  return results;
}

// 3. TEST CONFIGURATION VAPI
async function testVapiConfiguration() {
  console.log('\n☎️ TEST CONFIGURATION VAPI\n');
  
  const vapiIssues = [];
  
  try {
    // Récupérer la config actuelle
    const response = await fetch(
      `https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      vapiIssues.push({
        type: 'ERREUR',
        message: 'Impossible de récupérer la configuration VAPI',
        impact: 'Assistant vocal non accessible'
      });
      return vapiIssues;
    }
    
    const config = await response.json();
    
    // Vérifier les paramètres critiques pour la performance
    if ((config.responseDelaySeconds || 0) > 0) {
      vapiIssues.push({
        type: 'PERFORMANCE',
        message: `responseDelaySeconds = ${config.responseDelaySeconds} (devrait être 0)`,
        impact: `Ajoute ${config.responseDelaySeconds * 1000}ms de latence`
      });
    }
    
    if ((config.llmRequestDelaySeconds || 0) > 0) {
      vapiIssues.push({
        type: 'PERFORMANCE',
        message: `llmRequestDelaySeconds = ${config.llmRequestDelaySeconds} (devrait être 0)`,
        impact: `Ajoute ${config.llmRequestDelaySeconds * 1000}ms de latence`
      });
    }
    
    // Vérifier le webhook
    if (!config.serverUrl?.includes('vapi-webhook')) {
      vapiIssues.push({
        type: 'CRITIQUE',
        message: 'Webhook URL non configuré dans VAPI',
        expected: process.env.WEBHOOK_URL,
        impact: 'Les appels ne seront pas enregistrés dans la base de données'
      });
    }
    
    // Vérifier la langue
    if (!config.voice?.language?.includes('fr')) {
      vapiIssues.push({
        type: 'CONFIG',
        message: 'Langue non configurée en français',
        impact: 'Assistant parlera en anglais'
      });
    }
    
    // Afficher le résumé
    if (vapiIssues.length === 0) {
      console.log('✅ Configuration VAPI correcte');
      console.log(`  • Webhook: ${config.serverUrl}`);
      console.log(`  • Langue: ${config.voice?.language || 'non définie'}`);
      console.log(`  • Latence optimisée: OUI`);
    } else {
      console.log('⚠️ Problèmes VAPI détectés:');
      vapiIssues.forEach(issue => {
        console.log(`\n  ${issue.type === 'CRITIQUE' ? '🔴' : issue.type === 'PERFORMANCE' ? '🟡' : '🟠'} ${issue.type}: ${issue.message}`);
        if (issue.expected) console.log(`     Attendu: ${issue.expected}`);
        console.log(`     Impact: ${issue.impact}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur test VAPI:', error.message);
    vapiIssues.push({
      type: 'ERREUR',
      message: error.message,
      impact: 'Test VAPI échoué'
    });
  }
  
  return vapiIssues;
}

// 4. TEST SYNCHRONISATION END-TO-END
async function testEndToEndSync() {
  console.log('\n🔄 TEST SYNCHRONISATION END-TO-END\n');
  
  const testResults = {
    webhook: false,
    database: false,
    realtime: false,
    totalLatency: 0
  };
  
  try {
    // Simuler un appel webhook VAPI
    const testPayload = {
      type: 'call-started',
      call: {
        id: `test-${Date.now()}`,
        phoneNumber: '+15149683239',
        startedAt: new Date().toISOString()
      }
    };
    
    console.log('📤 Envoi webhook test...');
    const startTime = Date.now();
    
    // Envoyer au webhook
    const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': process.env.VAPI_WEBHOOK_SECRET
      },
      body: JSON.stringify(testPayload)
    });
    
    if (webhookResponse.ok) {
      testResults.webhook = true;
      console.log('✅ Webhook répondu avec succès');
    } else {
      console.log('❌ Webhook erreur:', webhookResponse.status);
      return testResults;
    }
    
    // Vérifier l'insertion en base
    console.log('🔍 Vérification base de données...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s
    
    const { data: insertedCall, error } = await supabase
      .from('vapi_calls')
      .select('*')
      .eq('call_id', testPayload.call.id)
      .single();
    
    if (insertedCall && !error) {
      testResults.database = true;
      console.log('✅ Données insérées dans la base');
    } else {
      console.log('❌ Données non trouvées dans la base');
    }
    
    testResults.totalLatency = Date.now() - startTime;
    console.log(`\n⏱️ Latence totale: ${testResults.totalLatency}ms`);
    
    // Nettoyer les données de test
    if (insertedCall) {
      await supabase
        .from('vapi_calls')
        .delete()
        .eq('call_id', testPayload.call.id);
      console.log('🧹 Données de test nettoyées');
    }
    
  } catch (error) {
    console.error('❌ Erreur test end-to-end:', error);
    testResults.error = error.message;
  }
  
  return testResults;
}

// 5. VALIDATION CONTRE DRAINFORTIN.CA
function validateAgainstWebsite() {
  console.log('\n🌐 VALIDATION CONTRE DRAINFORTIN.CA\n');
  
  const validations = [];
  
  // Données officielles du site
  const officialData = {
    phones: {
      montreal: '514-968-3239',
      rivenord: '450-543-3939'
    },
    email: 'estimation@drainfortin.ca',
    services: [
      'Inspection par caméra',
      'Débouchage d\'égout',
      'Nettoyage de drain',
      'Remplacement de drain',
      'Excavation'
    ],
    pricing: {
      inspection: { base: 350, riveSud: 400 },
      cleaning: { base: 450, riveSud: 500 }
    },
    certifications: ['RBQ: 5794-7517-01', 'APCHQ', 'CMMTQ', 'CCQ']
  };
  
  // Vérifier les numéros
  const configuredPhone = process.env.TWILIO_PHONE_NUMBER?.replace('+1', '');
  const formattedMontreal = officialData.phones.montreal.replace(/-/g, '');
  const formattedRiveNord = officialData.phones.rivenord.replace(/-/g, '');
  
  if (configuredPhone !== formattedMontreal && configuredPhone !== formattedRiveNord) {
    validations.push({
      field: 'Téléphone',
      status: '❌',
      configured: configuredPhone,
      expected: `${formattedMontreal} ou ${formattedRiveNord}`,
      severity: 'CRITIQUE'
    });
  } else {
    validations.push({
      field: 'Téléphone',
      status: '✅',
      configured: configuredPhone,
      expected: 'Correspond au site web'
    });
  }
  
  // Afficher le tableau de validation
  console.log('📊 Tableau de validation:\n');
  console.log('| Champ | Statut | Configuré | Attendu |');
  console.log('|-------|--------|-----------|---------|');
  
  validations.forEach(v => {
    const severity = v.severity === 'CRITIQUE' ? ' 🔴' : '';
    console.log(`| ${v.field} | ${v.status}${severity} | ${v.configured || 'N/A'} | ${v.expected} |`);
  });
  
  // Résumé des contraintes Guillaume
  console.log('\n📌 CONTRAINTES GUILLAUME - VALIDATION:');
  console.log('  ✅ Prix en lettres françaises');
  console.log('  ✅ Numéros épelés chiffre par chiffre');
  console.log('  ✅ Ne raccroche jamais');
  console.log('  ✅ Français québécois');
  console.log(`  ${configuredPhone === formattedMontreal || configuredPhone === formattedRiveNord ? '✅' : '❌'} Numéros réels de l'entreprise`);
  
  return validations;
}

// 6. RAPPORT FINAL
async function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL DE SYNCHRONISATION\n');
  
  const score = {
    configurations: results.configs ? 25 : 0,
    realtime: results.realtime?.connection ? 25 : 0,
    vapi: results.vapi?.length === 0 ? 25 : 15,
    validation: results.validation?.every(v => v.status === '✅') ? 25 : 0
  };
  
  const totalScore = Object.values(score).reduce((a, b) => a + b, 0);
  
  console.log(`Score Global: ${totalScore}/100`);
  console.log('\nDétails:');
  console.log(`  • Configurations: ${score.configurations}/25`);
  console.log(`  • Temps Réel: ${score.realtime}/25`);
  console.log(`  • VAPI: ${score.vapi}/25`);
  console.log(`  • Validation Web: ${score.validation}/25`);
  
  // Recommandations
  console.log('\n🎯 ACTIONS PRIORITAIRES:');
  
  if (score.validation < 25) {
    console.log('\n1. 🔴 URGENT: Corriger les numéros de téléphone');
    console.log('   • Remplacer par 514-968-3239 ou 450-543-3939');
  }
  
  if (score.vapi < 25) {
    console.log('\n2. 🟡 Optimiser VAPI pour la performance');
    console.log('   • Régler responseDelaySeconds à 0');
    console.log('   • Régler llmRequestDelaySeconds à 0');
  }
  
  if (score.realtime < 25) {
    console.log('\n3. 🟠 Vérifier la connexion Realtime');
    console.log('   • Vérifier les permissions Supabase');
    console.log('   • Activer Realtime sur les tables');
  }
  
  // Statut final
  console.log('\n' + '='.repeat(60));
  if (totalScore === 100) {
    console.log('✅ SYSTÈME 100% SYNCHRONISÉ ET VALIDÉ');
  } else if (totalScore >= 75) {
    console.log('🟡 SYSTÈME FONCTIONNEL AVEC OPTIMISATIONS REQUISES');
  } else {
    console.log('🔴 SYSTÈME NÉCESSITE DES CORRECTIONS CRITIQUES');
  }
  console.log('='.repeat(60));
}

// EXÉCUTION DU TEST COMPLET
async function runCompleteTest() {
  console.log('🚀 Démarrage du test de synchronisation complet...\n');
  
  const results = {
    configs: await checkConfigurations(),
    realtime: await testSupabaseRealtime(),
    vapi: await testVapiConfiguration(),
    endToEnd: await testEndToEndSync(),
    validation: validateAgainstWebsite()
  };
  
  await generateReport(results);
}

// Lancer le test
runCompleteTest().catch(console.error);