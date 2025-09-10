-- ============================================
-- MARIA "QUERY-OPTIMIZER" RODRIGUEZ
-- Performance Optimizations for Drain Fortin
-- "Chaque requête doit être une œuvre d'art"
-- ============================================

-- ============================================
-- STEP 1: INDEX ANALYSIS & OPTIMIZATION
-- ============================================

-- Missing critical indexes identified by Maria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_call_id_btree 
ON public.call_logs(call_id) 
WHERE call_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_status_created 
ON public.call_logs(status, created_at DESC) 
WHERE status IN ('active', 'completed', 'failed');

-- Composite index for frequent JOIN patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_phone_date 
ON public.appointments(customer_phone, preferred_date DESC);

-- Partial index for active records only (90% queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_active 
ON public.appointments(status, preferred_date) 
WHERE status = 'pending';

-- GIN index for JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_transcript_gin 
ON public.call_logs USING gin(transcript);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_tool_calls_gin 
ON public.call_logs USING gin(tool_calls);

-- BRIN index for time-series data (space efficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_created_brin 
ON public.analytics USING brin(created_at);

-- Covering index to avoid table lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vapi_calls_covering 
ON vapi_calls(phone_number, started_at DESC) 
INCLUDE (call_id, status, duration, priority);

-- ============================================
-- STEP 2: MATERIALIZED VIEWS FOR DASHBOARDS
-- ============================================

-- Real-time metrics (refreshed every minute)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_realtime_metrics AS
SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as calls_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as calls_last_day,
    COUNT(*) FILTER (WHERE status = 'active') as active_calls,
    AVG(duration) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as avg_duration_today,
    COUNT(DISTINCT phone_number) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as unique_callers_today,
    COUNT(*) FILTER (WHERE priority = 'P1' AND created_at > NOW() - INTERVAL '24 hours') as p1_urgent_today,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration
FROM vapi_calls
WHERE started_at > NOW() - INTERVAL '7 days'
WITH DATA;

CREATE UNIQUE INDEX ON mv_realtime_metrics((1));

-- Top services aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_services AS
SELECT 
    l.service_type,
    COUNT(*) as total_requests,
    AVG(l.estimated_value) as avg_value,
    SUM(l.estimated_value) as total_value,
    COUNT(*) FILTER (WHERE l.status = 'converted') as conversions,
    COUNT(*) FILTER (WHERE l.status = 'converted')::float / NULLIF(COUNT(*), 0) as conversion_rate
FROM leads l
WHERE l.created_at > NOW() - INTERVAL '30 days'
GROUP BY l.service_type
ORDER BY total_requests DESC
WITH DATA;

CREATE UNIQUE INDEX ON mv_top_services(service_type);

-- ============================================
-- STEP 3: QUERY OPTIMIZATION FUNCTIONS
-- ============================================

-- Optimized call search with proper indexing
CREATE OR REPLACE FUNCTION search_calls_optimized(
    p_phone VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    call_id VARCHAR,
    phone_number VARCHAR,
    status VARCHAR,
    duration INTEGER,
    created_at TIMESTAMPTZ,
    priority VARCHAR
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.call_id,
        c.phone_number,
        c.status,
        c.duration,
        c.started_at as created_at,
        c.priority
    FROM vapi_calls c
    WHERE 
        (p_phone IS NULL OR c.phone_number = p_phone)
        AND (p_status IS NULL OR c.status = p_status)
        AND c.started_at BETWEEN p_start_date AND p_end_date
    ORDER BY c.started_at DESC
    LIMIT p_limit;
END;
$$;

-- Batch insert optimization for high volume
CREATE OR REPLACE FUNCTION insert_call_batch(
    p_calls JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO vapi_calls (
        call_id, phone_number, status, duration, 
        started_at, transcript, metadata
    )
    SELECT 
        (c->>'call_id')::VARCHAR,
        (c->>'phone_number')::VARCHAR,
        COALESCE(c->>'status', 'active'),
        COALESCE((c->>'duration')::INTEGER, 0),
        COALESCE((c->>'started_at')::TIMESTAMPTZ, NOW()),
        c->'transcript',
        c->'metadata'
    FROM jsonb_array_elements(p_calls) c
    ON CONFLICT (call_id) 
    DO UPDATE SET
        status = EXCLUDED.status,
        duration = EXCLUDED.duration,
        updated_at = NOW();
END;
$$;

-- ============================================
-- STEP 4: PARTITIONING FOR SCALE
-- ============================================

-- Partition call_logs by month for better performance
-- (Only if table grows > 1M records)
/*
-- Future optimization when needed
CREATE TABLE call_logs_partitioned (
    LIKE call_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE call_logs_2025_01 PARTITION OF call_logs_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
CREATE TABLE call_logs_2025_02 PARTITION OF call_logs_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
*/

-- ============================================
-- STEP 5: CACHE-FRIENDLY QUERIES
-- ============================================

-- Prepared statements for frequently used queries
PREPARE get_active_calls AS
SELECT call_id, phone_number, duration, priority
FROM vapi_calls
WHERE status = 'active'
ORDER BY started_at DESC
LIMIT $1;

PREPARE get_today_stats AS
SELECT 
    COUNT(*) as total_calls,
    COUNT(DISTINCT phone_number) as unique_callers,
    AVG(duration) as avg_duration
FROM vapi_calls
WHERE DATE(started_at) = CURRENT_DATE;

-- ============================================
-- STEP 6: VACUUM & ANALYZE CONFIGURATION
-- ============================================

-- Auto-vacuum settings for high-transaction tables
ALTER TABLE vapi_calls SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE call_logs SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================
-- STEP 7: CONNECTION POOLING OPTIMIZATION
-- ============================================

-- Recommend PgBouncer settings (add to documentation)
COMMENT ON DATABASE postgres IS 'Recommended PgBouncer settings:
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600';

-- ============================================
-- STEP 8: MONITORING QUERIES
-- ============================================

-- Slow query detection view
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100 -- queries slower than 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Table bloat detection
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup,
    n_dead_tup,
    ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- ============================================
-- STEP 9: REFRESH STRATEGY FOR MATERIALIZED VIEWS
-- ============================================

-- Automatic refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_realtime_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_services;
END;
$$;

-- Schedule with pg_cron (if available)
-- SELECT cron.schedule('refresh-views', '*/5 * * * *', 'SELECT refresh_materialized_views()');

-- ============================================
-- STEP 10: CLEANUP & MAINTENANCE
-- ============================================

-- Archive old data function
CREATE OR REPLACE FUNCTION archive_old_calls()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move calls older than 90 days to archive table
    WITH archived AS (
        DELETE FROM vapi_calls
        WHERE started_at < NOW() - INTERVAL '90 days'
        RETURNING *
    )
    INSERT INTO vapi_calls_archive
    SELECT * FROM archived;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$;

-- ============================================
-- PERFORMANCE VALIDATION
-- ============================================

-- Run ANALYZE to update statistics
ANALYZE vapi_calls;
ANALYZE call_logs;
ANALYZE leads;
ANALYZE appointments;

-- Test query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM vapi_calls 
WHERE phone_number = '450-280-3222' 
AND started_at > NOW() - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 10;

-- ============================================
-- Maria's Performance Guarantee:
-- All queries < 50ms for dashboard
-- Bulk inserts < 100ms for 1000 records
-- Real-time metrics refresh < 500ms
-- ============================================