-- Security Enhancements Migration
-- Adds security monitoring and logging capabilities

-- Create security_events table for monitoring threats and violations
CREATE TABLE IF NOT EXISTS security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    details jsonb,
    ip_address text,
    user_agent text,
    environment text DEFAULT 'production',
    timestamp timestamptz DEFAULT now(),
    severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved boolean DEFAULT false,
    resolution_notes text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(resolved) WHERE resolved = false;

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only
CREATE POLICY "Service role can manage security events" ON security_events
    FOR ALL USING (auth.role() = 'service_role');

-- Create view for security dashboard (aggregated data)
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    event_type,
    COUNT(*) as event_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_count,
    MAX(timestamp) as last_occurrence,
    MIN(timestamp) as first_occurrence
FROM security_events 
WHERE timestamp >= now() - interval '24 hours'
GROUP BY event_type
ORDER BY critical_count DESC, high_count DESC, event_count DESC;

-- Create function to automatically mark high-frequency events as high severity
CREATE OR REPLACE FUNCTION update_security_severity()
RETURNS trigger AS $$
BEGIN
    -- If we have more than 10 events of the same type from the same IP in 1 hour, mark as high
    IF (
        SELECT COUNT(*) 
        FROM security_events 
        WHERE event_type = NEW.event_type 
        AND ip_address = NEW.ip_address 
        AND timestamp >= now() - interval '1 hour'
    ) > 10 THEN
        NEW.severity = 'high';
    END IF;

    -- Critical events based on type
    IF NEW.event_type IN ('invalid_signature', 'cors_violation', 'rate_limit_exceeded') THEN
        NEW.severity = 'high';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic severity assignment
DROP TRIGGER IF EXISTS security_severity_trigger ON security_events;
CREATE TRIGGER security_severity_trigger
    BEFORE INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION update_security_severity();

-- Add security audit columns to existing tables if they don't exist
DO $$
BEGIN
    -- Add security columns to sms_messages if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_messages' AND column_name = 'security_verified') THEN
        ALTER TABLE sms_messages ADD COLUMN security_verified boolean DEFAULT true;
        ALTER TABLE sms_messages ADD COLUMN security_notes text;
    END IF;

    -- Add security columns to vapi_calls if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vapi_calls' AND column_name = 'signature_verified') THEN
        ALTER TABLE vapi_calls ADD COLUMN signature_verified boolean DEFAULT true;
        ALTER TABLE vapi_calls ADD COLUMN origin_validated boolean DEFAULT true;
    END IF;
END $$;

-- Create function to clean up old security events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_security_events()
RETURNS void AS $$
BEGIN
    DELETE FROM security_events 
    WHERE timestamp < now() - interval '30 days'
    AND resolved = true;
    
    -- Keep unresolved events longer (90 days)
    DELETE FROM security_events 
    WHERE timestamp < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get security statistics
CREATE OR REPLACE FUNCTION get_security_stats(
    time_window interval DEFAULT interval '24 hours'
)
RETURNS json AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_events', COUNT(*),
        'critical_events', COUNT(*) FILTER (WHERE severity = 'critical'),
        'high_events', COUNT(*) FILTER (WHERE severity = 'high'),
        'rate_limit_violations', COUNT(*) FILTER (WHERE event_type = 'rate_limit_exceeded'),
        'cors_violations', COUNT(*) FILTER (WHERE event_type = 'cors_violation'),
        'signature_failures', COUNT(*) FILTER (WHERE event_type = 'invalid_signature'),
        'unique_ips', COUNT(DISTINCT ip_address),
        'unresolved_events', COUNT(*) FILTER (WHERE resolved = false),
        'time_window', extract(epoch from time_window)
    ) INTO stats
    FROM security_events 
    WHERE timestamp >= now() - time_window;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON security_dashboard TO service_role;
GRANT EXECUTE ON FUNCTION get_security_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_security_events TO service_role;

-- Insert initial security configuration
INSERT INTO security_events (event_type, details, severity, resolved, resolution_notes) 
VALUES (
    'security_migration_completed',
    '{"migration": "20250908000001_security_enhancements", "tables_created": ["security_events"], "functions_created": ["update_security_severity", "cleanup_security_events", "get_security_stats"]}'::jsonb,
    'low',
    true,
    'Security enhancements migration completed successfully'
) ON CONFLICT DO NOTHING;

-- Create notification function for critical security events
CREATE OR REPLACE FUNCTION notify_critical_security_event()
RETURNS trigger AS $$
BEGIN
    -- Only notify for critical and high severity events
    IF NEW.severity IN ('critical', 'high') THEN
        PERFORM pg_notify(
            'critical_security_event',
            json_build_object(
                'event_type', NEW.event_type,
                'severity', NEW.severity,
                'ip_address', NEW.ip_address,
                'timestamp', NEW.timestamp,
                'details', NEW.details
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for critical event notifications
DROP TRIGGER IF EXISTS notify_critical_trigger ON security_events;
CREATE TRIGGER notify_critical_trigger
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_critical_security_event();

COMMENT ON TABLE security_events IS 'Logs security events and violations for monitoring and alerting';
COMMENT ON FUNCTION update_security_severity() IS 'Automatically assigns severity levels based on event patterns';
COMMENT ON FUNCTION cleanup_security_events() IS 'Removes old resolved security events to maintain performance';
COMMENT ON FUNCTION get_security_stats(interval) IS 'Returns aggregated security statistics for a given time window';
COMMENT ON VIEW security_dashboard IS 'Provides aggregated view of security events for dashboard display';