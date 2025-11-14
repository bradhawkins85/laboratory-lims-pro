-- Migration: Add audit triggers for automatic audit logging
-- AC: DB-level triggers as backstop so audit logging cannot be bypassed by future code

-- Function to get current user info (from application context)
-- In a real system, this would be set by the application using SET LOCAL
CREATE OR REPLACE FUNCTION get_audit_context()
RETURNS TABLE (
  actor_id UUID,
  actor_email TEXT,
  ip TEXT,
  user_agent TEXT
) AS $$
BEGIN
  -- Try to get from session variables set by application
  -- If not set, use system user as fallback
  RETURN QUERY SELECT 
    COALESCE(current_setting('app.actor_id', TRUE)::UUID, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(current_setting('app.actor_email', TRUE), 'system@lims.local'),
    COALESCE(current_setting('app.ip', TRUE), '127.0.0.1'),
    COALESCE(current_setting('app.user_agent', TRUE), 'database-trigger');
END;
$$ LANGUAGE plpgsql STABLE;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_ip TEXT;
  v_user_agent TEXT;
  v_changes JSONB;
  v_action "AuditAction";
BEGIN
  -- Get audit context
  SELECT actor_id, actor_email, ip, user_agent 
  INTO v_actor_id, v_actor_email, v_ip, v_user_agent
  FROM get_audit_context();

  -- Determine action and build changes
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
    INSERT INTO "AuditLog" (
      id, "actorId", "actorEmail", ip, "userAgent", action, 
      "table", "recordId", changes, at
    ) VALUES (
      gen_random_uuid(),
      v_actor_id,
      v_actor_email,
      v_ip,
      v_user_agent,
      v_action,
      TG_TABLE_NAME,
      NEW.id,
      v_changes,
      NOW()
    );
    
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    -- Only log if there are actual changes
    IF (to_jsonb(OLD) = to_jsonb(NEW)) THEN
      RETURN NEW;
    END IF;
    
    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
    
    INSERT INTO "AuditLog" (
      id, "actorId", "actorEmail", ip, "userAgent", action, 
      "table", "recordId", changes, at
    ) VALUES (
      gen_random_uuid(),
      v_actor_id,
      v_actor_email,
      v_ip,
      v_user_agent,
      v_action,
      TG_TABLE_NAME,
      NEW.id,
      v_changes,
      NOW()
    );
    
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
    
    INSERT INTO "AuditLog" (
      id, "actorId", "actorEmail", ip, "userAgent", action, 
      "table", "recordId", changes, at
    ) VALUES (
      gen_random_uuid(),
      v_actor_id,
      v_actor_email,
      v_ip,
      v_user_agent,
      v_action,
      TG_TABLE_NAME,
      OLD.id,
      v_changes,
      NOW()
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all business tables
-- Jobs
DROP TRIGGER IF EXISTS audit_job_trigger ON "Job";
CREATE TRIGGER audit_job_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Samples
DROP TRIGGER IF EXISTS audit_sample_trigger ON "Sample";
CREATE TRIGGER audit_sample_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Sample"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TestAssignments
DROP TRIGGER IF EXISTS audit_test_assignment_trigger ON "TestAssignment";
CREATE TRIGGER audit_test_assignment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "TestAssignment"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- COAReport
DROP TRIGGER IF EXISTS audit_coa_report_trigger ON "COAReport";
CREATE TRIGGER audit_coa_report_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "COAReport"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Clients
DROP TRIGGER IF EXISTS audit_client_trigger ON "Client";
CREATE TRIGGER audit_client_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Client"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Methods
DROP TRIGGER IF EXISTS audit_method_trigger ON "Method";
CREATE TRIGGER audit_method_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Method"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Specifications
DROP TRIGGER IF EXISTS audit_specification_trigger ON "Specification";
CREATE TRIGGER audit_specification_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Specification"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Sections
DROP TRIGGER IF EXISTS audit_section_trigger ON "Section";
CREATE TRIGGER audit_section_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Section"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TestDefinitions
DROP TRIGGER IF EXISTS audit_test_definition_trigger ON "TestDefinition";
CREATE TRIGGER audit_test_definition_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "TestDefinition"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TestPacks
DROP TRIGGER IF EXISTS audit_test_pack_trigger ON "TestPack";
CREATE TRIGGER audit_test_pack_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "TestPack"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Attachments
DROP TRIGGER IF EXISTS audit_attachment_trigger ON "Attachment";
CREATE TRIGGER audit_attachment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Attachment"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON FUNCTION audit_trigger_func() IS 'Automatic audit logging trigger function - ensures all changes are logged';
COMMENT ON FUNCTION get_audit_context() IS 'Gets audit context from application session variables';
