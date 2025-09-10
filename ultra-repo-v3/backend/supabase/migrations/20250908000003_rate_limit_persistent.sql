-- Durable rate limiting storage and RPC for sliding window (approx)

CREATE TABLE IF NOT EXISTS request_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rrl_key_time ON request_rate_limits(key, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_rrl_time ON request_rate_limits(requested_at DESC);

-- Function: increment and check limit within the given window.
-- Returns: { allowed bool, count int, retry_after int }
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_max_requests INT
) RETURNS JSONB AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - make_interval(secs => p_window_seconds);
  v_count INT;
  v_allowed BOOLEAN;
  v_oldest_in_window TIMESTAMPTZ;
  v_retry_after INT;
BEGIN
  INSERT INTO request_rate_limits(key, requested_at) VALUES (p_key, v_now);

  SELECT COUNT(*), MIN(requested_at)
  INTO v_count, v_oldest_in_window
  FROM request_rate_limits
  WHERE key = p_key AND requested_at >= v_window_start;

  v_allowed := v_count <= p_max_requests;

  IF v_allowed THEN
    v_retry_after := 0;
  ELSE
    -- Approximate retryAfter: time until the oldest request in window expires
    v_retry_after := GREATEST(1, p_window_seconds - CAST(EXTRACT(EPOCH FROM (v_now - v_oldest_in_window)) AS INT));
  END IF;

  -- Opportunistic cleanup: delete records older than 2x window to keep table small
  DELETE FROM request_rate_limits WHERE requested_at < (v_now - make_interval(secs => (p_window_seconds * 2)));

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'retry_after', v_retry_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

