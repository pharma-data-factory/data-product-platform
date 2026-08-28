-- ============================================================================
-- Validation Manager Database Schema
-- GMP-Compliant Requirements Management
-- ============================================================================

-- ============================================================================
-- 1. REQUIREMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS requirements (
  id VARCHAR(255) PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  
  -- GMP Assessment
  gxp_relevance VARCHAR(50) NOT NULL CHECK (gxp_relevance IN ('Direct', 'Indirect', 'Claim-control', 'None')),
  risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('High', 'Medium', 'Low')),
  business_criticality VARCHAR(50) NOT NULL CHECK (business_criticality IN ('High', 'Medium', 'Low')),
  
  -- States
  requirement_state VARCHAR(100) NOT NULL CHECK (requirement_state IN ('BASELINED', 'REJECTED', 'OPEN_POLICY_DEFINITION')),
  implementation_status VARCHAR(100) NOT NULL CHECK (implementation_status IN ('IMPLEMENTED', 'PARTIALLY_IMPLEMENTED', 'NOT_IMPLEMENTED', 'NOT_VERIFIED')),
  verification_status VARCHAR(100) NOT NULL CHECK (verification_status IN ('NOT_EXECUTED', 'PASSED', 'FAILED', 'BLOCKED')),
  
  -- Document Control
  document_id VARCHAR(255) UNIQUE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  last_modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(255) NOT NULL,
  document_status VARCHAR(100) NOT NULL DEFAULT 'DRAFT' CHECK (document_status IN ('DRAFT', 'READY_FOR_APPROVAL', 'APPROVED', 'SIGNED', 'ARCHIVED')),
  
  -- Retention & Lifecycle
  retention_period VARCHAR(50) NOT NULL DEFAULT '3 years' CHECK (retention_period IN ('3 years', '7 years')),
  retire_date DATE,
  archive_until_date DATE,
  
  -- Access Control
  access_control TEXT, -- JSON array of authorized roles
  
  -- Security & Integrity
  encrypted BOOLEAN DEFAULT FALSE,
  encryption_algorithm VARCHAR(100),
  document_hash VARCHAR(64), -- SHA256 hash
  backup_count INTEGER DEFAULT 0,
  last_backup_date TIMESTAMP,
  
  -- Tags & Metadata
  tags TEXT, -- JSON array
  
  CONSTRAINT check_version_format CHECK (version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT check_document_id_format CHECK (document_id ~ '^DOC-\d{4}-[A-Z]+-\d+$' OR document_id IS NULL)
);

CREATE INDEX idx_requirements_state ON requirements(requirement_state);
CREATE INDEX idx_requirements_status ON requirements(document_status);
CREATE INDEX idx_requirements_gxp ON requirements(gxp_relevance);
CREATE INDEX idx_requirements_created_by ON requirements(created_by);
CREATE INDEX idx_requirements_modified_date ON requirements(last_modified_date);

-- ============================================================================
-- 2. APPROVAL RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_records (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(255) NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL CHECK (role IN ('QA_LEAD', 'VALIDATION_LEAD', 'LEGAL', 'SIGNATURE')),
  sequence_order INTEGER NOT NULL CHECK (sequence_order BETWEEN 1 AND 4),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_email VARCHAR(255),
  reviewer_name VARCHAR(255),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approval_date TIMESTAMP,
  comment TEXT,
  signature_id VARCHAR(255),
  
  UNIQUE(requirement_id, role),
  CONSTRAINT check_approval_order CHECK (sequence_order = 1 OR role IN ('VALIDATION_LEAD', 'LEGAL', 'SIGNATURE'))
);

CREATE INDEX idx_approvals_requirement ON approval_records(requirement_id);
CREATE INDEX idx_approvals_status ON approval_records(status);
CREATE INDEX idx_approvals_role ON approval_records(role);
CREATE INDEX idx_approvals_reviewer ON approval_records(reviewer_email);

-- ============================================================================
-- 3. CHANGE LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS change_logs (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(255) NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  change_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_description TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('MAJOR', 'MINOR', 'PATCH')),
  author VARCHAR(255) NOT NULL,
  author_role VARCHAR(100),
  change_control_form VARCHAR(255), -- CC-2026-001, etc.
  reason TEXT,
  affected_fields TEXT, -- JSON array of field names that changed
  
  CONSTRAINT check_cc_format CHECK (change_control_form ~ '^CC-\d{4}-\d{3}$' OR change_control_form IS NULL)
);

CREATE INDEX idx_changelogs_requirement ON change_logs(requirement_id);
CREATE INDEX idx_changelogs_version ON change_logs(version);
CREATE INDEX idx_changelogs_type ON change_logs(change_type);
CREATE INDEX idx_changelogs_date ON change_logs(change_date);

-- ============================================================================
-- 4. AUDIT LOG TABLE (IMMUTABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(255) REFERENCES requirements(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'ARCHIVE')),
  actor VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_reason TEXT,
  changes_json TEXT, -- JSON: {fieldName: {old: ..., new: ...}}
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  session_id VARCHAR(255),
  immutable BOOLEAN NOT NULL DEFAULT TRUE,
  verification_hash VARCHAR(64), -- SHA256 for immutability check
  
  -- This table should be append-only, no UPDATEs allowed
  CONSTRAINT immutable_check CHECK (immutable = TRUE)
);

CREATE INDEX idx_audit_requirement ON audit_logs(requirement_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_actor ON audit_logs(actor);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Create trigger to prevent updates on audit_logs (immutability enforcement)
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutability_trigger
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE PROCEDURE prevent_audit_update();

-- ============================================================================
-- 5. SIGNATURE RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS signature_records (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(255) NOT NULL UNIQUE REFERENCES requirements(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SIGNED', 'EXPIRED', 'REVOKED')),
  certificate_id VARCHAR(255),
  certificate_subject VARCHAR(500),
  certificate_issuer VARCHAR(500),
  signed_date TIMESTAMP,
  signed_by VARCHAR(255),
  document_hash VARCHAR(64), -- SHA256
  signature_value TEXT, -- Base64 encoded
  timestamp_authority VARCHAR(255), -- TSA URL
  tsa_timestamp TIMESTAMP,
  validity_start_date TIMESTAMP,
  validity_end_date TIMESTAMP,
  signature_algorithm VARCHAR(100), -- ECDSA, RSA-2048, etc.
  tsa_response TEXT, -- RFC 3161 response
  
  CONSTRAINT check_sig_dates CHECK (validity_end_date > validity_start_date)
);

CREATE INDEX idx_signatures_requirement ON signature_records(requirement_id);
CREATE INDEX idx_signatures_status ON signature_records(status);
CREATE INDEX idx_signatures_signed_date ON signature_records(signed_date);

-- ============================================================================
-- 6. EXPORTED DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exported_documents (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(255) REFERENCES requirements(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('URS', 'TDS', 'TRACEABILITY')),
  version VARCHAR(20) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  filepath VARCHAR(1000) NOT NULL,
  filesize INTEGER,
  export_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exported_by VARCHAR(255),
  file_hash VARCHAR(64), -- SHA256
  approval_state VARCHAR(100) NOT NULL CHECK (approval_state IN ('APPROVED', 'SIGNED')),
  expiry_date DATE,
  compression_method VARCHAR(50) DEFAULT 'NONE',
  encryption_enabled BOOLEAN DEFAULT FALSE,
  encryption_algorithm VARCHAR(100),
  
  UNIQUE(requirement_id, document_type, version),
  CONSTRAINT check_filename_format CHECK (filename ~ '.*-v[0-9]+\.[0-9]+\.[0-9]+-[0-9]{4}-[0-9]{2}-[0-9]{2}-APPROVED\.(pdf|md)$')
);

CREATE INDEX idx_exports_requirement ON exported_documents(requirement_id);
CREATE INDEX idx_exports_type ON exported_documents(document_type);
CREATE INDEX idx_exports_date ON exported_documents(export_date);

-- ============================================================================
-- 7. SYSTEM USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(100) NOT NULL CHECK (role IN ('QA_LEAD', 'VALIDATION_LEAD', 'LEGAL', 'SIGNATURE', 'PLATFORM_ADMIN', 'DEVELOPER')),
  department VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_date TIMESTAMP,
  phone VARCHAR(20),
  preferred_language VARCHAR(10) DEFAULT 'en'
);

CREATE INDEX idx_users_email ON system_users(email);
CREATE INDEX idx_users_role ON system_users(role);
CREATE INDEX idx_users_active ON system_users(is_active);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES system_users(id) ON DELETE CASCADE,
  requirement_id VARCHAR(255) REFERENCES requirements(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL CHECK (notification_type IN ('APPROVAL_PENDING', 'APPROVAL_REQUESTED', 'REJECTED', 'SIGNED', 'EXPORTED')),
  subject VARCHAR(500),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_date TIMESTAMP,
  sent_via VARCHAR(50) CHECK (sent_via IN ('EMAIL', 'IN_APP', 'BOTH')),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_date TIMESTAMP,
  retention_days INTEGER DEFAULT 30
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_requirement ON notifications(requirement_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_date ON notifications(created_date);

-- ============================================================================
-- 9. CHANGE CONTROL FORMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS change_control_forms (
  id VARCHAR(255) PRIMARY KEY,
  cc_number VARCHAR(50) UNIQUE NOT NULL, -- CC-2026-001, CC-2026-002, etc.
  requirement_id VARCHAR(255) NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('MAJOR', 'MINOR', 'PATCH')),
  description TEXT NOT NULL,
  justification TEXT NOT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED')),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  submitted_date TIMESTAMP,
  implementation_date TIMESTAMP,
  verification_date TIMESTAMP,
  verification_results TEXT,
  affected_areas TEXT, -- JSON array
  testing_required BOOLEAN,
  testing_plan TEXT,
  approvers TEXT -- JSON array of {role, status, date}
);

CREATE INDEX idx_cc_forms_requirement ON change_control_forms(requirement_id);
CREATE INDEX idx_cc_forms_status ON change_control_forms(status);
CREATE INDEX idx_cc_forms_number ON change_control_forms(cc_number);

-- ============================================================================
-- 10. SYSTEM CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_configuration (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR(50) NOT NULL, -- STRING, INTEGER, BOOLEAN, JSON
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(255)
);

-- Insert default configuration
INSERT INTO system_configuration (key, value, description, data_type, is_sensitive) VALUES
  ('approval_timeout_days', '5', 'Days before approval times out', 'INTEGER', FALSE),
  ('approval_chain_order', '[1,2,3,4]', 'Sequence of approval steps', 'JSON', FALSE),
  ('document_export_folder', '/archive/approved-documents/', 'Folder for exported approved documents', 'STRING', FALSE),
  ('document_retention_active_years', '3', 'Years to keep documents in active storage', 'INTEGER', FALSE),
  ('document_retention_archive_years', '7', 'Years to keep documents in archive', 'INTEGER', FALSE),
  ('tsa_enabled', 'true', 'Enable Timestamp Authority for signatures', 'BOOLEAN', FALSE),
  ('tsa_url', 'https://tsa.example.com', 'Timestamp Authority URL', 'STRING', FALSE),
  ('signature_validity_days', '1095', 'Days signature is valid (3 years)', 'INTEGER', FALSE),
  ('dms_enabled', 'false', 'Enable Document Management System integration', 'BOOLEAN', FALSE),
  ('dms_base_url', '', 'DMS base URL', 'STRING', TRUE),
  ('audit_retention_years', '7', 'Years to keep audit logs', 'INTEGER', FALSE)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Current approval status for all requirements
CREATE OR REPLACE VIEW v_approval_status AS
SELECT 
  r.id,
  r.version,
  r.title,
  r.document_status,
  COUNT(CASE WHEN ar.status = 'PENDING' THEN 1 END) as pending_count,
  COUNT(CASE WHEN ar.status = 'APPROVED' THEN 1 END) as approved_count,
  COUNT(CASE WHEN ar.status = 'REJECTED' THEN 1 END) as rejected_count,
  MIN(CASE WHEN ar.status = 'PENDING' THEN ar.role END) as pending_role,
  MAX(ar.approval_date) as last_approval_date
FROM requirements r
LEFT JOIN approval_records ar ON r.id = ar.requirement_id
GROUP BY r.id, r.version, r.title, r.document_status;

-- View: Pending approvals by role
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT 
  ar.requirement_id,
  ar.role,
  ar.reviewer_email,
  r.title,
  r.gxp_relevance,
  r.risk_level,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - r.created_date) as days_waiting,
  CASE 
    WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - r.created_date) > 5 THEN 'OVERDUE'
    WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - r.created_date) > 3 THEN 'URGENT'
    ELSE 'NORMAL'
  END as priority
FROM approval_records ar
JOIN requirements r ON ar.requirement_id = r.id
WHERE ar.status = 'PENDING'
ORDER BY priority DESC, days_waiting DESC;

-- View: Document export statistics
CREATE OR REPLACE VIEW v_export_statistics AS
SELECT 
  document_type,
  COUNT(*) as total_exports,
  SUM(filesize) as total_size,
  MIN(export_date) as oldest_export,
  MAX(export_date) as latest_export,
  COUNT(DISTINCT requirement_id) as unique_requirements
FROM exported_documents
GROUP BY document_type;

-- View: Recent audit activity
CREATE OR REPLACE VIEW v_audit_activity AS
SELECT 
  a.requirement_id,
  a.action,
  a.actor,
  a.actor_role,
  a.timestamp,
  r.title,
  r.version
FROM audit_logs a
LEFT JOIN requirements r ON a.requirement_id = r.id
ORDER BY a.timestamp DESC
LIMIT 100;

-- ============================================================================
-- GRANTS & PERMISSIONS
-- ============================================================================

-- Note: Update with actual application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO backstage_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO backstage_user;
