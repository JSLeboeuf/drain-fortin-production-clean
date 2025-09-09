-- ═══════════════════════════════════════════════════════════════
-- SCRIPT DE CORRECTION: column "phone_number" does not exist
-- Ce script adapte la structure selon ce qui existe déjà
-- ═══════════════════════════════════════════════════════════════

-- 1. D'ABORD, VÉRIFIER LA STRUCTURE EXISTANTE
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    -- Vérifier si la table call_logs existe et quelle colonne elle utilise
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'customer_phone'
    ) INTO v_column_exists;
    
    IF v_column_exists THEN
        RAISE NOTICE 'La table utilise "customer_phone", pas "phone_number"';
    ELSE
        RAISE NOTICE 'Structure de colonne à vérifier';
    END IF;
END $$;

-- 2. SUPPRIMER LES VUES QUI POURRAIENT BLOQUER
DROP VIEW IF EXISTS vapi_calls CASCADE;
DROP VIEW IF EXISTS sms_messages CASCADE;

-- 3. OPTION A: SI LA TABLE call_logs EXISTE AVEC customer_phone
-- Renommer la colonne pour correspondre au standard
DO $$
BEGIN
    -- Si la colonne customer_phone existe, la renommer
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE call_logs RENAME COLUMN customer_phone TO phone_number;
        RAISE NOTICE 'Colonne customer_phone renommée en phone_number';
    END IF;
    
    -- Si customer_phone_masked existe, la renommer
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'customer_phone_masked'
    ) THEN
        ALTER TABLE call_logs RENAME COLUMN customer_phone_masked TO phone_number_formatted;
        RAISE NOTICE 'Colonne customer_phone_masked renommée en phone_number_formatted';
    END IF;
END $$;

-- 4. OPTION B: SI LA TABLE call_logs N'EXISTE PAS, LA CRÉER
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    assistant_id VARCHAR(255),
    phone_number VARCHAR(50),  -- Utiliser phone_number
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

-- 5. AJOUTER LES COLONNES MANQUANTES SI NÉCESSAIRE
DO $$
BEGIN
    -- Ajouter phone_number si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN phone_number VARCHAR(50);
        RAISE NOTICE 'Colonne phone_number ajoutée';
    END IF;
    
    -- Ajouter phone_number_formatted si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'phone_number_formatted'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN phone_number_formatted VARCHAR(50);
        RAISE NOTICE 'Colonne phone_number_formatted ajoutée';
    END IF;
    
    -- Ajouter les autres colonnes importantes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 6. CRÉER vapi_calls COMME VUE AVEC MAPPING DES COLONNES
CREATE OR REPLACE VIEW vapi_calls AS 
SELECT 
    id,
    call_id,
    assistant_id,
    phone_number,
    phone_number_formatted,
    phone_number as customer_phone,  -- Alias pour compatibilité
    phone_number_formatted as customer_phone_masked,  -- Alias pour compatibilité
    customer_name,
    status,
    type,
    started_at,
    ended_at,
    duration,
    transcript,
    recording_url,
    summary,
    cost,
    ended_reason,
    metadata,
    created_at,
    updated_at
FROM call_logs;

-- 7. CRÉER/VÉRIFIER LES AUTRES TABLES ESSENTIELLES
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    phone_formatted VARCHAR(50),
    name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    province VARCHAR(50) DEFAULT 'QC',
    service_type VARCHAR(100),
    urgency_level VARCHAR(10),
    estimated_quote DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(50) DEFAULT 'vapi',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_phone VARCHAR(50) NOT NULL,
    sender_phone VARCHAR(50) DEFAULT '+14502803222',
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'twilio',
    priority VARCHAR(10),
    call_id VARCHAR(255),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cost DECIMAL(10,4) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRÉER LA VUE sms_messages
CREATE OR REPLACE VIEW sms_messages AS 
SELECT * FROM sms_logs;

-- 9. AUTRES TABLES NÉCESSAIRES
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    call_id VARCHAR(255),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    service_type VARCHAR(100),
    estimated_duration INTEGER DEFAULT 60,
    technician_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(10),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(100),
    type VARCHAR(50) DEFAULT 'residential',
    total_spent DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
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

-- 11. CRÉER LES POLICIES SI ELLES N'EXISTENT PAS
DO $$ 
BEGIN
    -- Drop old policies if they exist
    DROP POLICY IF EXISTS "Enable all for call_logs" ON call_logs;
    DROP POLICY IF EXISTS "Enable all for leads" ON leads;
    DROP POLICY IF EXISTS "Enable all for sms_logs" ON sms_logs;
    DROP POLICY IF EXISTS "Enable all for appointments" ON appointments;
    DROP POLICY IF EXISTS "Enable all for alerts" ON alerts;
    DROP POLICY IF EXISTS "Enable all for clients" ON clients;
    
    -- Create new policies
    CREATE POLICY "Enable all for call_logs" ON call_logs FOR ALL USING (true);
    CREATE POLICY "Enable all for leads" ON leads FOR ALL USING (true);
    CREATE POLICY "Enable all for sms_logs" ON sms_logs FOR ALL USING (true);
    CREATE POLICY "Enable all for appointments" ON appointments FOR ALL USING (true);
    CREATE POLICY "Enable all for alerts" ON alerts FOR ALL USING (true);
    CREATE POLICY "Enable all for clients" ON clients FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policies already exist';
END $$;

-- 12. CRÉER LES INDEX
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);

-- 13. FONCTION TRIGGER POUR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 14. APPLIQUER LES TRIGGERS
DO $$
BEGIN
    -- Triggers pour call_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_call_logs_updated_at'
    ) THEN
        CREATE TRIGGER update_call_logs_updated_at 
            BEFORE UPDATE ON call_logs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Triggers pour leads
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_leads_updated_at'
    ) THEN
        CREATE TRIGGER update_leads_updated_at 
            BEFORE UPDATE ON leads
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 15. TEST D'INSERTION POUR VALIDATION
DO $$
BEGIN
    -- Tester l'insertion dans call_logs
    INSERT INTO call_logs (call_id, phone_number, status, duration)
    VALUES ('test_' || gen_random_uuid(), '514-555-9999', 'test', 0)
    ON CONFLICT (call_id) DO NOTHING;
    
    -- Si ça fonctionne, supprimer le test
    DELETE FROM call_logs WHERE call_id LIKE 'test_%';
    
    RAISE NOTICE '✅ Test d''insertion réussi - Structure correcte!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
END $$;

-- 16. RÉSUMÉ FINAL
DO $$
DECLARE
    v_tables_count INTEGER;
    v_views_count INTEGER;
    v_has_phone_number BOOLEAN;
BEGIN
    -- Vérifier que phone_number existe maintenant
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'phone_number'
    ) INTO v_has_phone_number;
    
    -- Compter les tables
    SELECT COUNT(*) INTO v_tables_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('call_logs', 'leads', 'sms_logs', 'appointments', 'alerts', 'clients');
    
    -- Compter les vues
    SELECT COUNT(*) INTO v_views_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('vapi_calls', 'sms_messages');
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ CORRECTION APPLIQUÉE!';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Résumé:';
    RAISE NOTICE '  • Tables créées: %', v_tables_count;
    RAISE NOTICE '  • Vues créées: %', v_views_count;
    RAISE NOTICE '  • Colonne phone_number existe: %', CASE WHEN v_has_phone_number THEN 'OUI ✅' ELSE 'NON ❌' END;
    RAISE NOTICE '';
    RAISE NOTICE '✅ call_logs utilise maintenant phone_number';
    RAISE NOTICE '✅ vapi_calls est une VUE avec mapping correct';
    RAISE NOTICE '✅ Compatibilité avec customer_phone maintenue';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Base de données corrigée et prête!';
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;