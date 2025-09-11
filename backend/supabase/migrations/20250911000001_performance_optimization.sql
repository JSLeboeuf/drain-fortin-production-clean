-- Performance Optimization Migration
-- Database schema optimizations for sub-200ms response times
-- Version 1.0.0 - Production performance enhancements

BEGIN;

-- ============================================================================
-- RATE LIMITING INFRASTRUCTURE
-- ============================================================================

-- Create rate limiting table with optimized indexes
CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGSERIAL PRIMARY KEY,
    key_hash TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized indexes for rate limiting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_key_hash_window 
ON rate_limits(key_hash, window_end) 
WHERE window_end > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_cleanup 
ON rate_limits(window_end) 
WHERE window_end <= NOW();

-- Rate limiting function with atomic operations
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key TEXT,
    p_window_seconds INTEGER DEFAULT 60,
    p_max_requests INTEGER DEFAULT 100
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_hash TEXT;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
    v_current_count INTEGER;
    v_allowed BOOLEAN;
    v_retry_after INTEGER;
BEGIN
    -- Generate hash for the key to prevent key exposure
    v_key_hash := encode(digest(p_key, 'sha256'), 'hex');
    v_window_start := date_trunc('minute', NOW()) + 
                     ((EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_seconds) || ' seconds')::INTERVAL;
    v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

    -- Atomic upsert with conflict resolution
    INSERT INTO rate_limits (key_hash, count, window_start, window_end)
    VALUES (v_key_hash, 1, v_window_start, v_window_end)
    ON CONFLICT (key_hash, window_start) 
    DO UPDATE SET 
        count = rate_limits.count + 1,
        updated_at = NOW()
    WHERE rate_limits.window_end > NOW()
    RETURNING count INTO v_current_count;

    -- Get current count if insert didn't happen
    IF v_current_count IS NULL THEN
        SELECT count INTO v_current_count 
        FROM rate_limits 
        WHERE key_hash = v_key_hash AND window_end > NOW()
        ORDER BY window_start DESC 
        LIMIT 1;
    END IF;

    -- Determine if request is allowed
    v_allowed := COALESCE(v_current_count, 0) <= p_max_requests;
    v_retry_after := CASE 
        WHEN v_allowed THEN NULL 
        ELSE EXTRACT(EPOCH FROM (v_window_end - NOW()))::INTEGER 
    END;

    RETURN json_build_object(
        'allowed', v_allowed,
        'count', COALESCE(v_current_count, 0),
        'retry_after', v_retry_after,
        'window_end', v_window_end
    );
END;
$$;

-- ============================================================================
-- PERFORMANCE MONITORING TABLES
-- ============================================================================

-- Request metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS request_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms NUMERIC(10,2) NOT NULL,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    user_agent TEXT,
    client_ip INET,
    error_message TEXT,
    cache_hit BOOLEAN DEFAULT FALSE,
    db_query_count INTEGER DEFAULT 0,
    db_query_time_ms NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioning for request metrics (by day)
SELECT create_hypertable('request_metrics', 'timestamp', if_not_exists => TRUE);

-- Optimized indexes for performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_metrics_timestamp_status 
ON request_metrics(timestamp DESC, status_code);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_metrics_path_performance 
ON request_metrics(path, timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '24 hours';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_metrics_errors 
ON request_metrics(timestamp DESC) 
WHERE status_code >= 400;

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    memory_usage_mb NUMERIC(10,2),
    active_connections INTEGER,
    cache_hit_rate NUMERIC(5,4),
    error_rate NUMERIC(5,4),
    avg_response_time_ms NUMERIC(10,2),
    requests_per_second NUMERIC(10,2),
    environment TEXT NOT NULL DEFAULT 'production',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for system metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_timestamp 
ON system_metrics(timestamp DESC);

-- ============================================================================
-- QUERY OPTIMIZATION INDEXES
-- ============================================================================

-- Optimize existing call-related queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_phone_status_time 
ON calls(phone_number, status, started_at DESC) 
WHERE status IN ('active', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_customer_recent 
ON calls(customer_id, started_at DESC) 
WHERE started_at > NOW() - INTERVAL '30 days';

-- Optimize client queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone_status 
ON clients(phone_number, status) 
WHERE status IN ('active', 'lead');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_last_contact 
ON clients(last_contact DESC) 
WHERE last_contact > NOW() - INTERVAL '90 days';

-- Optimize tool calls for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_calls_call_time_status 
ON tool_calls(call_id, created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_calls_performance 
ON tool_calls(tool_name, duration_ms, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Optimize SMS messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_call_type_time 
ON sms_messages(call_id, sms_type, sent_at DESC);

-- ============================================================================
-- DATABASE PERFORMANCE FUNCTIONS
-- ============================================================================

-- Function to get real-time performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics(
    p_hours INTEGER DEFAULT 1
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_total_requests INTEGER;
    v_error_requests INTEGER;
    v_avg_response_time NUMERIC;
    v_p95_response_time NUMERIC;
    v_p99_response_time NUMERIC;
    v_cache_hit_rate NUMERIC;
    v_requests_per_minute NUMERIC;
BEGIN
    v_start_time := NOW() - (p_hours || ' hours')::INTERVAL;

    -- Get basic metrics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status_code >= 400),
        AVG(response_time_ms),
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms),
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms),
        AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END),
        COUNT(*) / GREATEST(EXTRACT(EPOCH FROM NOW() - v_start_time) / 60, 1)
    INTO 
        v_total_requests,
        v_error_requests,
        v_avg_response_time,
        v_p95_response_time,
        v_p99_response_time,
        v_cache_hit_rate,
        v_requests_per_minute
    FROM request_metrics 
    WHERE timestamp >= v_start_time;

    RETURN json_build_object(
        'period_hours', p_hours,
        'total_requests', COALESCE(v_total_requests, 0),
        'error_requests', COALESCE(v_error_requests, 0),
        'error_rate', CASE 
            WHEN v_total_requests > 0 THEN v_error_requests::NUMERIC / v_total_requests 
            ELSE 0 
        END,
        'avg_response_time_ms', ROUND(COALESCE(v_avg_response_time, 0), 2),
        'p95_response_time_ms', ROUND(COALESCE(v_p95_response_time, 0), 2),
        'p99_response_time_ms', ROUND(COALESCE(v_p99_response_time, 0), 2),
        'cache_hit_rate', ROUND(COALESCE(v_cache_hit_rate, 0), 4),
        'requests_per_minute', ROUND(COALESCE(v_requests_per_minute, 0), 2),
        'generated_at', NOW()
    );
END;
$$;

-- Function to identify slow queries and bottlenecks
CREATE OR REPLACE FUNCTION get_performance_bottlenecks(
    p_hours INTEGER DEFAULT 1
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_slow_endpoints JSON;
    v_error_patterns JSON;
    v_cache_misses JSON;
BEGIN
    v_start_time := NOW() - (p_hours || ' hours')::INTERVAL;

    -- Get slow endpoints
    SELECT json_agg(
        json_build_object(
            'path', path,
            'method', method,
            'avg_response_time_ms', ROUND(avg_response_time, 2),
            'max_response_time_ms', ROUND(max_response_time, 2),
            'request_count', request_count,
            'error_rate', ROUND(error_rate, 4)
        )
    )
    INTO v_slow_endpoints
    FROM (
        SELECT 
            path,
            method,
            AVG(response_time_ms) as avg_response_time,
            MAX(response_time_ms) as max_response_time,
            COUNT(*) as request_count,
            COUNT(*) FILTER (WHERE status_code >= 400)::NUMERIC / COUNT(*) as error_rate
        FROM request_metrics 
        WHERE timestamp >= v_start_time
        GROUP BY path, method
        HAVING AVG(response_time_ms) > 200 OR COUNT(*) FILTER (WHERE status_code >= 400) > 0
        ORDER BY avg_response_time DESC
        LIMIT 10
    ) slow_queries;

    -- Get error patterns
    SELECT json_agg(
        json_build_object(
            'path', path,
            'status_code', status_code,
            'error_count', error_count,
            'error_message_sample', error_message_sample
        )
    )
    INTO v_error_patterns
    FROM (
        SELECT 
            path,
            status_code,
            COUNT(*) as error_count,
            array_agg(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) as error_message_sample
        FROM request_metrics 
        WHERE timestamp >= v_start_time AND status_code >= 400
        GROUP BY path, status_code
        ORDER BY error_count DESC
        LIMIT 10
    ) error_analysis;

    -- Get cache miss patterns
    SELECT json_agg(
        json_build_object(
            'path', path,
            'total_requests', total_requests,
            'cache_misses', cache_misses,
            'cache_miss_rate', ROUND(cache_miss_rate, 4)
        )
    )
    INTO v_cache_misses
    FROM (
        SELECT 
            path,
            COUNT(*) as total_requests,
            COUNT(*) FILTER (WHERE NOT cache_hit) as cache_misses,
            COUNT(*) FILTER (WHERE NOT cache_hit)::NUMERIC / COUNT(*) as cache_miss_rate
        FROM request_metrics 
        WHERE timestamp >= v_start_time
        GROUP BY path
        HAVING COUNT(*) FILTER (WHERE NOT cache_hit)::NUMERIC / COUNT(*) > 0.5
        ORDER BY cache_miss_rate DESC
        LIMIT 10
    ) cache_analysis;

    RETURN json_build_object(
        'period_hours', p_hours,
        'slow_endpoints', COALESCE(v_slow_endpoints, '[]'::json),
        'error_patterns', COALESCE(v_error_patterns, '[]'::json),
        'cache_miss_patterns', COALESCE(v_cache_misses, '[]'::json),
        'analysis_time', NOW()
    );
END;
$$;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up old performance data
CREATE OR REPLACE FUNCTION cleanup_performance_data(
    p_retention_days INTEGER DEFAULT 7
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_rate_limits_deleted INTEGER;
    v_metrics_deleted INTEGER;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Clean up old rate limiting data
    DELETE FROM rate_limits 
    WHERE window_end < v_cutoff_date;
    
    GET DIAGNOSTICS v_rate_limits_deleted = ROW_COUNT;

    -- Clean up old request metrics (keep only aggregated data)
    DELETE FROM request_metrics 
    WHERE timestamp < v_cutoff_date;
    
    GET DIAGNOSTICS v_metrics_deleted = ROW_COUNT;

    -- Update table statistics
    ANALYZE rate_limits;
    ANALYZE request_metrics;
    ANALYZE system_metrics;

    RETURN json_build_object(
        'retention_days', p_retention_days,
        'rate_limits_deleted', v_rate_limits_deleted,
        'metrics_deleted', v_metrics_deleted,
        'cleanup_time', NOW()
    );
END;
$$;

-- ============================================================================
-- SECURITY ENHANCEMENTS
-- ============================================================================

-- Add unique constraint to rate_limits for atomic operations
ALTER TABLE rate_limits 
ADD CONSTRAINT uq_rate_limits_key_window 
UNIQUE (key_hash, window_start);

-- Row Level Security for performance tables
ALTER TABLE request_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for service role access
CREATE POLICY request_metrics_service_policy ON request_metrics
    FOR ALL TO service_role USING (true);

CREATE POLICY system_metrics_service_policy ON system_metrics
    FOR ALL TO service_role USING (true);

CREATE POLICY rate_limits_service_policy ON rate_limits
    FOR ALL TO service_role USING (true);

-- ============================================================================
-- AUTOMATED MAINTENANCE
-- ============================================================================

-- Create scheduled job for cleanup (requires pg_cron extension)
-- This would be enabled if pg_cron is available
/*
SELECT cron.schedule(
    'performance-cleanup',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT cleanup_performance_data(7);'
);
*/

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION get_performance_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_performance_bottlenecks TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_performance_data TO service_role;

-- Create helpful views for monitoring
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    date_trunc('hour', timestamp) as hour,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_requests,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) as cache_hit_rate
FROM request_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', timestamp)
ORDER BY hour DESC;

-- Grant view access
GRANT SELECT ON performance_summary TO service_role;

COMMIT;

-- Add comments for documentation
COMMENT ON TABLE rate_limits IS 'High-performance rate limiting with atomic operations';
COMMENT ON TABLE request_metrics IS 'Detailed request performance metrics for monitoring';
COMMENT ON TABLE system_metrics IS 'System-wide performance and health metrics';
COMMENT ON FUNCTION increment_rate_limit IS 'Atomic rate limiting with hash-based keys for security';
COMMENT ON FUNCTION get_performance_metrics IS 'Real-time performance analytics and reporting';
COMMENT ON FUNCTION get_performance_bottlenecks IS 'Automated bottleneck detection and analysis';
COMMENT ON VIEW performance_summary IS 'Hourly performance summary for quick monitoring';