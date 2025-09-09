/**
 * Script de création directe des tables via l'API Supabase
 * Utilise des requêtes HTTP directes
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4NDk4MSwiZXhwIjoyMDYyNzYwOTgxfQ.hq9GjhaoeJm5YtJPvfXhTC4CWaW-bEG6ESFr5J-8Y1U';

// Tables SQL simplifiées pour création via API
const tables = {
  call_logs: `
    CREATE TABLE IF NOT EXISTS call_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      call_id VARCHAR(255) UNIQUE NOT NULL,
      assistant_id VARCHAR(255),
      customer_phone VARCHAR(50),
      customer_phone_masked VARCHAR(50),
      customer_name VARCHAR(255),
      status VARCHAR(50),
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      duration_seconds INTEGER,
      transcript TEXT,
      recording_url TEXT,
      summary TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `,
  leads: `
    CREATE TABLE IF NOT EXISTS leads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      phone VARCHAR(50) NOT NULL,
      name VARCHAR(255),
      email VARCHAR(255),
      address TEXT,
      city VARCHAR(100),
      postal_code VARCHAR(20),
      service_type VARCHAR(100),
      urgency_level VARCHAR(10),
      estimated_quote DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'new',
      source VARCHAR(50),
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `,
  sms_logs: `
    CREATE TABLE IF NOT EXISTS sms_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      recipient_phone VARCHAR(50) NOT NULL,
      sender_phone VARCHAR(50),
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      provider VARCHAR(50),
      priority VARCHAR(10),
      call_id VARCHAR(255),
      lead_id UUID,
      error_message TEXT,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `,
  appointments: `
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      lead_id UUID,
      call_id VARCHAR(255),
      scheduled_date DATE NOT NULL,
      scheduled_time TIME NOT NULL,
      service_type VARCHAR(100),
      estimated_duration INTEGER,
      technician_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'scheduled',
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
};

async function createTablesViaSQL() {
  console.log('🚀 Création des tables via SQL Editor API...\n');
  
  for (const [tableName, sql] of Object.entries(tables)) {
    console.log(`📋 Création de la table ${tableName}...`);
    
    try {
      // Essayer via l'endpoint SQL direct (si disponible)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (response.ok) {
        console.log(`✅ Table ${tableName} créée`);
      } else {
        const error = await response.text();
        console.log(`⚠️ ${tableName}: ${error}`);
      }
    } catch (error) {
      console.log(`❌ Erreur ${tableName}: ${error.message}`);
    }
  }
}

// Alternative: Créer via migrations locales
async function generateMigration() {
  console.log('\n📝 Génération du fichier de migration...\n');
  
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const migrationPath = `supabase/migrations/${timestamp}_create_missing_tables.sql`;
  
  // Créer le dossier migrations s'il n'existe pas
  if (!fs.existsSync('supabase/migrations')) {
    fs.mkdirSync('supabase/migrations', { recursive: true });
  }
  
  // Contenu complet de la migration
  const migrationContent = `
-- Migration: Création des tables manquantes pour Drain Fortin
-- Generated: ${new Date().toISOString()}

${Object.values(tables).join(';\n\n')};

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_date);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Allow public read" ON call_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON call_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read" ON leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON leads FOR UPDATE USING (true);
CREATE POLICY "Allow public read" ON sms_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON sms_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all" ON appointments FOR ALL USING (true);
`;
  
  fs.writeFileSync(migrationPath, migrationContent);
  console.log(`✅ Migration créée: ${migrationPath}`);
  
  return migrationPath;
}

// Test direct des tables
async function testTables() {
  console.log('\n🔍 Test des tables existantes...\n');
  
  const tablesToTest = ['call_logs', 'leads', 'sms_logs', 'appointments', 'constraints'];
  
  for (const table of tablesToTest) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Table ${table}: Accessible`);
      } else if (response.status === 404 || response.status === 400) {
        console.log(`❌ Table ${table}: N'existe pas`);
      } else {
        console.log(`⚠️ Table ${table}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Table ${table}: Erreur ${error.message}`);
    }
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   CRÉATION DES TABLES SUPABASE (API)      ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  // Test d'abord les tables existantes
  await testTables();
  
  // Générer la migration
  const migrationFile = await generateMigration();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('📋 INSTRUCTIONS POUR FINALISER:');
  console.log('═══════════════════════════════════════════\n');
  console.log('Les tables doivent être créées manuellement:');
  console.log('\n1. OPTION A - Via Supabase Dashboard:');
  console.log('   - Aller sur: https://supabase.com/dashboard/project/phiduqxcufdmgjvdipyu/sql');
  console.log('   - Copier le contenu de: create-supabase-tables.sql');
  console.log('   - Coller dans l\'éditeur SQL');
  console.log('   - Cliquer sur "Run"');
  
  console.log('\n2. OPTION B - Via Supabase CLI:');
  console.log('   - Installer Supabase CLI si nécessaire');
  console.log('   - Exécuter: npx supabase db push');
  console.log(`   - Migration créée: ${migrationFile}`);
  
  console.log('\n3. Une fois les tables créées:');
  console.log('   - Relancer: node test-full-stack.js');
  console.log('   - Vérifier que toutes les tables sont ✅');
}

main().catch(console.error);