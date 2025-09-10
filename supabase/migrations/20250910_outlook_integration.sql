-- =====================================================
-- OUTLOOK INTEGRATION - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Migration for Drain Fortin Outlook Integration
-- Version: 1.0.0
-- Date: 2025-09-10
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- OUTLOOK AUTHENTICATION
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scope TEXT,
    tenant_id VARCHAR(255),
    client_id VARCHAR(255),
    encrypted_credentials JSONB,
    last_sync TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outlook_auth_user_id ON outlook_auth(user_id);
CREATE INDEX idx_outlook_auth_email ON outlook_auth(email);
CREATE INDEX idx_outlook_auth_sync_status ON outlook_auth(sync_status);

-- =====================================================
-- PHONE LINE ROUTING
-- =====================================================
CREATE TABLE IF NOT EXISTS phone_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    line_name VARCHAR(100),
    line_type VARCHAR(50) DEFAULT 'main', -- main, support, emergency, sales
    provider VARCHAR(50), -- twilio, vapi
    status VARCHAR(20) DEFAULT 'active',
    max_concurrent_calls INTEGER DEFAULT 10,
    current_active_calls INTEGER DEFAULT 0,
    business_hours JSONB DEFAULT '{"monday": {"start": "08:00", "end": "17:00"}}',
    routing_rules JSONB,
    priority INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phone_lines_number ON phone_lines(phone_number);
CREATE INDEX idx_phone_lines_status ON phone_lines(status);
CREATE INDEX idx_phone_lines_priority ON phone_lines(priority DESC);

-- =====================================================
-- ROUTING RULES ENGINE
-- =====================================================
CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50), -- time_based, skill_based, priority, overflow
    priority INTEGER DEFAULT 0,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    phone_line_id UUID REFERENCES phone_lines(id) ON DELETE CASCADE,
    agent_group_id UUID,
    is_active BOOLEAN DEFAULT true,
    schedule JSONB,
    statistics JSONB DEFAULT '{"total_routed": 0, "success_rate": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_rules_priority ON routing_rules(priority DESC);
CREATE INDEX idx_routing_rules_active ON routing_rules(is_active);
CREATE INDEX idx_routing_rules_type ON routing_rules(rule_type);

-- =====================================================
-- AGENT AVAILABILITY
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    outlook_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available', -- available, busy, away, offline
    current_calls INTEGER DEFAULT 0,
    max_concurrent_calls INTEGER DEFAULT 3,
    skills JSONB DEFAULT '[]',
    languages JSONB DEFAULT '["fr", "en"]',
    shift_start TIME,
    shift_end TIME,
    break_schedule JSONB,
    last_call_at TIMESTAMPTZ,
    availability_score DECIMAL(3,2) DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_availability_status ON agent_availability(status);
CREATE INDEX idx_agent_availability_score ON agent_availability(availability_score DESC);
CREATE INDEX idx_agent_availability_email ON agent_availability(outlook_email);

-- =====================================================
-- CALL ROUTING HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS call_routing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) NOT NULL,
    phone_line_id UUID REFERENCES phone_lines(id),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    routing_rule_id UUID REFERENCES routing_rules(id),
    assigned_agent_id UUID REFERENCES agent_availability(id),
    routing_path JSONB,
    routing_duration_ms INTEGER,
    routing_result VARCHAR(50), -- success, overflow, voicemail, abandoned
    call_duration_seconds INTEGER,
    recording_url TEXT,
    transcription TEXT,
    sentiment_score DECIMAL(3,2),
    tags JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_routing_call_id ON call_routing_history(call_id);
CREATE INDEX idx_call_routing_created ON call_routing_history(created_at DESC);
CREATE INDEX idx_call_routing_agent ON call_routing_history(assigned_agent_id);
CREATE INDEX idx_call_routing_result ON call_routing_history(routing_result);

-- =====================================================
-- OUTLOOK CALENDAR SYNC
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_calendar_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlook_auth_id UUID REFERENCES outlook_auth(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL,
    outlook_event_id VARCHAR(255) UNIQUE,
    title VARCHAR(500),
    description TEXT,
    location VARCHAR(500),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    attendees JSONB DEFAULT '[]',
    organizer_email VARCHAR(255),
    categories JSONB DEFAULT '[]',
    importance VARCHAR(20) DEFAULT 'normal',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    reminder_minutes INTEGER,
    sync_status VARCHAR(50) DEFAULT 'synced',
    last_modified TIMESTAMPTZ,
    change_key VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_sync_auth ON outlook_calendar_sync(outlook_auth_id);
CREATE INDEX idx_calendar_sync_event ON outlook_calendar_sync(outlook_event_id);
CREATE INDEX idx_calendar_sync_time ON outlook_calendar_sync(start_time, end_time);
CREATE INDEX idx_calendar_sync_status ON outlook_calendar_sync(sync_status);

-- =====================================================
-- OUTLOOK EMAIL TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlook_auth_id UUID REFERENCES outlook_auth(id) ON DELETE CASCADE,
    message_id VARCHAR(255) UNIQUE,
    conversation_id VARCHAR(255),
    subject VARCHAR(1000),
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    to_emails JSONB DEFAULT '[]',
    cc_emails JSONB DEFAULT '[]',
    bcc_emails JSONB DEFAULT '[]',
    body_preview TEXT,
    body_content TEXT,
    body_type VARCHAR(20) DEFAULT 'text', -- text, html
    importance VARCHAR(20) DEFAULT 'normal',
    categories JSONB DEFAULT '[]',
    flag_status VARCHAR(50),
    has_attachments BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    sent_datetime TIMESTAMPTZ,
    received_datetime TIMESTAMPTZ,
    reply_to JSONB DEFAULT '[]',
    folder_id VARCHAR(255),
    folder_name VARCHAR(255),
    web_link TEXT,
    change_key VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emails_auth ON outlook_emails(outlook_auth_id);
CREATE INDEX idx_emails_message ON outlook_emails(message_id);
CREATE INDEX idx_emails_conversation ON outlook_emails(conversation_id);
CREATE INDEX idx_emails_from ON outlook_emails(from_email);
CREATE INDEX idx_emails_received ON outlook_emails(received_datetime DESC);
CREATE INDEX idx_emails_folder ON outlook_emails(folder_id);

-- =====================================================
-- OUTLOOK CONTACTS SYNC
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlook_auth_id UUID REFERENCES outlook_auth(id) ON DELETE CASCADE,
    contact_id VARCHAR(255) UNIQUE,
    lead_id UUID REFERENCES leads(id),
    given_name VARCHAR(255),
    surname VARCHAR(255),
    middle_name VARCHAR(255),
    nick_name VARCHAR(255),
    title VARCHAR(255),
    company_name VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    email_addresses JSONB DEFAULT '[]',
    phone_numbers JSONB DEFAULT '[]',
    addresses JSONB DEFAULT '[]',
    birthday DATE,
    categories JSONB DEFAULT '[]',
    notes TEXT,
    photo_url TEXT,
    web_page VARCHAR(500),
    im_addresses JSONB DEFAULT '[]',
    social_profiles JSONB DEFAULT '[]',
    sync_status VARCHAR(50) DEFAULT 'synced',
    last_modified TIMESTAMPTZ,
    change_key VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_auth ON outlook_contacts(outlook_auth_id);
CREATE INDEX idx_contacts_id ON outlook_contacts(contact_id);
CREATE INDEX idx_contacts_lead ON outlook_contacts(lead_id);
CREATE INDEX idx_contacts_company ON outlook_contacts(company_name);
CREATE INDEX idx_contacts_sync ON outlook_contacts(sync_status);

-- =====================================================
-- WEBHOOK SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlook_auth_id UUID REFERENCES outlook_auth(id) ON DELETE CASCADE,
    subscription_id VARCHAR(255) UNIQUE,
    resource VARCHAR(500) NOT NULL,
    change_type VARCHAR(100) NOT NULL,
    notification_url TEXT NOT NULL,
    expiration_datetime TIMESTAMPTZ NOT NULL,
    client_state VARCHAR(255),
    include_resource_data BOOLEAN DEFAULT false,
    encryption_certificate TEXT,
    encryption_certificate_id VARCHAR(255),
    latest_supported_tls_version VARCHAR(10),
    status VARCHAR(50) DEFAULT 'active',
    retry_count INTEGER DEFAULT 0,
    last_notification_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_auth ON outlook_webhook_subscriptions(outlook_auth_id);
CREATE INDEX idx_webhook_subscription ON outlook_webhook_subscriptions(subscription_id);
CREATE INDEX idx_webhook_status ON outlook_webhook_subscriptions(status);
CREATE INDEX idx_webhook_expiration ON outlook_webhook_subscriptions(expiration_datetime);

-- =====================================================
-- SYNC QUEUE AND JOBS
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlook_auth_id UUID REFERENCES outlook_auth(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- calendar, email, contacts, tasks
    operation VARCHAR(50) NOT NULL, -- create, update, delete, full_sync
    resource_id VARCHAR(255),
    priority INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    payload JSONB,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_auth ON outlook_sync_queue(outlook_auth_id);
CREATE INDEX idx_sync_queue_status ON outlook_sync_queue(status);
CREATE INDEX idx_sync_queue_priority ON outlook_sync_queue(priority DESC, scheduled_at);
CREATE INDEX idx_sync_queue_type ON outlook_sync_queue(sync_type);

-- =====================================================
-- METRICS AND ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL,
    dimensions JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    aggregation_period VARCHAR(20) DEFAULT 'minute',
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_type ON outlook_metrics(metric_type);
CREATE INDEX idx_metrics_name ON outlook_metrics(metric_name);
CREATE INDEX idx_metrics_timestamp ON outlook_metrics(timestamp DESC);
CREATE INDEX idx_metrics_period ON outlook_metrics(aggregation_period);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS outlook_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON outlook_audit_logs(user_id);
CREATE INDEX idx_audit_action ON outlook_audit_logs(action);
CREATE INDEX idx_audit_resource ON outlook_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON outlook_audit_logs(created_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_outlook_auth_updated_at BEFORE UPDATE ON outlook_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_lines_updated_at BEFORE UPDATE ON phone_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_availability_updated_at BEFORE UPDATE ON agent_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_calendar_sync_updated_at BEFORE UPDATE ON outlook_calendar_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_emails_updated_at BEFORE UPDATE ON outlook_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_contacts_updated_at BEFORE UPDATE ON outlook_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_webhook_subscriptions_updated_at BEFORE UPDATE ON outlook_webhook_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA INSERTION
-- =====================================================

-- Insert default phone lines
INSERT INTO phone_lines (phone_number, line_name, line_type, provider, business_hours, priority) VALUES
    ('+15145296037', 'Ligne principale - Drain Fortin', 'main', 'vapi', 
     '{"monday": {"start": "00:00", "end": "23:59"}, "tuesday": {"start": "00:00", "end": "23:59"}, "wednesday": {"start": "00:00", "end": "23:59"}, "thursday": {"start": "00:00", "end": "23:59"}, "friday": {"start": "00:00", "end": "23:59"}, "saturday": {"start": "00:00", "end": "23:59"}, "sunday": {"start": "00:00", "end": "23:59"}}',
     100),
    ('+14389004385', 'Ligne support technique', 'support', 'twilio',
     '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "17:00"}, "sunday": {"start": "10:00", "end": "16:00"}}',
     50)
ON CONFLICT (phone_number) DO UPDATE SET
    line_name = EXCLUDED.line_name,
    business_hours = EXCLUDED.business_hours,
    updated_at = NOW();

-- Insert default routing rules
INSERT INTO routing_rules (rule_name, rule_type, priority, conditions, actions, is_active) VALUES
    ('Urgences 24/7', 'priority', 100,
     '{"keywords": ["urgence", "fuite", "inondation", "emergency"], "time": "any"}',
     '{"route_to": "available_agent", "overflow": "voicemail", "max_wait": 30}',
     true),
    ('Heures d''affaires', 'time_based', 50,
     '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "hours": {"start": "08:00", "end": "17:00"}}',
     '{"route_to": "skill_based", "required_skills": ["plumbing", "french"]}',
     true),
    ('Après heures', 'time_based', 40,
     '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "hours": {"start": "17:01", "end": "07:59"}}',
     '{"route_to": "on_call_agent", "fallback": "voicemail"}',
     true),
    ('Fin de semaine', 'time_based', 30,
     '{"days": ["saturday", "sunday"]}',
     '{"route_to": "weekend_team", "fallback": "emergency_line"}',
     true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE outlook_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own Outlook auth" ON outlook_auth
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view phone lines" ON phone_lines
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view routing rules" ON routing_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own availability" ON agent_availability
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Authenticated users can view call history" ON call_routing_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own calendar sync" ON outlook_calendar_sync
    FOR ALL USING (
        outlook_auth_id IN (
            SELECT id FROM outlook_auth WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own emails" ON outlook_emails
    FOR ALL USING (
        outlook_auth_id IN (
            SELECT id FROM outlook_auth WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own contacts" ON outlook_contacts
    FOR ALL USING (
        outlook_auth_id IN (
            SELECT id FROM outlook_auth WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own webhooks" ON outlook_webhook_subscriptions
    FOR ALL USING (
        outlook_auth_id IN (
            SELECT id FROM outlook_auth WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own sync queue" ON outlook_sync_queue
    FOR SELECT USING (
        outlook_auth_id IN (
            SELECT id FROM outlook_auth WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can view metrics" ON outlook_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own audit logs" ON outlook_audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_call_routing_date_agent ON call_routing_history(created_at DESC, assigned_agent_id);
CREATE INDEX idx_emails_user_date ON outlook_emails(outlook_auth_id, received_datetime DESC);
CREATE INDEX idx_calendar_user_date ON outlook_calendar_sync(outlook_auth_id, start_time, end_time);
CREATE INDEX idx_sync_queue_pending ON outlook_sync_queue(status, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_metrics_recent ON outlook_metrics(timestamp DESC) WHERE timestamp > NOW() - INTERVAL '24 hours';

-- =====================================================
-- SCHEDULED JOBS (pg_cron)
-- =====================================================

-- Clean old audit logs (keep 90 days)
SELECT cron.schedule('clean-audit-logs', '0 2 * * *', $$
    DELETE FROM outlook_audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
$$);

-- Refresh webhook subscriptions (every 12 hours)
SELECT cron.schedule('refresh-webhooks', '0 */12 * * *', $$
    UPDATE outlook_webhook_subscriptions
    SET status = 'needs_refresh'
    WHERE expiration_datetime < NOW() + INTERVAL '24 hours'
    AND status = 'active';
$$);

-- Update agent availability scores (every 5 minutes)
SELECT cron.schedule('update-availability-scores', '*/5 * * * *', $$
    UPDATE agent_availability
    SET availability_score = CASE
        WHEN status = 'available' AND current_calls < max_concurrent_calls THEN 1.0
        WHEN status = 'available' AND current_calls = max_concurrent_calls THEN 0.5
        WHEN status = 'busy' THEN 0.3
        WHEN status = 'away' THEN 0.1
        ELSE 0.0
    END;
$$);

-- Archive old call records (keep 1 year)
SELECT cron.schedule('archive-old-calls', '0 3 * * 0', $$
    DELETE FROM call_routing_history WHERE created_at < NOW() - INTERVAL '1 year';
$$);

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration creates a complete Outlook integration schema
-- with phone routing, calendar sync, email tracking, and more.
-- Ready for production deployment.