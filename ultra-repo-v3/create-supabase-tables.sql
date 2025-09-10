-- Script de création des tables manquantes pour Drain Fortin
-- Date: 2025-09-09
-- Description: Tables nécessaires pour le système complet

-- Table call_logs pour enregistrer tous les appels VAPI
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
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_phone ON call_logs(customer_phone);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

-- Table leads pour gérer les prospects
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    service_type VARCHAR(100),
    urgency_level VARCHAR(10), -- P1, P2, P3, P4
    estimated_quote DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, converted, lost
    source VARCHAR(50), -- vapi, website, referral
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_urgency ON leads(urgency_level);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Table sms_logs pour tracer les SMS envoyés
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_phone VARCHAR(50) NOT NULL,
    sender_phone VARCHAR(50),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
    provider VARCHAR(50), -- twilio, vapi, etc
    priority VARCHAR(10), -- P1, P2, P3, P4
    call_id VARCHAR(255), -- Référence à call_logs
    lead_id UUID REFERENCES leads(id),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_call_id ON sms_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Table call_transcripts pour stocker les transcriptions détaillées
CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    speaker VARCHAR(50), -- assistant, customer
    message TEXT,
    timestamp TIMESTAMPTZ,
    confidence DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_id ON call_transcripts(call_id);

-- Table appointments pour gérer les rendez-vous
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    call_id VARCHAR(255),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    service_type VARCHAR(100),
    estimated_duration INTEGER, -- en minutes
    technician_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Vue pour dashboard analytique
CREATE OR REPLACE VIEW call_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_calls,
    AVG(duration_seconds) as avg_duration,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls
FROM call_logs
GROUP BY DATE(created_at);

-- Vue pour conversion des leads
CREATE OR REPLACE VIEW lead_conversion AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
    COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
    AVG(estimated_quote) as avg_quote_value
FROM leads
GROUP BY DATE(created_at);

-- Fonction trigger pour update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger aux tables avec updated_at
CREATE TRIGGER update_call_logs_updated_at BEFORE UPDATE ON call_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies pour accès public (ajuster selon besoins)
CREATE POLICY "Enable read access for all users" ON call_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON call_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON leads
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON leads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON leads
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON sms_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON sms_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON appointments
    FOR ALL USING (true);

-- Données de test initiales
INSERT INTO leads (phone, name, service_type, urgency_level, status, source)
VALUES 
    ('514-555-0001', 'Test Client 1', 'Débouchage', 'P2', 'new', 'vapi'),
    ('450-555-0002', 'Test Client 2', 'Inspection caméra', 'P3', 'qualified', 'website')
ON CONFLICT DO NOTHING;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Tables créées avec succès:';
    RAISE NOTICE '- call_logs';
    RAISE NOTICE '- leads';
    RAISE NOTICE '- sms_logs';
    RAISE NOTICE '- call_transcripts';
    RAISE NOTICE '- appointments';
    RAISE NOTICE '- Vues analytiques';
    RAISE NOTICE '- Triggers et RLS configurés';
END $$;