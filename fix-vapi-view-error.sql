
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
