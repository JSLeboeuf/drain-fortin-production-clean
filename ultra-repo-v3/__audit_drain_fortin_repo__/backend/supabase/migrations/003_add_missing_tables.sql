-- =====================================================
-- Migration: Add missing tables for VAPI webhook
-- Date: 2025-09-08
-- Description: Creates call_transcripts and tool_calls tables
-- =====================================================

-- Create call_transcripts table
CREATE TABLE IF NOT EXISTS public.call_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    confidence DECIMAL(3, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for faster queries
    CONSTRAINT fk_call_transcripts_call
        FOREIGN KEY (call_id) 
        REFERENCES vapi_calls(call_id) 
        ON DELETE CASCADE
);

-- Create indexes for call_transcripts
CREATE INDEX idx_call_transcripts_call_id ON public.call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_timestamp ON public.call_transcripts(timestamp DESC);
CREATE INDEX idx_call_transcripts_role ON public.call_transcripts(role);

-- Create tool_calls table
CREATE TABLE IF NOT EXISTS public.tool_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) NOT NULL,
    tool_call_id VARCHAR(255) UNIQUE NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    arguments JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_tool_calls_call
        FOREIGN KEY (call_id) 
        REFERENCES vapi_calls(call_id) 
        ON DELETE CASCADE
);

-- Create indexes for tool_calls
CREATE INDEX idx_tool_calls_call_id ON public.tool_calls(call_id);
CREATE INDEX idx_tool_calls_tool_name ON public.tool_calls(tool_name);
CREATE INDEX idx_tool_calls_status ON public.tool_calls(status);
CREATE INDEX idx_tool_calls_timestamp ON public.tool_calls(timestamp DESC);
CREATE INDEX idx_tool_calls_tool_call_id ON public.tool_calls(tool_call_id);

-- Create call_analytics table for performance metrics
CREATE TABLE IF NOT EXISTS public.call_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    total_duration_seconds INTEGER,
    transcription_confidence DECIMAL(3, 2),
    sentiment_score DECIMAL(3, 2),
    keywords TEXT[],
    intent_detected VARCHAR(100),
    conversion_status VARCHAR(50),
    priority_assigned VARCHAR(10),
    sms_sent BOOLEAN DEFAULT FALSE,
    lead_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_call_analytics_call
        FOREIGN KEY (call_id) 
        REFERENCES vapi_calls(call_id) 
        ON DELETE CASCADE
);

-- Create index for analytics queries
CREATE INDEX idx_call_analytics_call_id ON public.call_analytics(call_id);
CREATE INDEX idx_call_analytics_priority ON public.call_analytics(priority_assigned);
CREATE INDEX idx_call_analytics_conversion ON public.call_analytics(conversion_status);
CREATE INDEX idx_call_analytics_created_at ON public.call_analytics(created_at DESC);

-- Create audit_logs table for security and compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit queries
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON public.audit_logs(status);

-- Create RLS policies for security
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for call_transcripts (service role only for now)
CREATE POLICY "Service role can manage call_transcripts" ON public.call_transcripts
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy for tool_calls (service role only for now)
CREATE POLICY "Service role can manage tool_calls" ON public.tool_calls
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy for call_analytics (service role can write, authenticated can read)
CREATE POLICY "Service role can manage call_analytics" ON public.call_analytics
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read call_analytics" ON public.call_analytics
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy for audit_logs (service role only)
CREATE POLICY "Service role can manage audit_logs" ON public.audit_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_call_transcripts_updated_at
    BEFORE UPDATE ON public.call_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_calls_updated_at
    BEFORE UPDATE ON public.tool_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_analytics_updated_at
    BEFORE UPDATE ON public.call_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.call_transcripts TO service_role;
GRANT ALL ON public.tool_calls TO service_role;
GRANT ALL ON public.call_analytics TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

GRANT SELECT ON public.call_analytics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.call_transcripts IS 'Stores conversation transcripts for each VAPI call';
COMMENT ON TABLE public.tool_calls IS 'Tracks function/tool calls made during VAPI conversations';
COMMENT ON TABLE public.call_analytics IS 'Analytics and metrics for call performance and outcomes';
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for all system operations';

COMMENT ON COLUMN public.call_transcripts.confidence IS 'Speech recognition confidence score (0-1)';
COMMENT ON COLUMN public.tool_calls.duration_ms IS 'Execution time in milliseconds';
COMMENT ON COLUMN public.call_analytics.sentiment_score IS 'Sentiment analysis score (-1 to 1)';
COMMENT ON COLUMN public.audit_logs.changes IS 'JSON diff of before/after states for updates';