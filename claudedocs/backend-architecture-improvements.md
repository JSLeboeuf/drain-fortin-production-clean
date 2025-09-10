# Backend Architecture Improvements - Drain Fortin System

## 1. API Design Restructuring

### Current Architecture Issues
- Monolithic webhook handler in single file (277 lines)
- Mixed business logic, data persistence, and external API calls
- No API versioning or proper resource endpoints

### Recommended Structure
```
backend/supabase/functions/
├── vapi-webhook/           # Main webhook entry point
├── _shared/
│   ├── middleware/
│   │   ├── auth.ts         # HMAC verification
│   │   ├── validation.ts   # Input validation
│   │   ├── ratelimit.ts    # Rate limiting
│   │   └── logging.ts      # Structured logging
│   ├── services/
│   │   ├── call-service.ts     # Call management
│   │   ├── pricing-service.ts  # Pricing calculations
│   │   ├── sms-service.ts      # SMS operations
│   │   └── priority-service.ts # Priority classification
│   ├── models/
│   │   ├── call.ts         # Call data models
│   │   ├── lead.ts         # Lead data models
│   │   └── sms.ts          # SMS data models
│   └── utils/
│       ├── database.ts     # DB utilities
│       ├── retry.ts        # Retry mechanisms
│       └── validation.ts   # Data validation
```

## 2. Database Schema Optimization

### Current Issues
- Missing composite indexes for common queries
- No partitioning strategy for large tables
- Insufficient constraint validation
- Missing audit trail capabilities

### Recommended Improvements
```sql
-- Add missing call_transcripts table (referenced but not created)
CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) NOT NULL REFERENCES vapi_calls(call_id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    confidence DECIMAL(3,2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing tool_calls table (referenced but not created)  
CREATE TABLE IF NOT EXISTS tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) NOT NULL REFERENCES vapi_calls(call_id),
    tool_name VARCHAR(100) NOT NULL,
    tool_call_id VARCHAR(255) NOT NULL,
    arguments JSONB,
    result JSONB,
    executed_at TIMESTAMPTZ,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer information to vapi_calls (currently in separate fields)
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS call_duration INTEGER;

-- Composite indexes for performance
CREATE INDEX idx_vapi_calls_status_priority ON vapi_calls(status, priority);
CREATE INDEX idx_vapi_calls_started_status ON vapi_calls(started_at DESC, status);
CREATE INDEX idx_call_transcripts_call_timestamp ON call_transcripts(call_id, timestamp DESC);
CREATE INDEX idx_tool_calls_call_name ON tool_calls(call_id, tool_name);

-- Partitioning for call_transcripts (high-volume table)
-- Convert to partitioned table by month
CREATE TABLE call_transcripts_partitioned (LIKE call_transcripts INCLUDING ALL)
PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE call_transcripts_2025_09 PARTITION OF call_transcripts_partitioned
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

## 3. Transaction Management Issues

### Current Problems
- No transaction boundaries for related operations
- Risk of data inconsistency between tables
- No rollback mechanisms for failed operations

### Recommended Solution
```typescript
// backend/supabase/functions/_shared/services/call-service.ts
import { SupabaseClient } from '@supabase/supabase-js';

export class CallService {
  constructor(private supabase: SupabaseClient) {}

  async processCallEnd(callData: CallEndData): Promise<CallResult> {
    // Use Supabase transaction (rpc call to stored procedure)
    const { data, error } = await this.supabase.rpc('process_call_end', {
      call_id: callData.call_id,
      analysis: callData.analysis,
      customer_data: callData.customer_data,
      priority_data: callData.priority_data
    });

    if (error) {
      throw new DatabaseError(`Failed to process call end: ${error.message}`);
    }

    return data;
  }
}

// SQL stored procedure for transaction safety
CREATE OR REPLACE FUNCTION process_call_end(
  call_id_param VARCHAR,
  analysis_param JSONB,
  customer_data_param JSONB,
  priority_data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Update call record
  UPDATE vapi_calls SET
    status = 'completed',
    ended_at = NOW(),
    analysis = analysis_param,
    customer_name = customer_data_param->>'name',
    customer_email = customer_data_param->>'email',
    priority = priority_data_param->>'priority',
    priority_reason = priority_data_param->>'reason',
    sla_seconds = (priority_data_param->>'sla_seconds')::INTEGER
  WHERE call_id = call_id_param;

  -- Create lead record if customer data exists
  IF customer_data_param->>'name' IS NOT NULL THEN
    INSERT INTO leads (
      call_id, phone_number, name, email, 
      service_type, urgency_level, status
    ) VALUES (
      call_id_param,
      customer_data_param->>'phone',
      customer_data_param->>'name',
      customer_data_param->>'email',
      analysis_param->>'service_type',
      priority_data_param->>'priority',
      'new'
    );
  END IF;

  result := jsonb_build_object('success', true, 'call_id', call_id_param);
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;
```

## 4. Error Handling and Recovery

### Current Issues
- Basic try-catch with console.error logging
- No structured error types or classification
- No retry mechanisms for external API failures
- No circuit breaker patterns

### Recommended Implementation
```typescript
// backend/supabase/functions/_shared/utils/errors.ts
export class DrainFortinError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DrainFortinError';
  }
}

export class ValidationError extends DrainFortinError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class ExternalServiceError extends DrainFortinError {
  constructor(service: string, message: string, details?: any) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details);
  }
}

// backend/supabase/functions/_shared/utils/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) break;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError!;
}

// Circuit breaker pattern for Twilio
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private timeoutMs = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 5. Scalability Concerns

### Current Bottlenecks
- No connection pooling configuration
- Single webhook endpoint handling all event types
- No horizontal scaling strategy
- No caching layer

### Recommendations
```typescript
// backend/supabase/functions/_shared/utils/database.ts
import { createClient } from '@supabase/supabase-js';

class DatabaseManager {
  private static instance: DatabaseManager;
  private clients: Map<string, any> = new Map();
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  getClient(context: 'read' | 'write' = 'write') {
    const key = `${context}_client`;
    
    if (!this.clients.has(key)) {
      const client = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SERVICE_ROLE_KEY')!,
        {
          db: {
            schema: 'public',
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );
      this.clients.set(key, client);
    }
    
    return this.clients.get(key);
  }
}

// Redis cache layer (if available)
export class CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  // Clean expired entries
  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
```

## 6. Performance Bottlenecks

### Issues Identified
- No query optimization for JSONB columns
- Missing database indexes for common access patterns
- Synchronous external API calls blocking webhook response

### Solutions
```sql
-- Optimize JSONB queries
CREATE INDEX idx_vapi_calls_analysis_service ON vapi_calls 
USING GIN ((analysis->>'service_type'));

CREATE INDEX idx_vapi_calls_analysis_priority ON vapi_calls 
USING GIN ((analysis->>'priority'));

-- Materialized view for analytics
CREATE MATERIALIZED VIEW call_analytics AS
SELECT 
  DATE_TRUNC('hour', started_at) as hour_bucket,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
  COUNT(CASE WHEN priority = 'P1' THEN 1 END) as urgent_calls,
  AVG(call_duration) as avg_duration,
  array_agg(DISTINCT analysis->>'service_type') as service_types
FROM vapi_calls
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', started_at)
ORDER BY hour_bucket DESC;

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_call_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW call_analytics;
END;
$$ LANGUAGE plpgsql;
```

## 7. Data Integrity and Consistency

### Current Risks
- Missing foreign key constraints in some relationships
- No data validation at database level
- Potential for orphaned records

### Improvements
```sql
-- Add missing constraints
ALTER TABLE call_transcripts 
ADD CONSTRAINT fk_call_transcripts_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE CASCADE;

ALTER TABLE tool_calls 
ADD CONSTRAINT fk_tool_calls_call_id 
FOREIGN KEY (call_id) REFERENCES vapi_calls(call_id) ON DELETE CASCADE;

-- Data validation constraints
ALTER TABLE vapi_calls ADD CONSTRAINT chk_status 
CHECK (status IN ('active', 'completed', 'failed', 'abandoned'));

ALTER TABLE vapi_calls ADD CONSTRAINT chk_priority 
CHECK (priority IN ('P1', 'P2', 'P3', 'P4'));

ALTER TABLE leads ADD CONSTRAINT chk_urgency 
CHECK (urgency_level IN ('P1', 'P2', 'P3', 'P4'));

-- Ensure data consistency
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
    NEW.call_duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_call_data_trigger
BEFORE INSERT OR UPDATE ON vapi_calls
FOR EACH ROW EXECUTE FUNCTION validate_call_data();
```

## 8. Missing Components Analysis

### Critical Missing Elements
1. **Call Transcripts Table**: Referenced in code but not created in schema
2. **Tool Calls Table**: Referenced but missing in migration
3. **Rate Limiting**: No implementation for webhook endpoints  
4. **Structured Logging**: Only basic console.error
5. **Health Checks**: No system health monitoring
6. **Backup Strategy**: No automated backup configuration
7. **Migration Versioning**: Only single migration file

### Implementation Priority
1. **Immediate (P1)**: Add missing tables, fix data consistency
2. **Short-term (P2)**: Implement rate limiting, structured logging
3. **Medium-term (P3)**: Add caching, health checks, monitoring
4. **Long-term (P4)**: Implement advanced analytics, ML insights

## Next Steps

1. **Database Schema Fixes** - Create missing tables and constraints
2. **Service Layer Refactoring** - Extract business logic from webhook
3. **Error Handling Implementation** - Add proper error types and retry logic
4. **Performance Optimization** - Add indexes and query optimization
5. **Monitoring Setup** - Implement structured logging and health checks