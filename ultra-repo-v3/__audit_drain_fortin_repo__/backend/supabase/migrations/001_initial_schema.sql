-- ============================================
-- DRAIN FORTIN PRODUCTION DATABASE SCHEMA
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- VAPI CALLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vapi_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) UNIQUE NOT NULL,
    assistant_id VARCHAR(255),
    phone_number VARCHAR(50),
    customer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration INTEGER,
    recording_url TEXT,
    transcript TEXT,
    analysis JSONB,
    priority VARCHAR(10),
    priority_reason TEXT,
    sla_seconds INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vapi_calls_status ON vapi_calls(status);
CREATE INDEX idx_vapi_calls_priority ON vapi_calls(priority);
CREATE INDEX idx_vapi_calls_phone ON vapi_calls(phone_number);
CREATE INDEX idx_vapi_calls_started ON vapi_calls(started_at DESC);

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) REFERENCES vapi_calls(call_id),
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    service_type VARCHAR(100),
    urgency_level VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    estimated_value DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(50) DEFAULT 'vapi',
    assigned_to VARCHAR(255),
    scheduled_date TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_phone ON leads(phone_number);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ============================================
-- SMS LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) REFERENCES vapi_calls(call_id),
    to_number VARCHAR(50) NOT NULL,
    from_number VARCHAR(50),
    message TEXT NOT NULL,
    priority VARCHAR(10),
    status VARCHAR(50) DEFAULT 'pending',
    twilio_sid VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_priority ON sms_logs(priority);
CREATE INDEX idx_sms_logs_created ON sms_logs(created_at DESC);

-- ============================================
-- SYSTEM CONSTRAINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    constraint_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    condition TEXT NOT NULL,
    action VARCHAR(50),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default constraints
INSERT INTO system_constraints (constraint_id, name, category, condition, action, priority) VALUES
('C001', 'Minimum 350$ global', 'pricing', 'amount >= 350', 'validate', 100),
('C002', 'Refuser fosses septiques', 'service', 'service LIKE ''%fosse%''', 'reject', 90),
('C003', 'Refuser piscines', 'service', 'service LIKE ''%piscine%''', 'reject', 90),
('C004', 'Surcharge Rive-Sud', 'location', 'city IN (''Brossard'', ''Longueuil'', ''Saint-Lambert'')', 'add_fee:100', 80),
('C005', 'Urgence P1 - Inondation', 'priority', 'description LIKE ''%inondation%''', 'set_priority:P1', 95),
('C006', 'Urgence P2 - Municipal', 'priority', 'customer_type = ''municipal''', 'set_priority:P2', 85);

-- ============================================
-- PRICING RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(100) NOT NULL,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    base_price DECIMAL(10,2),
    unit VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO pricing_rules (service_type, min_price, max_price, base_price, unit) VALUES
('debouchage_camera', 350, 650, 350, 'service'),
('racines_alesage', 450, 750, 450, 'service'),
('gainage_installation', 3900, 8000, 3900, 'service'),
('drain_francais', 500, 800, 500, 'meter');

-- ============================================
-- ANALYTICS VIEWS
-- ============================================

-- Daily call summary
CREATE OR REPLACE VIEW daily_call_summary AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN priority = 'P1' THEN 1 END) as p1_calls,
    COUNT(CASE WHEN priority = 'P2' THEN 1 END) as p2_calls,
    AVG(duration) as avg_duration,
    COUNT(DISTINCT phone_number) as unique_callers
FROM vapi_calls
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Priority distribution
CREATE OR REPLACE VIEW priority_distribution AS
SELECT 
    priority,
    COUNT(*) as count,
    AVG(duration) as avg_duration,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM vapi_calls
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY priority;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_vapi_calls_updated_at BEFORE UPDATE ON vapi_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_system_constraints_updated_at BEFORE UPDATE ON system_constraints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE vapi_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to vapi_calls" ON vapi_calls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to sms_logs" ON sms_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users read access
CREATE POLICY "Authenticated users can read vapi_calls" ON vapi_calls
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read leads" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_vapi_calls_analysis ON vapi_calls USING GIN (analysis);
CREATE INDEX idx_leads_metadata ON leads USING GIN (metadata);
CREATE INDEX idx_sms_logs_metadata ON sms_logs USING GIN (metadata);