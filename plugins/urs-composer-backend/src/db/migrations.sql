/**
 * URS Composer PostgreSQL Schema & Migrations
 * 
 * These migrations establish the P1A data model:
 * - Business capabilities (persisted)
 * - Requirement versions (immutable snapshots)
 * - Baselines (immutable requirement set snapshots)
 * - Approval workflows (configurable templates)
 * - Approval instances (concrete approvals)
 * - Audit trail (append-only)
 */

-- ============================================================================
-- BUSINESS CAPABILITIES (Persisted)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_capabilities (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  domain VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED, RETIRED
  source VARCHAR(255),
  documentation_ref VARCHAR(500),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX idx_business_capabilities_status 
  ON business_capabilities(status);

CREATE INDEX idx_business_capabilities_domain 
  ON business_capabilities(domain);

-- ============================================================================
-- REQUIREMENT SETS (Original URS aggregate)
-- ============================================================================

CREATE TABLE IF NOT EXISTS requirement_sets (
  id VARCHAR(255) PRIMARY KEY,
  requirement_set_id VARCHAR(100) NOT NULL UNIQUE, -- e.g., URS-DP-ABC123
  version_number INTEGER DEFAULT 1,

  -- Business context
  business_need TEXT NOT NULL,
  desired_outcome TEXT,
  business_value TEXT,
  stakeholders TEXT, -- JSON array
  process_context TEXT,

  -- Solution context
  solution_type VARCHAR(50),
  solution_name VARCHAR(255),
  solution_catalog_ref VARCHAR(500), -- e.g., component:default/oee

  -- Scope
  scope TEXT,
  out_of_scope TEXT,

  -- Regulatory
  gxp_relevance VARCHAR(50),
  patient_impact BOOLEAN DEFAULT FALSE,
  data_integrity_impact BOOLEAN DEFAULT FALSE,
  electronic_records BOOLEAN DEFAULT FALSE,

  -- Metadata
  status VARCHAR(50) DEFAULT 'DRAFT',
  template_version VARCHAR(50),
  approval_workflow_id VARCHAR(255), -- FK to approval_workflows
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revision INTEGER DEFAULT 1 -- Optimistic concurrency

);

CREATE INDEX idx_requirement_sets_status 
  ON requirement_sets(status);

CREATE INDEX idx_requirement_sets_solution_type 
  ON requirement_sets(solution_type);

CREATE INDEX idx_requirement_sets_approval_workflow 
  ON requirement_sets(approval_workflow_id);

-- ============================================================================
-- REQUIREMENT VERSIONS (P1A: Versioned snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS requirement_versions (
  id VARCHAR(255) PRIMARY KEY,
  requirement_id VARCHAR(100) NOT NULL, -- Logical ID, e.g., URS-OEE-001
  version VARCHAR(50) NOT NULL, -- e.g., "1.0", "1.1"
  version_number INTEGER NOT NULL,
  requirement_set_id VARCHAR(255) NOT NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,
  rationale TEXT,
  category VARCHAR(100),
  priority VARCHAR(50),
  acceptance_intent TEXT,

  -- Classification
  gxp_relevance VARCHAR(50),
  source VARCHAR(255),
  owner VARCHAR(255),

  -- Versioning
  status VARCHAR(50) DEFAULT 'DRAFT',
  revision_of VARCHAR(255), -- FK to previous version
  revision_reason TEXT,
  superseded_by VARCHAR(255), -- FK to next version

  -- Audit
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  revision INTEGER DEFAULT 1,

  -- FK
  FOREIGN KEY (requirement_set_id) REFERENCES requirement_sets(id),
  CONSTRAINT unique_requirement_version UNIQUE (requirement_id, version)
);

CREATE INDEX idx_requirement_versions_requirement_id 
  ON requirement_versions(requirement_id);

CREATE INDEX idx_requirement_versions_requirement_set_id 
  ON requirement_versions(requirement_set_id);

CREATE INDEX idx_requirement_versions_status 
  ON requirement_versions(status);

CREATE INDEX idx_requirement_versions_version 
  ON requirement_versions(version);

-- ============================================================================
-- BASELINES (P1A: Immutable requirement set snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS baselines (
  id VARCHAR(255) PRIMARY KEY,
  requirement_set_id VARCHAR(255) NOT NULL,
  baseline_version VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',

  -- References to exact requirement versions (JSON array of version IDs)
  requirement_version_ids TEXT NOT NULL, -- JSON array

  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  superseded_by VARCHAR(255), -- FK to next baseline
  revision INTEGER DEFAULT 1,

  -- FK
  FOREIGN KEY (requirement_set_id) REFERENCES requirement_sets(id),
  CONSTRAINT unique_baseline_version UNIQUE (requirement_set_id, baseline_version)
);

CREATE INDEX idx_baselines_requirement_set_id 
  ON baselines(requirement_set_id);

CREATE INDEX idx_baselines_status 
  ON baselines(status);

CREATE INDEX idx_baselines_baseline_version 
  ON baselines(baseline_version);

-- ============================================================================
-- APPROVAL WORKFLOWS (P1A: Configurable templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_workflows (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Steps stored as JSON for flexibility
  steps TEXT NOT NULL, -- JSON array of {sequence, role, required, allowSkip}

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX idx_approval_workflows_name 
  ON approval_workflows(name);

-- ============================================================================
-- APPROVAL INSTANCES (P1A: Concrete approval runs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_instances (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL,
  baseline_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'NOT_STARTED',

  current_step_sequence INTEGER DEFAULT 0,

  started_by VARCHAR(255) NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_by VARCHAR(255),
  completed_at TIMESTAMP,

  revision INTEGER DEFAULT 1,

  -- FK
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id),
  FOREIGN KEY (baseline_id) REFERENCES baselines(id)
);

CREATE INDEX idx_approval_instances_baseline_id 
  ON approval_instances(baseline_id);

CREATE INDEX idx_approval_instances_status 
  ON approval_instances(status);

CREATE INDEX idx_approval_instances_workflow_id 
  ON approval_instances(workflow_id);

-- ============================================================================
-- APPROVAL STEPS (P1A: Steps within an approval instance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_steps (
  id VARCHAR(255) PRIMARY KEY,
  approval_instance_id VARCHAR(255) NOT NULL,
  sequence INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',

  assigned_to VARCHAR(255),
  decision VARCHAR(50), -- APPROVED, REJECTED, SKIPPED
  comment TEXT,
  acted_by VARCHAR(255),
  acted_at TIMESTAMP,

  -- FK
  FOREIGN KEY (approval_instance_id) REFERENCES approval_instances(id)
);

CREATE INDEX idx_approval_steps_approval_instance_id 
  ON approval_steps(approval_instance_id);

CREATE INDEX idx_approval_steps_status 
  ON approval_steps(status);

CREATE INDEX idx_approval_steps_role 
  ON approval_steps(role);

-- ============================================================================
-- AUDIT TRAIL (Append-only, immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_version VARCHAR(50),
  event_type VARCHAR(100) NOT NULL,

  old_value TEXT, -- JSON
  new_value TEXT, -- JSON

  actor VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  correlation_id VARCHAR(255),
  reason TEXT,

  metadata TEXT -- JSON for additional context
);

CREATE INDEX idx_audit_events_entity_id 
  ON audit_events(entity_id);

CREATE INDEX idx_audit_events_entity_type 
  ON audit_events(entity_type);

CREATE INDEX idx_audit_events_actor 
  ON audit_events(actor);

CREATE INDEX idx_audit_events_timestamp 
  ON audit_events(timestamp);

-- ============================================================================
-- SEED DATA: BUSINESS CAPABILITIES
-- ============================================================================

INSERT INTO business_capabilities (
  id, name, description, domain, status, source, created_by, created_at
) VALUES
  (
    'business-capability:make/equipment-performance-management',
    'Equipment Performance Management',
    'Operations must be able to understand equipment effectiveness and its major losses.',
    'make',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:make/equipment-usage-management',
    'Equipment Usage Management',
    'Operations must be able to determine when equipment was used and for which manufacturing context.',
    'make',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:make/material-dispensing',
    'Material Dispensing',
    'Operators must be able to dispense the correct material and quantity for the applicable manufacturing operation.',
    'make',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:make/environmental-monitoring',
    'Environmental Monitoring',
    'Monitor environmental conditions (temperature, humidity, pressure) in manufacturing areas.',
    'make',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:make/batch-traceability',
    'Batch Traceability',
    'Maintain complete traceability of material batches through manufacturing.',
    'make',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:quality/compliance-documentation',
    'Compliance Documentation',
    'Generate and maintain compliance documentation for regulatory requirements.',
    'quality',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:quality/change-management',
    'Change Management',
    'Control and document changes to manufacturing processes and systems.',
    'quality',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:supply/material-inventory',
    'Material Inventory Management',
    'Track and manage material inventory across manufacturing sites.',
    'supply',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:supply/supplier-quality',
    'Supplier Quality Management',
    'Monitor and assess quality of materials from suppliers.',
    'supply',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'business-capability:analytics/production-analytics',
    'Production Analytics',
    'Analyze production data to identify trends, bottlenecks, and optimization opportunities.',
    'analytics',
    'ACTIVE',
    'docs/capability-matrix.md',
    'system',
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED DATA: APPROVAL WORKFLOWS
-- ============================================================================

INSERT INTO approval_workflows (
  id, name, description, steps, created_by, created_at
) VALUES
  (
    'standard-gxp-urs',
    'Standard GxP URS Approval',
    'Three-step approval for GxP-relevant requirements',
    '[
      {"sequence": 1, "role": "BUSINESS_REVIEWER", "required": true, "allowSkip": false},
      {"sequence": 2, "role": "PRODUCT_MANAGER", "required": true, "allowSkip": false},
      {"sequence": 3, "role": "QUALITY_REVIEWER", "required": true, "allowSkip": false}
    ]',
    'system',
    CURRENT_TIMESTAMP
  ),
  (
    'non-gxp-urs',
    'Non-GxP URS Approval',
    'Two-step approval for non-GxP requirements',
    '[
      {"sequence": 1, "role": "BUSINESS_REVIEWER", "required": true, "allowSkip": false},
      {"sequence": 2, "role": "PRODUCT_MANAGER", "required": true, "allowSkip": false}
    ]',
    'system',
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;
