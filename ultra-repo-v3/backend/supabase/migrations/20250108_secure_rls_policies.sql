-- Secure RLS Policies Update - Production Ready
-- Date: 2025-01-08
-- Purpose: Replace overly permissive RLS policies with secure, role-based access

-- ============================================
-- STEP 1: Drop existing insecure policies
-- ============================================

-- Drop overly permissive intervention policies
DROP POLICY IF EXISTS "Anyone can view interventions" ON interventions;
DROP POLICY IF EXISTS "Anyone can insert interventions" ON interventions;
DROP POLICY IF EXISTS "Anyone can update interventions" ON interventions;
DROP POLICY IF EXISTS "Anyone can delete interventions" ON interventions;

-- Drop overly permissive call policies
DROP POLICY IF EXISTS "Anyone can view calls" ON calls;
DROP POLICY IF EXISTS "Anyone can insert calls" ON calls;
DROP POLICY IF EXISTS "Anyone can update calls" ON calls;
DROP POLICY IF EXISTS "Anyone can delete calls" ON calls;

-- ============================================
-- STEP 2: Create secure role-based policies
-- ============================================

-- INTERVENTIONS TABLE POLICIES
-- Read: Authenticated users only
CREATE POLICY "authenticated_users_view_interventions" ON interventions
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Insert: Service role (webhooks) and authenticated admins
CREATE POLICY "service_role_insert_interventions" ON interventions
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.role() = 'authenticated' AND auth.jwt() ->> 'user_role' = 'admin')
  );

-- Update: Service role and authenticated admins only
CREATE POLICY "authorized_update_interventions" ON interventions
  FOR UPDATE 
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.role() = 'authenticated' AND auth.jwt() ->> 'user_role' IN ('admin', 'technician'))
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.role() = 'authenticated' AND auth.jwt() ->> 'user_role' IN ('admin', 'technician'))
  );

-- Delete: Admin role only
CREATE POLICY "admin_delete_interventions" ON interventions
  FOR DELETE 
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.role() = 'authenticated' AND auth.jwt() ->> 'user_role' = 'admin')
  );

-- CALLS TABLE POLICIES
-- Read: Authenticated users only
CREATE POLICY "authenticated_users_view_calls" ON calls
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Insert: Service role only (webhook endpoint)
CREATE POLICY "service_role_insert_calls" ON calls
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Update: Service role only
CREATE POLICY "service_role_update_calls" ON calls
  FOR UPDATE 
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Delete: Nobody can delete calls (audit trail)
-- No delete policy = no deletes allowed

-- ============================================
-- STEP 3: Create policies for new tables if missing
-- ============================================

-- SMS_LOGS TABLE (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_logs') THEN
    -- Enable RLS
    ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
    
    -- Read: Authenticated users
    CREATE POLICY IF NOT EXISTS "authenticated_view_sms_logs" ON sms_logs
      FOR SELECT 
      USING (
        auth.role() = 'authenticated' OR
        auth.jwt() ->> 'role' = 'service_role'
      );
    
    -- Insert: Service role only
    CREATE POLICY IF NOT EXISTS "service_role_insert_sms_logs" ON sms_logs
      FOR INSERT 
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
    
    -- No update or delete allowed (audit trail)
  END IF;
END $$;

-- RATE_LIMITS TABLE (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') THEN
    -- Ensure RLS is enabled
    ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
    
    -- Only service role can manage rate limits
    DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;
    
    CREATE POLICY "service_role_manage_rate_limits" ON rate_limits
      FOR ALL 
      USING (auth.jwt() ->> 'role' = 'service_role')
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- ============================================
-- STEP 4: Create user roles table if not exists
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'technician', 'viewer', 'operator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY IF NOT EXISTS "users_view_own_role" ON user_roles
  FOR SELECT 
  USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY IF NOT EXISTS "admin_manage_roles" ON user_roles
  FOR ALL 
  USING (
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================
-- STEP 5: Create function to get user role
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = $1;
  
  RETURN COALESCE(user_role, 'viewer'); -- Default to viewer if no role
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Create JWT hook to include user role
-- ============================================

CREATE OR REPLACE FUNCTION add_user_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Add user role to JWT claims
  NEW.raw_app_meta_data = NEW.raw_app_meta_data || 
    jsonb_build_object('user_role', get_user_role(NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for JWT enhancement (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'add_user_role_to_jwt_trigger'
  ) THEN
    CREATE TRIGGER add_user_role_to_jwt_trigger
      BEFORE INSERT OR UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION add_user_role_to_jwt();
  END IF;
END $$;

-- ============================================
-- STEP 7: Grant necessary permissions
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant appropriate permissions on tables
GRANT SELECT ON interventions TO authenticated;
GRANT ALL ON interventions TO service_role;

GRANT SELECT ON calls TO authenticated;
GRANT ALL ON calls TO service_role;

-- ============================================
-- STEP 8: Create audit log for sensitive operations
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can view audit logs
CREATE POLICY IF NOT EXISTS "admin_view_audit_logs" ON audit_logs
  FOR SELECT 
  USING (
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can insert audit logs
CREATE POLICY IF NOT EXISTS "service_role_insert_audit_logs" ON audit_logs
  FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- STEP 9: Create audit trigger function
-- ============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      new_data,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Add audit triggers to sensitive tables
-- ============================================

-- Audit trigger for interventions
DROP TRIGGER IF EXISTS audit_interventions_trigger ON interventions;
CREATE TRIGGER audit_interventions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Audit trigger for user_roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================

-- Check RLS is enabled on all important tables
/*
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('interventions', 'calls', 'sms_logs', 'rate_limits', 'user_roles', 'audit_logs');
*/

-- List all policies
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- Test as authenticated user (replace with actual user ID)
/*
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'user-uuid-here';
SET LOCAL request.jwt.claim.user_role TO 'viewer';

-- Should work
SELECT * FROM interventions LIMIT 1;

-- Should fail
INSERT INTO interventions (client_name) VALUES ('Test');
*/

COMMENT ON SCHEMA public IS 'Secure RLS policies implemented - Production Ready 2025-01-08';