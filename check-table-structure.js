/**
 * Script pour vérifier la structure exacte des tables dans Supabase
 * Aide à comprendre pourquoi "phone_number" n'existe pas
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration avec la clé service
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.ZRUd-6UwptM3w3tZCsm7SPl7-RzMfdEs_giTW9_2N5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function checkTableStructure() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   VÉRIFICATION STRUCTURE DES TABLES       ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // 1. Essayer de lire call_logs pour voir l'erreur exacte
  console.log('📊 TEST 1: Lecture de call_logs\n');
  
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Erreur call_logs: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Détails: ${JSON.stringify(error.details)}\n`);
      
      // Si c'est une erreur de colonne, essayer avec d'autres noms
      if (error.message.includes('column')) {
        console.log('🔍 Tentative avec customer_phone...');
        
        const { data: data2, error: error2 } = await supabase
          .from('call_logs')
          .select('call_id, customer_phone, status')
          .limit(1);
        
        if (!error2) {
          console.log('✅ La table utilise "customer_phone" (pas phone_number)');
          console.log('   Structure détectée:', Object.keys(data2[0] || {}));
        } else {
          console.log('❌ customer_phone aussi en erreur:', error2.message);
        }
      }
    } else {
      console.log('✅ call_logs accessible!');
      if (data && data[0]) {
        console.log('   Colonnes trouvées:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.log(`❌ Erreur système: ${err.message}`);
  }

  // 2. Essayer vapi_calls
  console.log('\n📊 TEST 2: Lecture de vapi_calls\n');
  
  try {
    const { data, error } = await supabase
      .from('vapi_calls')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Erreur vapi_calls: ${error.message}`);
      
      // Détails de l'erreur
      if (error.message.includes('not a view')) {
        console.log('   → vapi_calls existe comme TABLE, pas comme VIEW');
      } else if (error.message.includes('column')) {
        console.log('   → Problème de colonnes');
      }
    } else {
      console.log('✅ vapi_calls accessible!');
      if (data && data[0]) {
        console.log('   Colonnes:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.log(`❌ Erreur: ${err.message}`);
  }

  // 3. Vérifier les autres tables
  console.log('\n📊 TEST 3: Vérification des autres tables\n');
  
  const tables = ['leads', 'sms_logs', 'appointments', 'alerts', 'clients', 'constraints'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible`);
        if (data && data[0]) {
          const columns = Object.keys(data[0]);
          console.log(`   Colonnes (${columns.length}): ${columns.slice(0, 5).join(', ')}...`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: Erreur système`);
    }
  }

  // 4. Recommandations
  console.log('\n═══════════════════════════════════════════');
  console.log('💡 RECOMMANDATIONS\n');
  
  console.log('Si call_logs utilise "customer_phone" au lieu de "phone_number":');
  console.log('1. Exécuter: FIX-PHONE-NUMBER-COLUMN.sql');
  console.log('   Ce script renomme automatiquement les colonnes\n');
  
  console.log('Si vapi_calls est une TABLE au lieu d\'une VIEW:');
  console.log('1. Exécuter: FIX-VAPI-CALLS-TABLE.sql');
  console.log('   Ce script convertit la table en vue\n');
  
  console.log('📋 Dans Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/sql');
  console.log('\nCopier et exécuter le script approprié.');
}

// Fonction pour obtenir le schéma d'une table
async function getTableSchema(tableName) {
  console.log(`\n📋 SCHÉMA DE LA TABLE ${tableName}:\n`);
  
  // On ne peut pas faire de requête SQL directe, mais on peut essayer de déduire
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0); // Juste pour obtenir le schéma
    
    if (error) {
      console.log(`Impossible d'obtenir le schéma: ${error.message}`);
    } else {
      console.log('Table existe et est accessible via l\'API');
    }
  } catch (err) {
    console.log(`Erreur: ${err.message}`);
  }
}

// Exécution
async function main() {
  try {
    await checkTableStructure();
    
    // Vérifier spécifiquement call_logs
    await getTableSchema('call_logs');
    
    console.log('\n═══════════════════════════════════════════');
    console.log('Vérification terminée!');
    
  } catch (error) {
    console.error('Erreur fatale:', error.message);
  }
}

main();