-- Migration: Enforce audit log immutability via database roles and policies
-- Ensures AuditLog records cannot be modified or deleted by application roles

-- Create a restricted application role (if not exists)
-- This role will be used by the application and will have restricted permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lims_app_role') THEN
    CREATE ROLE lims_app_role;
  END IF;
END
$$;

-- Revoke all privileges on AuditLog from public and lims_app_role
REVOKE ALL ON TABLE "AuditLog" FROM PUBLIC;
REVOKE ALL ON TABLE "AuditLog" FROM lims_app_role;

-- Grant only INSERT and SELECT on AuditLog (no UPDATE or DELETE)
-- The application can only append to the audit log and read it
GRANT SELECT, INSERT ON TABLE "AuditLog" TO lims_app_role;

-- Create a trigger function to prevent updates and deletes on AuditLog
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog records are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Create triggers to enforce immutability at the database level
-- This is a defense-in-depth measure beyond role permissions
DROP TRIGGER IF EXISTS prevent_audit_log_update ON "AuditLog";
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_delete ON "AuditLog";
CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON FUNCTION prevent_audit_log_modification() IS 'Prevents modification or deletion of audit log records for immutability';
COMMENT ON TRIGGER prevent_audit_log_update ON "AuditLog" IS 'Ensures audit log records cannot be updated';
COMMENT ON TRIGGER prevent_audit_log_delete ON "AuditLog" IS 'Ensures audit log records cannot be deleted';

-- Note: To apply lims_app_role to your application user:
-- GRANT lims_app_role TO your_app_user;
-- This should be done separately in your database setup/deployment process
