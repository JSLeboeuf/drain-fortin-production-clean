-- Initial schema for Drain Fortin Production
-- Version 1.0.1

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    duration INTEGER DEFAULT 0,
    status VARCHAR(50),
    transcript JSONB,
    summary TEXT,
    analysis JSONB,
    tool_calls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    service_type VARCHAR(100),
    preferred_date DATE,
    preferred_time TIME,
    urgency VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability table
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    available BOOLEAN DEFAULT true,
    technician_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, time_slot, technician_id)
);

-- Create rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_ip VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_ip, endpoint, window_start)
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_call_logs_phone ON public.call_logs(phone_number);
CREATE INDEX idx_call_logs_created ON public.call_logs(created_at DESC);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_date ON public.appointments(preferred_date);
CREATE INDEX idx_availability_date ON public.availability(date, available);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);
CREATE INDEX idx_analytics_event ON public.analytics(event_type, created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role has full access to call_logs" ON public.call_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to appointments" ON public.appointments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to availability" ON public.availability
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to analytics" ON public.analytics
    FOR ALL USING (auth.role() = 'service_role');

-- Cleanup function for old rate limits
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON public.analytics TO anon;