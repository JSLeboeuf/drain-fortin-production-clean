
-- Migration: Création des tables manquantes pour Drain Fortin
-- Generated: 2025-09-09T17:17:13.246Z


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
  ;


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
  ;


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
  ;


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
  ;

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
