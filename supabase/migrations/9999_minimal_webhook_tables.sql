-- Migration: Minimal webhook tables (idempotent)
-- Date: 2024-09-12
-- Purpose: Create minimal tables for webhook operations with proper RLS

-- ============================================
-- 1. CALL_LOGS TABLE (Idempotent)
-- ============================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT,
  phone_number TEXT,
  duration INTEGER,
  status TEXT,
  transcript JSONB,
  summary TEXT,
  analysis JSONB,
  tool_calls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Service role full access on call_logs" ON call_logs;
DROP POLICY IF EXISTS "Authenticated read access on call_logs" ON call_logs;

-- Create minimal RLS policies
CREATE POLICY "Service role full access on call_logs" ON call_logs
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated read access on call_logs" ON call_logs
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- ============================================
-- 2. SMS_LOGS TABLE (Idempotent)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  service_type TEXT,
  message TEXT,
  recipients JSONB
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_priority ON sms_logs(priority);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_phone ON sms_logs(customer_phone);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Service role full access on sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "Authenticated read access on sms_logs" ON sms_logs;

-- Create minimal RLS policies
CREATE POLICY "Service role full access on sms_logs" ON sms_logs
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated read access on sms_logs" ON sms_logs
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- ============================================
-- 3. AVAILABILITY TABLE (Idempotent) - for legacy compatibility
-- ============================================
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on availability" ON availability;
DROP POLICY IF EXISTS "Anon read access on availability" ON availability;

CREATE POLICY "Service role full access on availability" ON availability
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Anon read access on availability" ON availability
  FOR SELECT 
  USING (true); -- Public read for availability checking

-- ============================================
-- 4. APPOINTMENTS TABLE (Idempotent) - for legacy compatibility
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_phone TEXT,
  service_type TEXT,
  appointment_date DATE,
  appointment_time TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON appointments(customer_phone);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on appointments" ON appointments;

CREATE POLICY "Service role full access on appointments" ON appointments
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 5. GRANT PERMISSIONS (Idempotent)
-- ============================================
-- Ensure service_role has full access
GRANT ALL ON call_logs TO service_role;
GRANT ALL ON sms_logs TO service_role;
GRANT ALL ON availability TO service_role;
GRANT ALL ON appointments TO service_role;

-- Ensure authenticated users can read logs
GRANT SELECT ON call_logs TO authenticated;
GRANT SELECT ON sms_logs TO authenticated;

-- Ensure anon can check availability (for public API)
GRANT SELECT ON availability TO anon;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE call_logs IS 'Stores VAPI webhook call logs and reports';
COMMENT ON TABLE sms_logs IS 'Stores SMS alerts sent via webhook with E.164 phone numbers';
COMMENT ON TABLE availability IS 'Legacy table for appointment availability checking';
COMMENT ON TABLE appointments IS 'Legacy table for appointment bookings';

COMMENT ON COLUMN sms_logs.priority IS 'Priority levels: P1 (urgent), P2 (high), P3 (normal), P4 (low)';
COMMENT ON COLUMN sms_logs.recipients IS 'JSONB array of {name, phone, success} objects';

-- ============================================
-- NOTE: This migration is IDEMPOTENT and PRODUCTION-SAFE
-- It uses CREATE IF NOT EXISTS and DROP POLICY IF EXISTS
-- No destructive operations (no DROP TABLE, no data loss)
-- ============================================