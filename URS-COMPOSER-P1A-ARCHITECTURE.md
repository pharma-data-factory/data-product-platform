# URS COMPOSER P1A ARCHITECTURE

**Status**: DESIGN PHASE  
**Date**: 2026-08-25  
**Target**: PostgreSQL persistence, requirement versioning, configurable approval workflows

---

## 1. P0 → P1A TRANSITION

### P0 State
- ✅ In-memory storage
- ✅ Business Capability-driven model
- ✅ Single requirement set lifecycle (DRAFT → IN_REVIEW → APPROVED)
- ✅ Fixed 3-step approval workflow
- ✅ Append-only audit trail
- ✅ 5 Backstage permissions

### P1A Goals
- ✅ PostgreSQL persistence (migrations provided)
- ✅ Requirement versioning (immutable approved versions)
- ✅ Baseline snapshots (immutable requirement set snapshots)
- ✅ Configurable approval workflows (2 templates seeded)
- ✅ Approval instances (concrete approval runs)
- ✅ Enhanced audit trail
- ✅ Optimistic concurrency control
- ✅ Transactional operations

### Backward Compatibility
- ✅ Existing P0 repository interface preserved
- ✅ Existing P0 routes continue to work
- ✅ New features are opt-in
- ✅ In-memory repository still functional (no immediate DB requirement)

---

## 2. DATA MODEL

### P0 Entities (Preserved)
- `RequirementSet` — URS aggregate root
- `URSRequirement` — Individual requirement
- `Approval` — P0 approval record
- `AuditEvent` — Append-only audit

### P1A New Entities

#### RequirementVersion (Immutable Snapshot)
```yaml
id: UUID
requirementId: "URS-OEE-001"       # Logical ID
version: "1.0"                     # Semantic version
versionNumber: 100                 # For sorting
status: "APPROVED"                 # DRAFT, IN_REVIEW, APPROVED, SUPERSEDED, RETIRED
revisionOf: <UUID>                 # Previous version
revisionReason: string             # Why was this revision created
supersededBy: <UUID>               # Next approved version
createdBy: actor
createdAt: timestamp
approvedBy: actor (optional)
approvedAt: timestamp (optional)
revision: integer                  # Optimistic concurrency
```

#### Baseline (Immutable Requirement Set Snapshot)
```yaml
id: UUID
requirementSetId: string
baselineVersion: "1.0"             # Semantic version
status: "DRAFT" | "APPROVED"       # Only two states
requirementVersionIds:             # Exact requirement versions
  - "version-uuid-1"
  - "version-uuid-2"
createdBy: actor
createdAt: timestamp
approvedBy: actor (optional)
approvedAt: timestamp (optional)
supersededBy: <UUID> (optional)
revision: integer
```

#### ApprovalWorkflow (Template)
```yaml
id: "standard-gxp-urs"             # Stable ID
name: "Standard GxP URS Approval"
description: string
steps:
  - sequence: 1
    role: "BUSINESS_REVIEWER"
    required: true
    allowSkip: false
  - sequence: 2
    role: "PRODUCT_MANAGER"
    required: true
    allowSkip: false
  - sequence: 3
    role: "QUALITY_REVIEWER"
    required: true
    allowSkip: false
createdAt: timestamp
updatedAt: timestamp
```

#### ApprovalInstance (Concrete Approval Run)
```yaml
id: UUID
workflowId: "standard-gxp-urs"
baselineId: <baseline-UUID>
status: "NOT_STARTED" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "CANCELLED"
currentStepSequence: 1             # Which step is active
startedBy: actor
startedAt: timestamp
completedBy: actor (optional)
completedAt: timestamp (optional)
steps: [ApprovalStep, ...]
revision: integer
```

#### ApprovalStep (Step Within Instance)
```yaml
id: UUID
sequence: 1
role: "BUSINESS_REVIEWER"
status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | "SKIPPED"
assignedTo: actor (optional)
decision: "APPROVED" | "REJECTED" | "SKIPPED" (optional)
comment: string
actedBy: actor (optional)
actedAt: timestamp (optional)
```

#### BusinessCapability (Persisted)
```yaml
id: "business-capability:make/equipment-performance-management"
name: string
description: string
domain: string
status: "ACTIVE" | "DEPRECATED" | "RETIRED"
source: "docs/capability-matrix.md"
documentation_ref: string
version: integer                   # Optimistic concurrency
createdAt: timestamp
updatedAt: timestamp
```

---

## 3. LIFECYCLE: REQUIREMENT VERSIONING

### Creating and Submitting a Requirement

```
1. Create Requirement (v1.0)
   Status: DRAFT
   
2. Edit requirement
   Status: DRAFT
   
3. Submit for Review
   Status: IN_REVIEW
   
4. Approve
   Status: APPROVED
   (Immutable)
```

### Creating a Revision

```
URS-OEE-001 v1.0 APPROVED
     │
     │ Create Revision (reason: "Update OEE formula")
     ▼
URS-OEE-001 v1.1 DRAFT
     │
     │ Edit
     ▼
URS-OEE-001 v1.1 DRAFT (modified)
     │
     │ Submit
     ▼
URS-OEE-001 v1.1 IN_REVIEW
     │
     │ Approve
     ▼
URS-OEE-001 v1.1 APPROVED
     
Result:
v1.0 → SUPERSEDED
v1.1 → APPROVED
```

### Supersession Logic

When `v1.1` is approved:
1. Existing approved versions are marked `SUPERSEDED`
2. Reference to the new version is stored (`v1.0.supersededBy = v1.1.id`)
3. Historical data is NOT deleted
4. All versions remain queryable

---

## 4. LIFECYCLE: REQUIREMENT SET VERSIONING (BASELINE)

### Creating and Approving a Baseline

```
1. Create Baseline v1.0
   Contains: URS-OEE-001 v1.0, URS-OEE-002 v1.0
   Status: DRAFT
   
2. Submit Baseline for Approval
   (Selects workflow: standard-gxp-urs)
   (Creates ApprovalInstance)
   
3. Approval Process
   Step 1: BUSINESS_REVIEWER approves
   Step 2: PRODUCT_MANAGER approves
   Step 3: QUALITY_REVIEWER approves
   
4. Approve Baseline
   Status: APPROVED
   (Immutable snapshot)
```

### Controlled Revision

```
Baseline URS-OEE v1.0 APPROVED
     │
     │ Create Revision (reason: "Updated requirement formula")
     ▼
Baseline URS-OEE v1.1 DRAFT
     Contains: URS-OEE-001 v1.1, URS-OEE-002 v1.0
     
     │ (after approval workflow)
     ▼
     Status: APPROVED
     
Result:
v1.0 → SUPERSEDED
v1.1 → APPROVED
```

---

## 5. APPROVAL WORKFLOW MODEL

### Template Definition

Two workflows seeded in migrations:

#### "standard-gxp-urs" (GxP-relevant)
```yaml
id: standard-gxp-urs
steps:
  - role: BUSINESS_REVIEWER (required)
  - role: PRODUCT_MANAGER (required)
  - role: QUALITY_REVIEWER (required)
```

#### "non-gxp-urs" (Non-GxP)
```yaml
id: non-gxp-urs
steps:
  - role: BUSINESS_REVIEWER (required)
  - role: PRODUCT_MANAGER (required)
```

### Workflow Selection

```
GxPRelevance.DIRECT    → standard-gxp-urs
GxPRelevance.INDIRECT  → standard-gxp-urs
GxPRelevance.NONE      → non-gxp-urs
<unspecified>          → standard-gxp-urs (default)
```

### Approval Instance Lifecycle

```
NOT_STARTED
      │
      │ activateFirstStep()
      ▼
IN_PROGRESS (Step 1: ACTIVE)
      │
      ├─ approveStep() → Step 1: APPROVED
      │                 Step 2: ACTIVE
      │
      ├─ rejectStep() → Step 1: REJECTED
      │                 Instance: REJECTED
      │
      ▼
IN_PROGRESS (Step 2: ACTIVE)
      │
      ├─ approveStep() → Step 2: APPROVED
      │                 Step 3: ACTIVE
      │
      ▼
IN_PROGRESS (Step 3: ACTIVE)
      │
      ├─ approveStep() → Step 3: APPROVED
      │                 ALL STEPS APPROVED
      │                 Instance: APPROVED
      │
      ├─ rejectStep() → Step 3: REJECTED
      │                 Instance: REJECTED
      │
      ▼
APPROVED | REJECTED
```

---

## 6. REPOSITORY ABSTRACTION

### Interface: IURSRepository

```typescript
interface IURSRepository {
  // Business Capabilities
  createBusinessCapability(...): Promise<BusinessCapabilityPersisted>
  getBusinessCapability(id): Promise<BusinessCapabilityPersisted | null>
  listBusinessCapabilities(...): Promise<{items, total}>

  // Requirement Versions
  createRequirementVersion(...): Promise<RequirementVersion>
  getRequirementVersion(id): Promise<RequirementVersion | null>
  getRequirementVersions(requirementId, orderBy): Promise<RequirementVersion[]>
  getCurrentApprovedVersion(requirementId): Promise<RequirementVersion | null>
  updateRequirementVersion(...): Promise<void>

  // Baselines
  createBaseline(...): Promise<Baseline>
  getBaseline(id): Promise<Baseline | null>
  listBaselines(...): Promise<{items, total}>
  getCurrentApprovedBaseline(requirementSetId): Promise<Baseline | null>
  updateBaseline(...): Promise<void>

  // Workflows & Approvals
  createApprovalWorkflow(...): Promise<ApprovalWorkflow>
  getApprovalWorkflow(id): Promise<ApprovalWorkflow | null>
  listApprovalWorkflows(...): Promise<{items, total}>

  createApprovalInstance(...): Promise<ApprovalInstance>
  getApprovalInstance(id): Promise<ApprovalInstance | null>
  listApprovalInstances(baselineId): Promise<ApprovalInstance[]>
  updateApprovalInstance(...): Promise<void>

  createApprovalStep(...): Promise<ApprovalStep>
  getApprovalStep(id): Promise<ApprovalStep | null>
  listApprovalSteps(instanceId): Promise<ApprovalStep[]>
  updateApprovalStep(...): Promise<void>

  // Audit
  createAuditEvent(...): Promise<void>
  getEntityAuditTrail(entityId, entityType): Promise<AuditEvent[]>

  // Transactions
  beginTransaction(): Promise<Transaction>
}
```

### Implementations

**P0/P1A In-Memory** (`URSRepository` in memory)
- Maps for each entity type
- No database dependency
- No transaction overhead
- Suitable for development and testing

**P1B/P1C PostgreSQL** (TBD)
- Full SQL with migrations
- Connection pooling
- Real transactions
- Production-ready

---

## 7. VERSIONING SERVICE

```typescript
parseVersion(versionStr)        → {major, minor}
formatVersion(major, minor)     → string
nextMinorVersion(current)       → "1.0" → "1.1"
nextMajorVersion(current)       → "1.5" → "2.0"
compareVersions(v1, v2)         → -1 | 0 | 1
isVersionHigher(v1, v2)         → boolean
getVersionNumber(versionStr)    → 100 * major + minor
```

Supports flexible versioning semantics without hard-coded rules.

---

## 8. APPROVAL WORKFLOW SERVICE

```typescript
selectWorkflow(gxpRelevance)           → ApprovalWorkflow
createApprovalInstance(...)            → ApprovalInstance
approveStep(instance, stepId, actor)   → {updated, allApproved}
rejectStep(instance, stepId, actor)    → ApprovalInstance
activateFirstStep(instance)            → void
getActiveStep(instance)                → ApprovalStep | null
canApprove(step, userRole)             → boolean
```

Handles:
- Workflow selection based on GxP relevance
- Instance lifecycle management
- Step progression
- Rejection behavior

---

## 9. ENHANCED URSService

### New Methods (P1A)

```typescript
// Versioning
createRevision(previousVersionId, reason, actor)     → RequirementVersion
getVersionHistory(requirementId)                      → RequirementVersion[]
getVersion(versionId)                                 → RequirementVersion | null

// Baselines
createBaseline(requirementSetId, versionIds, ...)    → Baseline
getBaseline(id)                                       → Baseline | null
listBaselines(requirementSetId, limit, offset)       → {items, total}
getCurrentApprovedBaseline(requirementSetId)         → Baseline | null
approveBaseline(baselineId, actor, workflowId)       → {baseline, workflow}

// Workflows
listApprovalWorkflows(limit, offset)                 → {items, total}
getApprovalWorkflow(id)                              → ApprovalWorkflow | null

// Approvals
createApprovalInstance(baselineId, workflowId, ...)  → ApprovalInstance
getApprovalInstance(id)                              → ApprovalInstance | null
getBaselineApprovals(baselineId)                     → ApprovalInstance[]
```

### Preserved Methods (P0)

All P0 methods continue to work:
- `getCapabilities()`
- `createRequirementSet()`
- `submitForReview()`
- etc.

---

## 10. PERMISSIONS

### Existing (P0)
```
urs.read   → view requirements, baselines, versions
urs.create → create new requirements/revisions
urs.manage → edit draft, submit
urs.approve → approve/reject in workflow
urs.admin → manage workflows
```

### Suggested Mapping (P1A)

| Action | Permission | Who |
|--------|-----------|-----|
| View baseline | urs.read | VIEWER+ |
| Create revision | urs.create | DEVELOPER+ |
| Edit draft | urs.manage | OWNER+ |
| Approve in workflow | urs.approve | OWNER+ |
| Manage workflows | urs.admin | ADMIN |

No new permissions needed in P1A.

---

## 11. API ENDPOINTS

### P0 (Preserved)
```
POST   /requirement-sets
GET    /requirement-sets
GET    /requirement-sets/:id
POST   /requirement-sets/:id/submit
POST   /requirement-sets/:id/approve
POST   /requirement-sets/:id/reject
GET    /requirement-sets/:id/approvals
GET    /requirement-sets/:id/audit
```

### P1A (New)

#### Versioning
```
POST   /requirements/:id/revisions                    → Create revision
GET    /requirements/:id/versions                     → Version history
GET    /requirements/:id/versions/:version            → Get specific version
```

#### Baselines
```
POST   /requirement-sets/:id/baselines                → Create baseline
GET    /requirement-sets/:id/baselines                → List baselines
GET    /baselines/:id                                 → Get baseline
GET    /baselines/:id/requirements                    → Get requirements in baseline
POST   /baselines/:id/submit                          → Submit for approval
```

#### Workflows
```
GET    /approval-workflows                            → List workflows
GET    /approval-workflows/:id                        → Get workflow
```

#### Approvals
```
POST   /baselines/:id/approvals                       → Create approval instance
GET    /baselines/:id/approvals                       → List approval instances
GET    /approvals/:id                                 → Get approval instance
POST   /approvals/:id/steps/:stepId/approve           → Approve step
POST   /approvals/:id/steps/:stepId/reject            → Reject step
GET    /approvals/:id/steps                           → Get approval steps
```

---

## 12. AUDIT TRAIL EVENTS

### P0 Events
```
REQUIREMENT_CREATED
REQUIREMENT_UPDATED
REQUIREMENT_SUBMITTED
REQUIREMENT_APPROVED
REQUIREMENT_REJECTED
```

### P1A New Events
```
REQUIREMENT_VERSION_CREATED
REQUIREMENT_VERSION_APPROVED
REQUIREMENT_VERSION_SUPERSEDED
REQUIREMENT_VERSION_RETIRED

BASELINE_CREATED
BASELINE_APPROVED
BASELINE_SUPERSEDED

APPROVAL_INSTANCE_STARTED
APPROVAL_INSTANCE_APPROVED
APPROVAL_INSTANCE_REJECTED

APPROVAL_STEP_APPROVED
APPROVAL_STEP_REJECTED
APPROVAL_STEP_SKIPPED

WORKFLOW_SELECTED
```

All events include:
```yaml
id: UUID
timestamp: Date
actor: string
action: string
entityType: string
entityId: string
entityVersion: string (optional)
metadata: {...}
```

---

## 13. CONCURRENCY CONTROL

### Optimistic Locking
```
Each entity has: revision INTEGER DEFAULT 1

Update operation:
  WHERE id = ? AND revision = ?
  SET revision = revision + 1, ...

If affected rows = 0:
  409 CONFLICT
```

Prevents silent overwrites when multiple clients edit.

### Transactions
```
Interface: Transaction
  commit(): Promise<void>
  rollback(): Promise<void>
  execute<T>(fn): Promise<T>

Usage:
  tx = await repository.beginTransaction()
  try {
    await tx.execute(() => updateVersion(...))
    await tx.execute(() => supersedePrevious(...))
    await tx.execute(() => createAuditEvent(...))
    await tx.commit()
  } catch (e) {
    await tx.rollback()
  }
```

---

## 14. MIGRATION STRATEGY

### File: `/src/db/migrations.sql`

Includes:

1. **Business Capabilities**
   - 10 capabilities seeded from capability-matrix.md

2. **Requirement Versions**
   - Normalized versioning with version numbers
   - Unique constraint on (requirementId, version)

3. **Baselines**
   - JSON array of version IDs (flexible)
   - Immutability via status enum

4. **Approval Workflows**
   - 2 templates seeded (standard-gxp-urs, non-gxp-urs)
   - Steps as JSON for flexibility

5. **Approval Instances**
   - Concrete workflow runs
   - FK to workflow and baseline

6. **Audit Events**
   - Append-only table
   - JSON metadata column

### Indexes
- All foreign keys indexed
- Status columns indexed (frequent queries)
- Timeline columns indexed (audit searches)

---

## 15. FRONTEND UPDATES (MINIMAL P1A)

### Version History Tab
Show requirement versions:
```
VERSION    STATUS        DATE
1.1        DRAFT         2026-08-25
1.0        SUPERSEDED    2026-08-25
```

Allow:
- View details of each version
- Create revision from approved version

### Baseline Tab
Show approved baselines:
```
Baseline v1.0  APPROVED  25 Aug 2026
  - 12 Requirements
  
[Create Revision]
[View Details]
```

### Approval Tab (Enhanced)
Show active workflow:
```
Workflow: Standard GxP URS Approval

1 Business Reviewer       APPROVED       ✓
2 Product Manager         ACTIVE         → [Approve] [Reject]
3 Quality Reviewer        PENDING
```

---

## 16. TESTING STRATEGY

### Unit Tests
- Version number generation
- Supersession logic
- Workflow selection
- Step progression

### Integration Tests
- Create revision end-to-end
- Create baseline end-to-end
- Approval workflow end-to-end
- Concurrency conflicts
- Audit trail completeness

### Critical Scenario
```
1. Create URS-OEE-001 v1.0, submit, approve
2. Verify v1.0 APPROVED, others queryable
3. Create revision v1.1
4. Verify v1.1 DRAFT (new version)
5. Modify v1.1, submit, approve
6. Verify v1.0 SUPERSEDED, v1.1 APPROVED
7. Query version history, verify order
8. Query audit trail, verify events
```

---

## 17. NON-GOALS (P1A)

❌ Do not implement:
- 8-step URS wizard (P2)
- Validation Expert integration (P2)
- Electronic signatures (P3)
- Catalog Graph visualization (P2+)
- LLM requirement generation (future)
- Change impact analysis (future)

---

## 18. CLEAN SEAMS FOR FUTURE

### Validation Expert Integration Seam
```
GET /baselines/:id

Returns:
{
  id, baselineVersion, status,
  requirementVersionIds: [...],
  businessCapabilityRefs: [...],
  businessNeed,
  gxpRelevance,
  requirements: [
    {
      id, version, title, statement,
      acceptanceIntent, gxpRelevance,
      priority, ...
    }
  ],
  approvalStatus: "APPROVED",
  approvedAt: timestamp,
  approvedBy: actor,
  auditTrail: [...],
  ...
}
```

This contract allows Validation Expert to:
- Retrieve exact requirement versions
- Link tests to approved versions
- Trace evidence back to requirements
- Query audit trail for change history

---

## 19. SUMMARY TABLE

| Aspect | P0 | P1A | Comment |
|--------|----|----|---------|
| Storage | Memory | Memory (P1B: PostgreSQL) | Abstraction ready |
| Requirement Versioning | ❌ | ✅ | Immutable approved versions |
| Baselines | ❌ | ✅ | Immutable snapshots |
| Workflows | Fixed 3-step | Configurable (2 templates) | User-driven approval |
| Approval Instances | ❌ | ✅ | Concrete approval runs |
| Supersession | ❌ | ✅ | Historical preservation |
| Concurrency | ❌ | ✅ | Optimistic locking |
| Transactions | ❌ | ✅ | Atomic operations |
| Audit Events | Basic | Enhanced | New event types |
| Permissions | 5 | 5 (no change) | Backward compatible |
| API Endpoints | 8 | +12 new | RESTful consistency |
| Frontend | Landing + Detail | + Version History + Baseline | Minimal changes |

---

## 20. IMPLEMENTATION CHECKLIST

- [ ] Types extended (requirements, baseline, workflow, instance)
- [ ] Repository interface created (IURSRepository)
- [ ] Repository in-memory impl updated
- [ ] Versioning service created
- [ ] Approval workflow service created
- [ ] URSService extended with P1A methods
- [ ] Routes updated (existing preserved, new added)
- [ ] Permission enforcement on new routes
- [ ] Frontend: version history tab
- [ ] Frontend: baseline tab
- [ ] Frontend: approval tab enhanced
- [ ] Unit tests: versioning, baselines, workflows
- [ ] Integration tests: end-to-end scenarios
- [ ] Audit: new event types
- [ ] Migration file: database schema
- [ ] Migrations: seed workflows and capabilities
- [ ] Final report: URS_COMPOSER_P1A_FINAL_REPORT.md

---

**Architecture ready for P1A implementation.**
