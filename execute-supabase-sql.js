/**
 * Script d'exécution SQL pour créer les tables Supabase
 * Utilise la clé service_role pour les permissions administratives
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase avec service_role key pour permissions admin
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.hq9GjhaoeJm5YtJPvfXhTC4CWaW-bEG6ESFr5J-8Y1U';

// Créer client Supabase avec permissions admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

async function executeSQLFile() {
  console.log('🚀 Création des tables Supabase...\n');
  
  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'create-supabase-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Séparer les commandes SQL par point-virgule
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 ${sqlCommands.length} commandes SQL à exécuter\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Exécuter chaque commande séparément
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i] + ';';
      
      // Extraire le nom de la table/vue de la commande
      let objectName = 'Commande';
      if (command.includes('CREATE TABLE')) {
        objectName = command.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'Table';
      } else if (command.includes('CREATE INDEX')) {
        objectName = command.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1] || 'Index';
      } else if (command.includes('CREATE OR REPLACE VIEW')) {
        objectName = command.match(/CREATE OR REPLACE VIEW (\w+)/)?.[1] || 'Vue';
      } else if (command.includes('CREATE POLICY')) {
        objectName = 'Policy';
      } else if (command.includes('CREATE TRIGGER')) {
        objectName = command.match(/CREATE TRIGGER (\w+)/)?.[1] || 'Trigger';
      }
      
      try {
        // Utiliser la méthode rpc pour exécuter du SQL brut
        const { data, error } = await supabase.rpc('exec_sql', {
          query: command
        }).catch(async (rpcError) => {
          // Si rpc n'existe pas, essayer directement
          console.log(`⚠️ RPC non disponible, tentative directe...`);
          
          // Pour les tables, on peut vérifier leur existence
          if (command.includes('CREATE TABLE')) {
            const tableName = command.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            if (tableName) {
              // Tester si la table existe
              const { error: testError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
              
              if (!testError || testError.code === '42P01') {
                // Table n'existe pas ou est accessible
                return { data: null, error: testError };
              }
            }
          }
          
          return { data: null, error: rpcError };
        });
        
        if (error && !error.message?.includes('already exists')) {
          throw error;
        }
        
        console.log(`✅ ${objectName} créé/mis à jour`);
        successCount++;
      } catch (err) {
        console.error(`❌ Erreur pour ${objectName}: ${err.message}`);
        errorCount++;
        
        // Continuer même en cas d'erreur (les objets peuvent déjà exister)
        if (!err.message?.includes('already exists') && 
            !err.message?.includes('duplicate') &&
            !err.message?.includes('42P07')) {
          // Erreur non liée à l'existence, on continue quand même
          console.log('   → Continuation malgré l\'erreur\n');
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════');
    console.log(`📊 Résumé de l'exécution:`);
    console.log(`   ✅ Succès: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    
    // Vérifier les tables créées
    console.log('\n🔍 Vérification des tables principales...\n');
    
    const tablesToCheck = ['call_logs', 'leads', 'sms_logs', 'appointments', 'constraints'];
    
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Accessible (${count || 0} lignes)`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n✨ Script terminé!');
    console.log('\nNote: Si certaines tables ne sont pas créées, vous devrez:');
    console.log('1. Aller dans Supabase Dashboard: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu');
    console.log('2. Aller dans SQL Editor');
    console.log('3. Copier le contenu de create-supabase-tables.sql');
    console.log('4. Exécuter directement dans l\'éditeur SQL');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Alternative: Exécution via API REST directe
async function executeViaAPI() {
  console.log('\n🔄 Tentative via API REST directe...\n');
  
  try {
    const sqlContent = fs.readFileSync('create-supabase-tables.sql', 'utf8');
    
    // Utiliser l'API REST de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });
    
    if (response.ok) {
      console.log('✅ SQL exécuté avec succès via API REST!');
    } else {
      const error = await response.text();
      console.log('⚠️ Réponse API:', error);
      
      // Si la fonction RPC n'existe pas, créer manuellement les tables
      console.log('\n📝 Instructions manuelles:');
      console.log('Les tables doivent être créées manuellement dans Supabase.');
      console.log('Copiez le contenu de create-supabase-tables.sql dans le SQL Editor.');
    }
  } catch (error) {
    console.error('❌ Erreur API:', error.message);
  }
}

// Fonction principale
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   CRÉATION DES TABLES SUPABASE            ║');
  console.log('║   Drain Fortin Production                 ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  // Essayer d'abord l'exécution normale
  await executeSQLFile();
  
  // Si nécessaire, essayer via API
  // await executeViaAPI();
}

// Lancer le script
main().catch(console.error);