-- ============================================
-- FIX MISSING TABLES AND CONSTRAINTS
-- Migration: 002_fix_missing_tables
-- ============================================

-- Add missing call_transcripts table (referenced in webhook but not created)
CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    confidence DECIMAL(3,2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing tool_calls table (referenced in webhook but not created)  
CREATE TABLE IF NOT EXISTS tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_call_id VARCHAR(255) NOT NULL,
    arguments JSONB,
    result JSONB,
    executed_at TIMESTAMPTZ,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to vapi_calls (referenced in webhook)
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS call_duration INTEGER;

-- Add proper foreign key constraints
ALTER TABLE call_transcripts 
ADD CONSTRAINT fk_call_transcripts_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE CASCADE;

ALTER TABLE tool_calls 
ADD CONSTRAINT fk_tool_calls_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE CASCADE;

ALTER TABLE sms_logs 
ADD CONSTRAINT fk_sms_logs_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE SET NULL;

-- Fix leads table foreign key
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_call_id_fkey;
ALTER TABLE leads 
ADD CONSTRAINT fk_leads_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE SET NULL;

-- Add data validation constraints
ALTER TABLE vapi_calls ADD CONSTRAINT IF NOT EXISTS chk_vapi_calls_status 
CHECK (status IN ('active', 'completed', 'failed', 'abandoned'));

ALTER TABLE vapi_calls ADD CONSTRAINT IF NOT EXISTS chk_vapi_calls_priority 
CHECK (priority IN ('P1', 'P2', 'P3', 'P4') OR priority IS NULL);

ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS chk_leads_status 
CHECK (status IN ('new', 'contacted', 'qualified', 'quoted', 'scheduled', 'completed', 'cancelled'));

ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS chk_leads_urgency 
CHECK (urgency_level IN ('P1', 'P2', 'P3', 'P4') OR urgency_level IS NULL);

ALTER TABLE sms_logs ADD CONSTRAINT IF NOT EXISTS chk_sms_logs_status 
CHECK (status IN ('pending', 'sent', 'delivered', 'failed'));

-- Create indexes for new tables
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_timestamp ON call_transcripts(timestamp DESC);
CREATE INDEX idx_call_transcripts_call_timestamp ON call_transcripts(call_id, timestamp DESC);

CREATE INDEX idx_tool_calls_call_id ON tool_calls(call_id);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX idx_tool_calls_call_name ON tool_calls(call_id, tool_name);
CREATE INDEX idx_tool_calls_timestamp ON tool_calls(timestamp DESC);

-- Composite indexes for better performance
CREATE INDEX idx_vapi_calls_status_priority ON vapi_calls(status, priority);
CREATE INDEX idx_vapi_calls_started_status ON vapi_calls(started_at DESC, status);
CREATE INDEX idx_vapi_calls_customer_name ON vapi_calls(customer_name) WHERE customer_name IS NOT NULL;

-- Optimize JSONB queries
CREATE INDEX idx_vapi_calls_analysis_service ON vapi_calls 
USING GIN ((analysis->>'service_type')) WHERE analysis IS NOT NULL;

CREATE INDEX idx_vapi_calls_analysis_priority ON vapi_calls 
USING GIN ((analysis->>'priority')) WHERE analysis IS NOT NULL;

-- Add RLS policies for new tables
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to call_transcripts" ON call_transcripts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tool_calls" ON tool_calls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read call_transcripts" ON call_transcripts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read tool_calls" ON tool_calls
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add update triggers for new tables
CREATE TRIGGER update_call_transcripts_updated_at BEFORE UPDATE ON call_transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Data validation function
CREATE OR REPLACE FUNCTION validate_call_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure ended calls have end timestamp
  IF NEW.status = 'completed' AND NEW.ended_at IS NULL THEN
    NEW.ended_at = NOW();
  END IF;
  
  -- Calculate duration if missing
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL 
     AND NEW.call_duration IS NULL THEN
    NEW.call_duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  
  -- Ensure priority is set for completed calls
  IF NEW.status = 'completed' AND NEW.priority IS NULL THEN
    NEW.priority = 'P4'; -- Default to standard priority
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_call_data_trigger
BEFORE INSERT OR UPDATE ON vapi_calls
FOR EACH ROW EXECUTE FUNCTION validate_call_data();

-- Update materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS call_analytics AS
SELECT 
  DATE_TRUNC('hour', started_at) as hour_bucket,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
  COUNT(CASE WHEN priority = 'P1' THEN 1 END) as urgent_calls,
  AVG(call_duration) FILTER (WHERE call_duration IS NOT NULL) as avg_duration,
  array_agg(DISTINCT analysis->>'service_type') FILTER (WHERE analysis->>'service_type' IS NOT NULL) as service_types
FROM vapi_calls
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', started_at)
ORDER BY hour_bucket DESC;

CREATE UNIQUE INDEX idx_call_analytics_hour ON call_analytics(hour_bucket);

-- Function to refresh analytics (call this periodically)
CREATE OR REPLACE FUNCTION refresh_call_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY call_analytics;
END;
$$ LANGUAGE plpgsql;

-- Transaction-safe call processing function
CREATE OR REPLACE FUNCTION process_call_end(
  call_id_param VARCHAR,
  analysis_param JSONB DEFAULT NULL,
  customer_data_param JSONB DEFAULT NULL,
  priority_data_param JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  call_exists BOOLEAN;
BEGIN
  -- Check if call exists
  SELECT EXISTS(SELECT 1 FROM vapi_calls WHERE call_id = call_id_param) INTO call_exists;
  
  IF NOT call_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Call not found');
  END IF;

  -- Update call record
  UPDATE vapi_calls SET
    status = 'completed',
    ended_at = COALESCE(ended_at, NOW()),
    analysis = COALESCE(analysis_param, analysis),
    customer_name = COALESCE(customer_data_param->>'name', customer_name),
    customer_email = COALESCE(customer_data_param->>'email', customer_email),
    address = COALESCE(customer_data_param->>'address', address),
    postal_code = COALESCE(customer_data_param->>'postal_code', postal_code),
    problem_description = COALESCE(customer_data_param->>'description', problem_description),
    priority = COALESCE(priority_data_param->>'priority', priority, 'P4'),
    priority_reason = COALESCE(priority_data_param->>'reason', priority_reason),
    sla_seconds = COALESCE((priority_data_param->>'sla_seconds')::INTEGER, sla_seconds)
  WHERE call_id = call_id_param;

  -- Create lead record if customer data exists and no lead exists yet
  IF customer_data_param->>'name' IS NOT NULL THEN
    INSERT INTO leads (
      call_id, phone_number, name, email, 
      service_type, urgency_level, status,
      address, postal_code, notes
    ) VALUES (
      call_id_param,
      customer_data_param->>'phone',
      customer_data_param->>'name',
      customer_data_param->>'email',
      analysis_param->>'service_type',
      priority_data_param->>'priority',
      'new',
      customer_data_param->>'address',
      customer_data_param->>'postal_code',
      customer_data_param->>'description'
    )
    ON CONFLICT (call_id) DO NOTHING;
  END IF;

  result := jsonb_build_object(
    'success', true, 
    'call_id', call_id_param,
    'updated_at', NOW()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error in process_call_end: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'call_id', call_id_param
    );
END;
$$ LANGUAGE plpgsql;