# URS Composer — Refined Architecture (Business Capability as Anchor)

**Status**: ✅ REPOSITORY ASSESSMENT COMPLETE  
**Date**: 2026-08-25  
**Decision**: `BUSINESS_CAPABILITY_SOURCE: DOCUMENTATION_ONLY → NEW_MINIMAL_MODEL_REQUIRED`

---

## Critical Finding: Business Capability as Upstream Anchor

### Current State

**Capability Matrix** (`docs/capability-matrix.md`):
- ✅ **Exists** as authoritative **documentation**
- ✅ Lists **Wave 1 Golden Paths**: MQTT Temperature, REST Equipment, OEE Data Product
- ✅ Lists **Platform Components**: Health, Observability, REST API, REST Source, MQTT Consumer, Time-Series
- ✅ Maps **Release Status**, **Commercial Status**, **Implementation Status**
- ✅ States: "Authoritative mapping of what the running product is"

**Problem**: Capability Matrix is **documentation only**, not a queryable domain model.

---

## Decision: Business Capability Model

**BUSINESS_CAPABILITY_SOURCE: NEW_MINIMAL_MODEL_REQUIRED**

### Rationale

1. **Capability Matrix is canonical but static** — Not in Catalog, not queryable via API
2. **No Backstage kind** — Not a System, Component, or API entity type
3. **URS Composer needs to reference it programmatically** — Authors must select from existing capabilities
4. **Future traversal requires relationships** — "What business capabilities does Solution X enable?"

### Minimal Model (P0)

Create a **lightweight, reference-based** business capability model:

```typescript
// packages/urs-composer/src/types/capability.ts

export interface BusinessCapability {
  id: string;                        // business-capability:equipment/performance-management
  name: string;                      // Equipment Performance Management
  description: string;               // What this capability enables
  category: string;                  // equipment|material|process|analytics|integration
  source: 'CATALOG' | 'DOCUMENTATION';
  sourceRef?: string;                // If from Catalog
  documentationRef?: string;         // Link to capability-matrix.md
  relatedComponents?: string[];      // Catalog refs: component:default/mqtt-consumer
  createdAt?: Date;
}
```

**Implementation**:
- Load from **hardcoded seed** in P0 (derived from capability-matrix.md)
- Store in-memory cache
- Later (P1): Load from Catalog or dedicated endpoint
- No database table in P0 (reference-only)

### Seed Data (P0)

```typescript
// packages/urs-composer/src/data/businessCapabilities.ts

export const BUSINESS_CAPABILITIES: BusinessCapability[] = [
  {
    id: 'business-capability:make/equipment-performance-management',
    name: 'Equipment Performance Management',
    description: 'Operations must understand equipment effectiveness and major losses.',
    category: 'equipment',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
    relatedComponents: [
      'component:default/mqtt-consumer',
      'component:default/time-series-storage',
      'component:default/rest-api',
    ],
  },
  {
    id: 'business-capability:make/equipment-usage-tracking',
    name: 'Equipment Usage Management',
    description: 'Operations must determine when equipment was used and for which manufacturing context.',
    category: 'equipment',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/material-dispensing',
    name: 'Material Dispensing',
    description: 'Operators must dispense correct material and quantity for manufacturing operations.',
    category: 'material',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/environmental-monitoring',
    name: 'Environmental Monitoring',
    description: 'Monitor environmental conditions (temperature, humidity, pressure) in manufacturing areas.',
    category: 'process',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/batch-traceability',
    name: 'Batch Traceability',
    description: 'Maintain complete traceability of material batches through manufacturing.',
    category: 'process',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
];
```

---

## Revised URS Data Model

### Core Hierarchy

```
BUSINESS_CAPABILITY
  ↓ (supported by 1+)
BUSINESS_NEED
  ↓ (defined by 1+)
REQUIREMENT_SET (URS)
  ↓ (contains)
URSRequirement
  ↓ (implemented by)
SOLUTION (Project/Plugin/Component/Data Product)
  ↓ (composed of)
COMPONENT/COMPOSITION
  ↓ (verified by)
TEST
  ↓ (produces)
EVIDENCE
```

### RequirementSet Schema (Revised)

```sql
CREATE TABLE urs_requirement_sets (
  id UUID PRIMARY KEY,
  requirement_id VARCHAR(50) UNIQUE NOT NULL,    -- URS-WD-001, URS-EQ-001, etc.
  version_number INT NOT NULL DEFAULT 1,
  
  -- BUSINESS LAYER
  business_capability_refs TEXT[] NOT NULL,       -- ["business-capability:make/equipment-performance-management"]
  business_need TEXT NOT NULL,                    -- "Operations must understand equipment effectiveness and major losses."
  
  -- SOLUTION LAYER
  solution_type VARCHAR(50) NOT NULL,             -- PROJECT|PLUGIN|COMPONENT|DATA_PRODUCT
  solution_name VARCHAR(255) NOT NULL,            -- "OEE Data Product", "Weight & Dispensing"
  solution_catalog_ref VARCHAR(255),              -- component:default/oee-data-product (optional)
  
  -- CONTEXT
  business_problem TEXT NOT NULL,                 -- Problem description
  desired_outcome TEXT,                           -- Expected business value
  scope TEXT,                                     -- What is in/out of scope
  stakeholders TEXT,                              -- Who is involved
  
  -- REGULATORY
  gxp_relevance VARCHAR(50),                      -- DIRECT|INDIRECT|NONE
  patient_impact BOOLEAN,
  data_integrity_impact BOOLEAN,
  electronic_records BOOLEAN,
  
  -- METADATA
  status VARCHAR(50) NOT NULL,                    -- DRAFT|IN_REVIEW|APPROVED|SUPERSEDED|RETIRED
  template_version VARCHAR(50),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  
  -- AUDIT
  version_comment TEXT
);

CREATE TABLE urs_requirements (
  id UUID PRIMARY KEY,
  requirement_set_id UUID NOT NULL REFERENCES urs_requirement_sets(id),
  requirement_id VARCHAR(50) UNIQUE NOT NULL,    -- URS-WD-001, URS-WD-002, etc.
  
  -- REQUIREMENT DATA
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,                       -- "The solution shall..."
  rationale TEXT,                                -- Why this requirement?
  priority VARCHAR(50),                          -- MUST|SHOULD|COULD|WONT
  acceptance_criteria TEXT,
  
  -- CLASSIFICATION
  gxp_relevance VARCHAR(50),
  source VARCHAR(255),                           -- Who specified it?
  owner VARCHAR(255),
  
  -- STATUS
  status VARCHAR(50) NOT NULL,                   -- DRAFT|IN_REVIEW|APPROVED|SUPERSEDED|RETIRED
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Relationships are stored separately
CREATE TABLE urs_relationships (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,              -- BUSINESS_CAPABILITY|URS_REQUIREMENT|SOLUTION|COMPONENT|TEST
  source_id VARCHAR(255) NOT NULL,               -- ID or ref
  
  relationship_type VARCHAR(50) NOT NULL,        -- ENABLED_BY|REQUIRES|DEFINED_BY|IMPLEMENTED_BY|USES|VERIFIED_BY|PRODUCES
  
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255),
  target_external_ref VARCHAR(255),              -- For Catalog refs: component:default/mqtt-consumer
  
  metadata JSONB,                                -- Additional context
  created_at TIMESTAMP NOT NULL
);
```

### Example: OEE Data Product

```
BUSINESS_CAPABILITY:
  equipment-performance-management

BUSINESS_NEED:
  Operations must understand equipment effectiveness and major losses.

URS-REQUIREMENT_SET (URS):
  id: urs-requirement-sets.oee-001
  business_capability_refs: ["business-capability:make/equipment-performance-management"]
  business_need: "Operations must understand..."
  solution_type: DATA_PRODUCT
  solution_name: "OEE Data Product"
  solution_catalog_ref: "component:default/oee-data-product"

URS-REQUIREMENTS:
  URS-OEE-001: "The solution shall calculate OEE for defined equipment and production interval."
  URS-OEE-002: "The solution shall maintain three-month rolling history of OEE values."
  URS-OEE-003: "The solution shall provide REST API for OEE query."

RELATIONSHIPS:
  business-capability:make/equipment-performance-management
    → ENABLED_BY
    → urs_requirement_set:oee-001
  
  urs_requirement_set:oee-001
    → IMPLEMENTED_BY
    → component:default/oee-data-product
  
  component:default/oee-data-product
    → USES
    → component:default/mqtt-consumer
    → component:default/rest-source
    → component:default/time-series-storage
    → component:default/rest-api
```

---

## Revised URS Wizard Flow

**8 Steps** (Reordered):

### **STEP 1 — Business Capability**

**Purpose**: Anchor to the business problem this URS solves.

**Interaction**:
```
"Which business capability does this solution enable?"

[ Search or select from list ]

☑ Equipment Performance Management
☑ Equipment Usage Management
☐ Material Dispensing
☐ Environmental Monitoring
☐ Batch Traceability

[View Details] [More Info from Capability Matrix]
```

**Captured Data**:
- `businessCapabilityRefs[]` — Selected capabilities

---

### **STEP 2 — Business Need & Context**

**Purpose**: Define WHY this solution is needed.

**Capture**:
- Business Problem (2-3 sentences)
- Desired Outcome
- Business Value (what improves?)
- Stakeholders (who benefits?)
- Process/Value-Stream Context
- Scope (what's included)
- Out of Scope (what's NOT)

**Captured Data**:
- `businessProblem`
- `desiredOutcome`
- `stakeholders`
- `scope`

**Important**: No implementation details. No "Use PostgreSQL" or "REST API". Only business context.

---

### **STEP 3 — Solution Context**

**Purpose**: Define WHAT solution type and optional Catalog reference.

**Capture**:
```
Solution Type:
  ☐ PROJECT (enterprise initiative, system)
  ☐ PLUGIN (Backstage extension)
  ☐ COMPONENT (software service, library)
  ☐ DATA_PRODUCT (reusable data asset)

Solution Name: [________________]

Catalog Reference (optional):
  [Search existing components]
  Selected: component:default/oee-data-product
```

**Captured Data**:
- `solutionType`
- `solutionName`
- `solutionCatalogRef` (optional)

---

### **STEP 4 — Regulatory Context**

**Purpose**: GxP impact assessment (non-final decision).

**Capture**:
```
Does this impact regulated processes?

GxP Relevance:
  ☐ Direct (affects manufacturing/QA decisions)
  ☐ Indirect (supports but doesn't decide)
  ☐ None (administrative only)

Patient Impact: [ ] Yes [ ] No [ ] Unknown
Data Integrity Impact: [ ] Yes [ ] No [ ] Unknown
Electronic Records: [ ] Yes [ ] No [ ] Unknown
Electronic Signatures: [ ] Yes [ ] No [ ] Unknown
```

**Important Note**:
> This assessment helps determine validation scope. It does NOT approve or claim regulatory compliance. A Quality/Regulatory Authority must make the final GxP determination outside this system.

**Captured Data**:
- `gxpRelevance`
- `patientImpact`
- `dataIntegrityImpact`
- `electronicRecords`

---

### **STEP 5 — Functional Requirements**

**Purpose**: Define WHAT the solution must do (system-agnostic).

**Interface**: Repeatable requirement entry

```
+ Add Requirement

[Requirement 1]
Title:    "The solution shall calculate OEE..."
Statement: "The solution shall provide OEE calculation for any equipment and time period..."
Priority: [MUST ▼]
Acceptance Criteria: "OEE shall be expressed as percentage; formula: (Good Count/Plan Count) × 100; accurate to 0.1%"
GxP Relevance: [DIRECT ▼]
Source: "Operations Requirements Workshop"
Owner: "Manufacturing Excellence Team"

[Requirement 2]
...
```

**Important**: Requirement IDs (URS-WD-001, URS-WD-002) are auto-assigned server-side.

**Captured Data**:
- `requirements[]` — Array of structured requirements

---

### **STEP 6 — Non-Functional Requirements**

**Purpose**: Quality attributes (performance, security, availability, etc.)

**Capture**:
```
Security:
  [Textarea] "All data must be encrypted in transit. API access restricted to authenticated users."

Performance:
  [Textarea] "OEE query response time <2 seconds for any equipment."

Availability:
  [Textarea] "Service availability target: 99.5% uptime."

Data Integrity:
  [Textarea] "All calculations must be auditable and reproducible."

Auditability:
  [Textarea] "Changes to OEE formulas must be tracked and approved."
```

**Captured Data**:
- `securityRequirements`
- `performanceRequirements`
- `availabilityRequirements`
- `dataIntegrityRequirements`
- `auditabilityRequirements`

---

### **STEP 7 — Interfaces & Data** (if applicable)

**Purpose**: System topology and data characteristics (for DATA_PRODUCT, COMPONENT, PROJECT types)

**Capture**:
```
Source Systems:
  [Textarea] "MQTT: Equipment state, process events. REST: ERP-maintained equipment master data."

Target Systems:
  [Textarea] "REST API consumers: Dashboard, Reporting, Advanced Analytics."

Data Ownership:
  [Textarea] "Equipment master data owned by Operations. OEE calculations owned by Manufacturing Engineering."

Data Criticality:
  [Textarea] "High: OEE affects production decisions. Medium: Intermediate calculated values."

Data Retention:
  [Textarea] "Keep rolling 3-month history online. Archive older data after 2 years."
```

**Captured Data**:
- `systemInterfaces`
- `dataOwnership`
- `dataRetention`

---

### **STEP 8 — Review & Submit**

**Purpose**: Display complete URS, run quality checks, optional AI review, submit for approval.

**Display** (Read-Only Summary):
```
📌 REQUIREMENT SET: OEE Data Product

👉 BUSINESS ANCHOR
├─ Capability: Equipment Performance Management
├─ Problem: Operations lack visibility into equipment effectiveness
└─ Outcome: Reduce downtime; improve OEE tracking

📋 SOLUTION
├─ Type: DATA_PRODUCT
├─ Name: OEE Data Product
└─ Catalog: component:default/oee-data-product

⚖️ REGULATORY
├─ GxP Relevance: DIRECT
├─ Patient Impact: No
├─ Data Integrity Impact: Yes
└─ Electronic Records: Yes

📝 REQUIREMENTS
├─ URS-OEE-001: Calculate OEE... [MUST]
├─ URS-OEE-002: Maintain history... [MUST]
└─ URS-OEE-003: Provide REST API... [MUST]

🔍 QUALITY CHECKS
✅ No ambiguous language detected
✅ All requirements testable
✅ No implementation language in functional requirements
⚠️  GxP Relevance marked DIRECT: Quality review recommended

[Run AI Review (optional)] [View Full Details]

[← BACK]  [SUBMIT FOR REVIEW] [SAVE AS DRAFT]
```

**On Submit**:
- Status → `IN_REVIEW`
- Approval workflow triggers
- Audit event recorded
- Notifications sent to reviewers

---

## Knowledge Graph Foundation

### Relationship Types

```
ENABLED_BY:
  Business Capability ← ENABLED_BY ← Business Need

REQUIRES:
  Business Need ← REQUIRES ← (may reference other capabilities)

DEFINED_BY:
  Business Need ← DEFINED_BY ← URS Requirement Set

CONTAINS:
  URS Requirement Set ← CONTAINS ← URS Requirement

IMPLEMENTED_BY:
  URS Requirement Set ← IMPLEMENTED_BY ← Solution

USES:
  Solution ← USES ← Component / Composition

VERIFIED_BY:
  Solution ← VERIFIED_BY ← Test

PRODUCES:
  Test ← PRODUCES ← Evidence

TRACES_TO (bidirectional):
  Test ↔ TRACES_TO ↔ URS Requirement (for change-impact)

AFFECTS (bidirectional):
  Component ↔ AFFECTS ↔ Business Capability (for change-impact)
```

### Example Query (Future P1/P2)

```
Query: "What business capabilities are at risk if Component X is changed?"

Traversal:
  component:default/mqtt-consumer
    ← USES
    ← data-product:default/oee
    ← IMPLEMENTED_BY
    ← urs_requirement_set:oee-001
    ← DEFINED_BY
    ← business-capability:make/equipment-performance-management

Result: Equipment Performance Management is affected.
```

---

## Architecture Diagram (Placeholder)

```
┌─────────────────────────────────────────────────────────────────────┐
│ BUSINESS                                                            │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Business Capability (Equipment Performance Management)         │  │
│ │ ↓ ENABLED_BY                                                  │  │
│ │ Business Need (Operations need equipment effectiveness view)  │  │
│ └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ DEFINED_BY
┌──────────────────────────▼──────────────────────────────────────────┐
│ REQUIREMENTS (URS)                                                  │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Requirement Set (URS-OEE)                                     │  │
│ │ Contains: URS-OEE-001, URS-OEE-002, URS-OEE-003              │  │
│ │ Status: APPROVED (immutable)                                  │  │
│ │ ↓ IMPLEMENTED_BY                                              │  │
│ │ Solution (OEE Data Product)                                   │  │
│ └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ USES
┌──────────────────────────▼──────────────────────────────────────────┐
│ ENGINEERING (Components / Composition)                              │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ MQTT Consumer | REST Source | Time-Series DB | REST API      │  │
│ │ ↓ VERIFIED_BY                                                 │  │
│ │ Tests (Unit, Integration, Contract)                          │  │
│ │ ↓ PRODUCES                                                    │  │
│ │ Evidence (Test Reports, Coverage, Metrics)                   │  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (Revised)

### Business Capabilities

```
GET /api/urs/capabilities              # List business capabilities
GET /api/urs/capabilities/:id          # Get capability detail
```

### Requirement Sets (URS)

```
POST   /api/urs/requirement-sets                           # Create
GET    /api/urs/requirement-sets                           # List
GET    /api/urs/requirement-sets/:id                       # Get detail
PUT    /api/urs/requirement-sets/:id                       # Update (draft only)
POST   /api/urs/requirement-sets/:id/submit                # Submit for review
POST   /api/urs/requirement-sets/:id/approve               # Approve
POST   /api/urs/requirement-sets/:id/reject                # Reject
GET    /api/urs/requirement-sets/:id/history               # Version history
GET    /api/urs/requirement-sets/:id/audit                 # Audit trail
```

### Requirements

```
POST   /api/urs/requirement-sets/:setId/requirements       # Add
GET    /api/urs/requirement-sets/:setId/requirements       # List
PUT    /api/urs/requirement-sets/:setId/requirements/:reqId # Update (draft)
```

### Relationships

```
POST   /api/urs/relationships                              # Create
GET    /api/urs/relationships/from/:entityId               # Outbound
GET    /api/urs/relationships/to/:entityId                 # Inbound
GET    /api/urs/traceability/:entityId                     # Full graph traversal (P1)
```

### Quality & Validation

```
POST   /api/urs/validate                                   # Check requirement
POST   /api/urs/requirement-sets/:id/validate              # Check entire set
```

---

## Permissions (Revised)

Add to `packages/platform-common/src/permissions.ts`:

```typescript
export const ursReadPermission = createPermission({
  name: 'urs.read',
  attributes: { action: 'read' },
  description: 'Read URS requirement sets, requirements, and capability references',
});

export const ursCreatePermission = createPermission({
  name: 'urs.create',
  attributes: { action: 'create' },
  description: 'Create new requirement sets (as AUTHOR)',
});

export const ursManagePermission = createPermission({
  name: 'urs.manage',
  attributes: { action: 'update' },
  description: 'Edit draft requirement sets (AUTHOR or OWNER)',
});

export const ursApprovePermission = createPermission({
  name: 'urs.approve',
  attributes: { action: 'update' },
  description: 'Review and approve requirement sets (OWNER+)',
});

export const ursAdminPermission = createPermission({
  name: 'urs.admin',
  attributes: { action: 'update' },
  description: 'Administer URS templates and retire requirement sets (ADMIN)',
});
```

**Role Mapping**:
- `urs.read` → VIEWER+
- `urs.create` → DEVELOPER+
- `urs.manage` → OWNER+ (with AUTHOR check)
- `urs.approve` → OWNER+
- `urs.admin` → ADMIN

---

## Example: Weight & Dispensing URS

### Step 1 — Business Capability
```
Selected: Material Dispensing
Description: "Operators must dispense correct material and quantity for manufacturing operations."
```

### Step 2 — Business Need
```
Problem:
  "Manual material dispensing is error-prone. Operators may dispense wrong material, wrong quantity, or miss traceability requirements."

Desired Outcome:
  "System-guided dispensing with automatic verification and traceability."

Stakeholders:
  "Manufacturing Operations, Quality Assurance, Regulatory Affairs"
```

### Step 3 — Solution Context
```
Solution Type: COMPONENT (reusable dispensing logic)
Solution Name: "Weight & Dispensing Module"
```

### Step 4 — Regulatory Context
```
GxP Relevance: DIRECT
Patient Impact: YES (material selection affects product quality)
Data Integrity Impact: YES (dispensed quantity must be accurate and immutable)
Electronic Records: YES (dispensing records are manufacturing evidence)
```

### Step 5 — Functional Requirements
```
URS-WD-001:
  "The solution shall enable authorized operators to identify material to be dispensed
   against the applicable manufacturing instruction."
  Priority: MUST

URS-WD-002:
  "The solution shall verify that selected material is eligible for the intended
   dispensing operation (e.g., correct grade, lot number, expiration date)."
  Priority: MUST

URS-WD-003:
  "The solution shall capture actual dispensed quantity and associated unit of measure."
  Priority: MUST

URS-WD-004:
  "The solution shall maintain traceability between dispensed material, source batch,
   dispensing operation, and resulting manufacturing context."
  Priority: MUST

URS-WD-005:
  "The solution shall prevent unauthorized modification of approved dispensing records."
  Priority: MUST
```

### Step 6 — Non-Functional Requirements
```
Security:
  "Only authorized manufacturing personnel can perform dispensing actions.
   All actions recorded with user/timestamp."

Auditability:
  "Every dispensing action immutable once confirmed. Change history preserved for 10 years."

Usability:
  "Operator interface must be operable by shift personnel with minimal training."
```

### Step 7 — Interfaces & Data
```
Source Systems:
  "ERP (SAP): Material master, manufacturing orders, production schedules.
   Scale/Weight System: Real-time weight data via REST API or serial connection."

Target Systems:
  "Manufacturing Execution System: Dispensing completion confirmation.
   Warehouse System: Material lot depletion tracking."

Data Retention:
  "Dispensing records: 5 years + archival. Material master snapshots: 10 years."
```

### Step 8 — Review & Submit
```
Status: READY FOR REVIEW

Quality Checks:
✅ All requirements testable
✅ No implementation language ("Use Oracle DB" etc.)
✅ Traceability clear
⚠️  GxP DIRECT: Quality review required

[SUBMIT FOR REVIEW]
```

---

## Customer Value

### Why Business Capability Matters

**Business Alignment**:
- Technology is explicitly linked to business outcomes
- Executives understand which solutions enable which capabilities
- Portfolio transparency: "We have 3 solutions enabling Equipment Performance but only 1 for Batch Traceability"

**Change Impact**:
- When a component is changed, traverse upward: "What business capabilities are affected?"
- When a capability demand shifts, traverse downward: "Which solutions must adapt?"

**Reuse & Consolidation**:
- Multiple solutions can support the same capability without duplicating business definitions
- Identify consolidation opportunities: "These two products both address material-tracking; consolidate?"

**Validation Focus**:
- Validation evidence can be interpreted in context of business use and intended use
- "We have evidence for 80% of URS-WD requirements; identify validation gaps"
- Enables future regulatory impact analysis without claiming compliance

**Portfolio Transparency**:
- Report to customers and regulators: "Pharma Data Factory enables X business capabilities"
- Show validation coverage by capability

---

## What Changes from Previous Plan

| Aspect | Previous | Revised |
|--------|----------|---------|
| **Anchor** | Solution Type (first step) | Business Capability (first step) |
| **URS Wizard Steps** | 8 steps starting with Solution Type | 8 steps starting with Business Capability |
| **Data Model** | RequirementSet → Solution | BusinessCapability → BusinessNeed → RequirementSet → Solution |
| **Relationships** | Basic edges | ENABLED_BY, REQUIRES, DEFINED_BY, IMPLEMENTED_BY, etc. |
| **Capability Source** | NEW_MODEL_REQUIRED | DOCUMENTATION-BASED SEED (hardcoded in P0; queryable later) |
| **Graph Traversal** | Future only | Prepared (schema ready; queries deferred to P1) |

---

## P0 Scope (UNCHANGED)

✅ Create Business Capability reference model (hardcoded seed)
✅ Create RequirementSet with capability references
✅ Implement 8-step wizard (revised flow)
✅ Implement approval workflow
✅ Implement audit trail
✅ Implement relationship model (schema + basic API)
✅ Tests, documentation

❌ Full graph traversal queries (P1)
❌ AI-driven generation (P2)
❌ FS/TDS generation (P2)
❌ Change-impact engine (P2)

---

## Status

**REVISED ARCHITECTURE: COMPLETE**

Ready for final approval to proceed with P0 implementation.
