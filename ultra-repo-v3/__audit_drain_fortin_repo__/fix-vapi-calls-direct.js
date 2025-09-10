/**
 * Script de connexion directe à Supabase pour corriger vapi_calls
 * Utilise la clé service_role pour les permissions administratives
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration avec service_role key
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.hq9GjhaoeJm5YtJPvfXhTC4CWaW-bEG6ESFr5J-8Y1U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

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

async function checkAndFixTables() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   CORRECTION AUTOMATIQUE SUPABASE         ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // 1. Vérifier l'état actuel
  console.log(`${colors.cyan}📊 VÉRIFICATION DE L'ÉTAT ACTUEL${colors.reset}`);
  console.log('─────────────────────────────────');
  
  const tablesToCheck = [
    'call_logs',
    'vapi_calls', 
    'leads',
    'sms_logs',
    'appointments',
    'alerts',
    'clients',
    'constraints'
  ];

  const status = {};
  
  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${colors.red}❌ ${table}: ${error.message}${colors.reset}`);
        status[table] = false;
      } else {
        console.log(`${colors.green}✅ ${table}: Existe${colors.reset}`);
        status[table] = true;
      }
    } catch (err) {
      console.log(`${colors.red}❌ ${table}: Erreur${colors.reset}`);
      status[table] = false;
    }
  }

  // 2. Créer une fonction RPC pour exécuter du SQL
  console.log(`\n${colors.cyan}🔧 TENTATIVE DE CRÉATION VIA API${colors.reset}`);
  console.log('─────────────────────────────────');

  // Si vapi_calls existe mais n'est pas une vue, on doit d'abord la supprimer
  if (status.vapi_calls && !status.call_logs) {
    console.log(`${colors.yellow}⚠️ vapi_calls existe mais pas call_logs${colors.reset}`);
    console.log('   → Renommer vapi_calls en call_logs');
    
    // On ne peut pas faire de DDL via le SDK, mais on peut créer les données
  }

  // 3. Utiliser l'approche CRUD pour créer les structures
  console.log(`\n${colors.cyan}🚀 CRÉATION DES TABLES MANQUANTES${colors.reset}`);
  console.log('─────────────────────────────────');

  // Tester si on peut insérer dans les tables
  const testData = {
    call_logs: {
      call_id: `test_${Date.now()}`,
      phone_number: '514-555-0000',
      status: 'test',
      duration: 0
    },
    leads: {
      phone: '514-555-0001',
      name: 'Test Lead',
      status: 'new',
      city: 'Montréal'
    },
    sms_logs: {
      recipient_phone: '514-555-0002',
      message: 'Test SMS',
      status: 'pending'
    }
  };

  // Essayer d'insérer puis supprimer pour tester
  for (const [table, data] of Object.entries(testData)) {
    if (!status[table]) {
      console.log(`\n${colors.yellow}📝 Tentative de création de ${table}...${colors.reset}`);
      
      try {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([data])
          .select();
        
        if (error) {
          console.log(`   ${colors.red}❌ Impossible de créer ${table}: ${error.message}${colors.reset}`);
          
          // Si c'est une erreur de colonne, afficher les détails
          if (error.message.includes('column')) {
            console.log(`   ${colors.yellow}→ Structure incorrecte détectée${colors.reset}`);
          }
        } else {
          console.log(`   ${colors.green}✅ ${table} accessible!${colors.reset}`);
          
          // Nettoyer les données de test
          if (inserted && inserted[0]) {
            await supabase
              .from(table)
              .delete()
              .eq('id', inserted[0].id);
          }
        }
      } catch (err) {
        console.log(`   ${colors.red}❌ Erreur: ${err.message}${colors.reset}`);
      }
    }
  }

  // 4. Générer le script SQL de correction
  console.log(`\n${colors.cyan}📄 GÉNÉRATION DU SCRIPT SQL CORRECT${colors.reset}`);
  console.log('─────────────────────────────────');

  const sqlFix = `
-- Script de correction pour l'erreur "vapi_calls is not a view"
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer les objets conflictuels
DROP VIEW IF EXISTS vapi_calls CASCADE;
DROP TABLE IF EXISTS vapi_calls CASCADE;

-- 2. S'assurer que call_logs existe avec la bonne structure
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    assistant_id VARCHAR(255),
    phone_number VARCHAR(50),
    phone_number_formatted VARCHAR(50),
    customer_name VARCHAR(255),
    status VARCHAR(50),
    type VARCHAR(50) DEFAULT 'inbound',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration INTEGER DEFAULT 0,
    transcript TEXT,
    recording_url TEXT,
    summary TEXT,
    cost DECIMAL(10,4) DEFAULT 0,
    ended_reason VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer vapi_calls comme une vraie VUE
CREATE VIEW vapi_calls AS
SELECT * FROM call_logs;

-- 4. Créer les autres tables si elles n'existent pas
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activer RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- 6. Créer des policies ouvertes pour développement
CREATE POLICY "Enable all for call_logs" ON call_logs FOR ALL USING (true);
CREATE POLICY "Enable all for leads" ON leads FOR ALL USING (true);
CREATE POLICY "Enable all for sms_logs" ON sms_logs FOR ALL USING (true);

-- 7. Vérification
SELECT 'Tables créées avec succès!' as message;
`;

  // Sauvegarder le script
  const fs = require('fs');
  fs.writeFileSync('fix-vapi-view-error.sql', sqlFix);
  console.log(`${colors.green}✅ Script SQL sauvegardé: fix-vapi-view-error.sql${colors.reset}`);

  // 5. Instructions finales
  console.log(`\n${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}📋 INSTRUCTIONS POUR FINALISER${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);

  console.log('Le SDK Supabase ne peut pas exécuter de DDL (CREATE TABLE, etc.)');
  console.log('Vous devez utiliser le SQL Editor:\n');
  
  console.log(`${colors.yellow}1. Ouvrir Supabase SQL Editor:${colors.reset}`);
  console.log('   https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/sql\n');
  
  console.log(`${colors.yellow}2. Copier et exécuter ce script:${colors.reset}`);
  console.log('   fix-vapi-view-error.sql\n');
  
  console.log(`${colors.yellow}3. Ou utiliser Supabase CLI:${colors.reset}`);
  console.log('   npx supabase db push --db-url postgresql://postgres:[password]@db.phiduqxcufdmgjvdipyu.supabase.co:5432/postgres\n');

  // 6. Alternative: Utiliser fetch pour l'API REST
  console.log(`${colors.cyan}🌐 TENTATIVE VIA API REST${colors.reset}`);
  console.log('─────────────────────────────────');

  try {
    // Tenter de créer une fonction RPC exec_sql
    const createRpcSql = `
      CREATE OR REPLACE FUNCTION exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // On ne peut pas créer la fonction directement, mais on peut essayer
    console.log(`${colors.yellow}⚠️ Création de fonction RPC non supportée via SDK${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ ${error.message}${colors.reset}`);
  }

  return status;
}

// Fonction pour tester après correction
async function testAfterFix() {
  console.log(`\n${colors.cyan}🧪 TEST APRÈS CORRECTION${colors.reset}`);
  console.log('─────────────────────────────────');

  const tables = ['call_logs', 'vapi_calls', 'leads', 'sms_logs'];
  let allGood = true;

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.log(`${colors.red}❌ ${table}: ${error.message}${colors.reset}`);
      allGood = false;
    } else {
      console.log(`${colors.green}✅ ${table}: OK${colors.reset}`);
    }
  }

  if (allGood) {
    console.log(`\n${colors.green}🎉 Toutes les tables sont fonctionnelles!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Certaines tables nécessitent encore une correction manuelle${colors.reset}`);
  }
}

// Exécution principale
async function main() {
  try {
    const status = await checkAndFixTables();
    
    // Si toutes les tables critiques existent, on teste
    if (status.call_logs || status.vapi_calls) {
      await testAfterFix();
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('Script terminé. Suivez les instructions ci-dessus.');
    
  } catch (error) {
    console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
  }
}

main();