/**
 * Script de création des tables avec la clé service correcte
 * Utilise la vraie clé service_role fournie
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration avec la VRAIE clé service_role
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.ZRUd-6UwptM3w3tZCsm7SPl7-RzMfdEs_giTW9_2N5o';

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

async function createTablesDirectly() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   CRÉATION DIRECTE DES TABLES SUPABASE    ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // 1. Vérifier la connexion
  console.log(`${colors.cyan}🔌 TEST DE CONNEXION${colors.reset}`);
  console.log('─────────────────────────────────');
  
  try {
    // Test simple sur une table qu'on sait exister
    const { data, error } = await supabase
      .from('constraints')
      .select('count(*)', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`${colors.green}✅ Connexion Supabase réussie!${colors.reset}`);
      console.log(`   Table constraints accessible\n`);
    } else {
      console.log(`${colors.yellow}⚠️ Connexion OK mais table constraints inaccessible${colors.reset}\n`);
    }
  } catch (err) {
    console.log(`${colors.red}❌ Erreur de connexion: ${err.message}${colors.reset}\n`);
  }

  // 2. Vérifier l'état des tables
  console.log(`${colors.cyan}📊 ÉTAT ACTUEL DES TABLES${colors.reset}`);
  console.log('─────────────────────────────────');
  
  const tables = {
    'call_logs': false,
    'vapi_calls': false,
    'leads': false,
    'sms_logs': false,
    'appointments': false,
    'alerts': false,
    'clients': false,
    'constraints': false
  };

  for (const table of Object.keys(tables)) {
    const { error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`${colors.green}✅ ${table}: Existe${colors.reset}`);
      tables[table] = true;
    } else {
      console.log(`${colors.red}❌ ${table}: ${error.message}${colors.reset}`);
    }
  }

  // 3. Tenter de créer les tables manquantes via insertion
  console.log(`\n${colors.cyan}🚀 TENTATIVE DE CRÉATION${colors.reset}`);
  console.log('─────────────────────────────────');

  // Test d'insertion dans call_logs
  if (!tables.call_logs) {
    console.log(`\n${colors.yellow}📝 Test d'insertion dans call_logs...${colors.reset}`);
    
    const testCall = {
      call_id: `test_${Date.now()}`,
      phone_number: '514-555-0000',
      status: 'test',
      duration: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('call_logs')
      .insert([testCall])
      .select();
    
    if (error) {
      console.log(`   ${colors.red}❌ call_logs n'existe pas: ${error.message}${colors.reset}`);
      
      // Analyser l'erreur pour comprendre le problème
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`   ${colors.yellow}→ La table call_logs doit être créée manuellement${colors.reset}`);
      } else if (error.message.includes('column')) {
        console.log(`   ${colors.yellow}→ Structure de table incorrecte${colors.reset}`);
      }
    } else {
      console.log(`   ${colors.green}✅ call_logs accessible!${colors.reset}`);
      
      // Nettoyer
      if (data && data[0]) {
        await supabase
          .from('call_logs')
          .delete()
          .eq('id', data[0].id);
      }
    }
  }

  // 4. Générer un script SQL corrigé final
  console.log(`\n${colors.cyan}📄 SCRIPT SQL FINAL${colors.reset}`);
  console.log('─────────────────────────────────');

  const finalSQL = `
-- ═══════════════════════════════════════════════════════════════
-- SCRIPT FINAL DE CRÉATION DES TABLES DRAIN FORTIN
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. NETTOYER LES ERREURS PRÉCÉDENTES
DROP VIEW IF EXISTS vapi_calls CASCADE;
DROP VIEW IF EXISTS sms_messages CASCADE;
DROP TABLE IF EXISTS vapi_calls CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- 2. CRÉER LA TABLE PRINCIPALE call_logs
CREATE TABLE call_logs (
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

-- 3. CRÉER vapi_calls COMME VUE (PAS TABLE!)
CREATE VIEW vapi_calls AS SELECT * FROM call_logs;

-- 4. CRÉER leads
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'new',
    urgency_level VARCHAR(10),
    service_type VARCHAR(100),
    estimated_quote DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CRÉER sms_logs
CREATE TABLE sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_phone VARCHAR(50) NOT NULL,
    sender_phone VARCHAR(50) DEFAULT '+14502803222',
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(10),
    call_id VARCHAR(255),
    lead_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CRÉER sms_messages COMME VUE
CREATE VIEW sms_messages AS SELECT * FROM sms_logs;

-- 7. CRÉER appointments
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID,
    call_id VARCHAR(255),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    service_type VARCHAR(100),
    technician_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRÉER alerts
CREATE TABLE alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(10),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CRÉER clients
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(100),
    type VARCHAR(50) DEFAULT 'residential',
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ACTIVER ROW LEVEL SECURITY
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 11. CRÉER DES POLICIES OUVERTES (DÉVELOPPEMENT)
CREATE POLICY "Enable all" ON call_logs FOR ALL USING (true);
CREATE POLICY "Enable all" ON leads FOR ALL USING (true);
CREATE POLICY "Enable all" ON sms_logs FOR ALL USING (true);
CREATE POLICY "Enable all" ON appointments FOR ALL USING (true);
CREATE POLICY "Enable all" ON alerts FOR ALL USING (true);
CREATE POLICY "Enable all" ON clients FOR ALL USING (true);

-- 12. VÉRIFICATION FINALE
SELECT 
    'Tables créées avec succès!' as message,
    COUNT(*) as nombre_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_logs', 'leads', 'sms_logs', 'appointments', 'alerts', 'clients');
`;

  // Sauvegarder le script
  const fs = require('fs');
  fs.writeFileSync('FINAL-CREATE-TABLES.sql', finalSQL);
  
  console.log(`${colors.green}✅ Script sauvegardé: FINAL-CREATE-TABLES.sql${colors.reset}`);

  // 5. Instructions finales
  console.log(`\n${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}📋 INSTRUCTIONS FINALES${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}LIMITATION:${colors.reset} Le SDK JavaScript ne peut pas créer de tables.`);
  console.log('Seules les opérations CRUD (INSERT, SELECT, UPDATE, DELETE) sont possibles.\n');
  
  console.log(`${colors.green}SOLUTION:${colors.reset} Exécuter le SQL directement dans Supabase:\n`);
  
  console.log('1️⃣ Ouvrir le SQL Editor:');
  console.log(`   ${colors.blue}https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/sql${colors.reset}\n`);
  
  console.log('2️⃣ Copier TOUT le contenu de:');
  console.log(`   ${colors.green}FINAL-CREATE-TABLES.sql${colors.reset}\n`);
  
  console.log('3️⃣ Coller dans l\'éditeur SQL et cliquer "RUN"\n');
  
  console.log('4️⃣ Vérifier avec:');
  console.log(`   ${colors.cyan}node test-full-stack.js${colors.reset}\n`);

  // Afficher un résumé
  const missingTables = Object.entries(tables)
    .filter(([_, exists]) => !exists)
    .map(([name, _]) => name);
  
  if (missingTables.length > 0) {
    console.log(`${colors.yellow}Tables à créer: ${missingTables.join(', ')}${colors.reset}`);
  } else {
    console.log(`${colors.green}🎉 Toutes les tables existent déjà!${colors.reset}`);
  }
}

// Exécution
async function main() {
  try {
    await createTablesDirectly();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('Script terminé avec succès!');
    
  } catch (error) {
    console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
  }
}

main();