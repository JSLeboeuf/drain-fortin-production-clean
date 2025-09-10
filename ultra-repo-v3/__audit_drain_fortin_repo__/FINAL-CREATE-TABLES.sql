
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
