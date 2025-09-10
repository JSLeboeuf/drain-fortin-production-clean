-- Migration: Add SMS logs table for tracking VAPI SMS alerts
-- Created: 2025-01-09
-- Purpose: Support the new sendSMSAlert function in VAPI webhook

-- Create SMS logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- SMS details
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_type TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Recipients (JSON array)
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_priority ON public.sms_logs(priority);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_phone ON public.sms_logs(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_service_type ON public.sms_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON public.sms_logs(sent_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sms_logs_updated_at ON public.sms_logs;
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON public.sms_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "SMS logs are viewable by authenticated users" ON public.sms_logs;
CREATE POLICY "SMS logs are viewable by authenticated users" 
  ON public.sms_logs FOR SELECT 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "SMS logs are insertable by service role" ON public.sms_logs;
CREATE POLICY "SMS logs are insertable by service role" 
  ON public.sms_logs FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "SMS logs are updatable by service role" ON public.sms_logs;
CREATE POLICY "SMS logs are updatable by service role" 
  ON public.sms_logs FOR UPDATE 
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

-- Comment the table
COMMENT ON TABLE public.sms_logs IS 'Logs of SMS alerts sent by VAPI webhook for Drain Fortin operations';
COMMENT ON COLUMN public.sms_logs.priority IS 'Priority level: P1=Inondation, P2=Municipal, P3=Gainage, P4=Standard';
COMMENT ON COLUMN public.sms_logs.recipients IS 'Array of SMS recipients with delivery status: [{name, phone, success}]';
COMMENT ON COLUMN public.sms_logs.service_type IS 'Type of service requested: debouchage, gainage, etc.';