-- Tool calls: ensure columns align with runtime (tool_name, status, duration_ms)
ALTER TABLE tool_calls
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON tool_calls(status);

