# URS Composer — P0 Implementation Plan

**Status**: 📋 PLANNING PHASE  
**Date**: 2026-08-25  
**Target Completion**: P0 MVP  
**Phase**: P0 (Foundation)

---

## Executive Summary

The URS Composer is the starting point for a Requirements-Driven Engineering and Continuous Validation architecture. It establishes persistent, versioned, domain-structured User Requirements Specifications as the foundation for all downstream Engineering artifact generation.

**Scope**: Configuration-driven URS creation, approval workflow, audit trail, and relationship model.

**Out of Scope (P1+)**:
- FS/TDS generation
- Automated test generation  
- GitHub change-impact analysis
- Full graph query infrastructure
- AI-driven autonomous generation
- GxP validation claims

---

## 1. Repository Assessment

### 1.1 Backstage Version & Infrastructure

- **Backstage Version**: ^0.36.4 (current CLI)
- **Node**: 22 || 24
- **Database**: PostgreSQL (via plugin-search-backend-module-pg)
- **Authentication**: GitHub OAuth (user provisioning via Catalog)
- **Authorization**: Backstage Permission Framework (PlatformPermissionPolicy)
- **Package Manager**: yarn workspaces
- **Testing**: Jest, Playwright (e2e)
- **Linting**: Backstage CLI lint defaults

### 1.2 Frontend Architecture

- **Framework**: React 18.x
- **UI Components**: Material-UI 4.x + Backstage Core Components
- **Plugin Pattern**: Backstage frontend plugins with route registration
- **Design System**: Consistent with existing Pharma Data Factory UI
- **Routing**: React Router 6.x via `createRoutableExtension`

### 1.3 Backend Architecture

- **Platform**: Backstage backend-plugin-api
- **Express Server**: Express 4.x with promise router
- **Plugin Pattern**: Standalone backend plugins with HTTP router + service layer
- **Database Access**: Via direct database (PostgreSQL)
- **Authentication**: HttpAuthService (provider-neutral)
- **Authorization**: PermissionsService (Permission Framework)
- **Service Pattern**: Separation of router / service / repository layers

### 1.4 Existing Plugin Packages

**Backend Plugins**:
- `plugins/data-products-backend` — Data Product catalog lifecycle
- `plugins/validation-expert-backend` — Test execution framework
- `plugins/model-company-backend` — Factory simulation
- `plugins/nexora-backend` — Industrial provider (MES/Historian/ERP proxies)
- `plugins/entitlements-backend` — Commercial constraints + Golden Path release gating
- `plugins/plugin-directory-backend` — Installed plugin governance
- `plugins/validation-manager-backend` ← NEW (P0 backend authorization hardening)

**Frontend Plugins**:
- `plugins/data-products` — Marketplace, certification, consumption
- `plugins/marketplace` — Integrated with data-products
- `plugins/validation-expert` — Test run UI
- `plugins/model-company` — Factory control UI
- `plugins/nexora-*` (assets, quality, contracts) — Industrial data
- `plugins/plugin-directory` — Plugin governance UI
- `plugins/validation-manager` ← NEW (frontend - currently has basic structure)

**Common Library**:
- `packages/platform-common` — Shared permissions, roles, types

**Internal SDK**:
- `packages/data-product-consumption` — Vendored consumption SDK for generated products

### 1.5 Existing Permission Model

**Platform Roles** (from `platform-common/src/roles.ts`):
- `VIEWER` — Read-only access
- `DEVELOPER` — Create data products, start validation runs
- `OWNER` — Governance, certification, review validation
- `ADMIN` — Platform administration

**Existing Permissions** (excerpt from `platform-common/src/permissions.ts`):
- `validation.read` → VIEWER+
- `validation.review` → OWNER+
- `validation.admin` → ADMIN
- `validationRunStartPermission` → DEVELOPER+
- `validationTestExecutePermission` → DEVELOPER+
- `dataProductViewPermission`, `dataProductCreatePermission`, etc.

**Implementation Note**: New URS permissions will be added to `platform-common/src/permissions.ts` and role mappings will follow the established hierarchy (VIEWER < DEVELOPER < OWNER < ADMIN).

### 1.6 Existing Data Models

**Catalog Entities** (Backstage standard):
- `Component` — Software components (extended as Data Products)
- `System` — Logical groupings
- `API` — Data contracts (stored as `API` with `spec.type: contract`)
- `User` — Platform users with role group memberships
- `Group` — User groups encoding platform roles

**Data Product Extensions** (via annotations/metadata):
- Data product versioning
- Contract version tracking
- CI status
- Quality metrics
- Certification status

**Validation-Expert Model** (file-based for now):
- Validation runs (in-memory store + JSON persistence)
- Test execution history
- YAML-based test suite configuration

**Model Company** (simulation):
- Factory model (YAML)
- Equipment state
- Simulation events

**Note**: No dedicated URS storage yet. The new URS Composer will introduce the first persistent domain model outside of Catalog.

### 1.7 Database Strategy

**Current**: PostgreSQL via Backstage plugins (search backend uses pg)

**For URS Composer**: 
- Will follow existing pattern
- Use PostgreSQL directly or via Backstage database abstraction (if available)
- **Approach**: Create direct pg client in URS backend plugin (consistent with existing backend plugins)
- Schema: Migrations in `plugins/urs-composer-backend/migrations/` (if pattern exists), or inline schema creation in plugin initialization

### 1.8 Existing Catalog Integration

- **Relationships**: Catalog uses `providesApis`, `consumesApis`, `dependsOn` relations
- **Metadata**: Custom annotations for platform-specific data
- **Authority**: Catalog is read-only for entity resolution; custom data stored separately

**For URS**: Will store references to Catalog entities (e.g., `component:default/weight-dispensing`) but will NOT duplicate Catalog entities.

### 1.9 Existing Admin Areas

- Catalog entity management
- Scaffolder template management
- User/group management (org plugin)
- Entitlements management (entitlements plugin)
- Plugin directory (plugin-directory plugin)

**Navigation**: Existing `/platform/` routes house admin functions. URS should integrate there or create a dedicated `/marketplace/urs/` section.

### 1.10 Existing Testing Stack

- **Unit**: Jest (with watch mode)
- **Integration**: Playwright (e2e)
- **Test Structure**: `*.test.ts` / `*.test.tsx` co-located with source
- **Coverage**: Backstage CLI test defaults

### 1.11 Existing CI/CD

- GitHub Actions (implied by scaffold templates and CI status tracking)
- Docker image building for backend
- Build scripts in root package.json

### 1.12 Documentation Structure

- **Architecture**: `docs/architecture.md` (main reference)
- **Specialized**: `docs/*/` subdirectories
- **TechDocs**: Used by platform (TechDocs plugin integrated)
- **Strategy**: Docs are versioned alongside code

---

## 2. What Already Exists (Reusable)

✅ **Authentication & Identity**:
- GitHub OAuth integration
- Backstage identity system
- User provisioning via Catalog

✅ **Authorization**:
- Permission Framework (permissions.ts)
- Role hierarchy (VIEWER → DEVELOPER → OWNER → ADMIN)
- Server-side permission enforcement

✅ **Database**:
- PostgreSQL infrastructure
- Connection pooling

✅ **API Patterns**:
- Express router + service layer
- Backstage backend plugin structure
- Frontend/backend plugin registration

✅ **UI Components**:
- Material-UI + Backstage Core Components
- Consistent design system
- Route registration patterns

✅ **Testing**:
- Jest + Playwright
- Existing test patterns

✅ **Package Structure**:
- Monorepo conventions
- Frontend/backend plugin pairs
- Common library for shared code

---

## 3. What Must Be Created

### 3.1 New Packages

```
plugins/urs-composer/                          # Frontend plugin
  src/
    routes.tsx                                 # Route registration
    pages/
      URSOverviewPage.tsx
      CreateURSPage.tsx
      URSWizardPage.tsx
      URSDetailPage.tsx
      ReviewURSPage.tsx
    components/
      URSWizard/
        StepSolutionType.tsx
        StepBusinessContext.tsx
        StepRegulatoryContext.tsx
        StepFunctionalRequirements.tsx
        StepNonFunctionalRequirements.tsx
        StepInterfacesAndData.tsx
        StepReview.tsx
        StepSubmit.tsx
      RequirementsTable.tsx
      RequirementDetail.tsx
      VersionHistory.tsx
      ReviewWorkflow.tsx
      AuditTrail.tsx
      RelationshipExplorer.tsx
    hooks/
      useURSData.ts
      useTemplates.ts
    api/
      ursClient.ts
    types/
      urs.types.ts

plugins/urs-composer-backend/                  # Backend plugin
  src/
    index.ts
    plugin.ts
    router.ts
    service.ts
    repository.ts
    types.ts
    models/
      Solution.ts
      RequirementSet.ts
      URSRequirement.ts
      RequirementVersion.ts
      Approval.ts
      AuditEvent.ts
      Relationship.ts
    handlers/
      solutionHandlers.ts
      requirementHandlers.ts
      approvalHandlers.ts
      relationshipHandlers.ts
    quality/
      requirementValidator.ts
      qualityEngine.ts
    db/
      schema.ts
      migrations.ts
  migrations/
    001_urs_schema.sql
    002_relationships.sql

packages/urs-templates/                        # Configuration-driven templates
  src/
    index.ts
    types.ts
    loader.ts
  templates/
    project.yaml
    plugin.yaml
    component.yaml
    data-product.yaml
  tests/
    loader.test.ts

packages/urs-sdk/                              # SDK for URS operations (future SDK import)
  src/
    index.ts
    types.ts
    validators.ts
```

### 3.2 Database Schema

**Core Tables**:
- `urs_solutions` — Solution (project/plugin/component/data-product)
- `urs_requirement_sets` — URS grouping
- `urs_requirements` — Individual requirements
- `urs_requirement_versions` — Version history
- `urs_approvals` — Approval workflow state
- `urs_audit_events` — Append-only audit trail
- `urs_relationships` — Graph relationships
- `urs_templates` — Template versioning metadata

**Example Schema** (conceptual):
```sql
CREATE TABLE urs_solutions (
  id UUID PRIMARY KEY,
  requirement_id VARCHAR(50) UNIQUE NOT NULL,  -- URS-WD-001 style
  solution_name VARCHAR(255) NOT NULL,
  solution_type VARCHAR(50) NOT NULL,           -- PROJECT|PLUGIN|COMPONENT|DATA_PRODUCT
  status VARCHAR(50) NOT NULL,                  -- DRAFT|IN_REVIEW|APPROVED|SUPERSEDED|RETIRED
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  template_version VARCHAR(50),
  business_capability TEXT,
  business_problem TEXT,
  gxp_relevance VARCHAR(50),                    -- DIRECT|INDIRECT|NONE
  product_manager VARCHAR(255),
  business_owner VARCHAR(255)
);

CREATE TABLE urs_requirements (
  id UUID PRIMARY KEY,
  solution_id UUID NOT NULL REFERENCES urs_solutions(id),
  requirement_id VARCHAR(50) UNIQUE NOT NULL,  -- URS-WD-001, URS-WD-002, etc.
  version_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,
  rationale TEXT,
  priority VARCHAR(50),                        -- MUST|SHOULD|COULD|WONT
  acceptance_criteria TEXT,
  gxp_relevance VARCHAR(50),
  source VARCHAR(255),
  owner VARCHAR(255),
  status VARCHAR(50) NOT NULL,                 -- DRAFT|IN_REVIEW|APPROVED|SUPERSEDED|RETIRED
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE urs_approvals (
  id UUID PRIMARY KEY,
  solution_id UUID NOT NULL REFERENCES urs_solutions(id),
  review_role VARCHAR(50) NOT NULL,            -- AUTHOR|BUSINESS_REVIEWER|PRODUCT_MANAGER|QUALITY_REVIEWER|ADMIN
  approval_status VARCHAR(50) NOT NULL,        -- PENDING|APPROVED|REJECTED|WAIVED
  approver VARCHAR(255),
  comment TEXT,
  decided_at TIMESTAMP,
  sequence_number INT
);

CREATE TABLE urs_audit_events (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,            -- SOLUTION|REQUIREMENT|APPROVAL|RELATIONSHIP
  entity_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,             -- CREATED|UPDATED|APPROVED|REJECTED|SUPERSEDED|RETIRED
  old_value JSONB,
  new_value JSONB,
  actor VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  correlation_id VARCHAR(255),
  reason TEXT
);

CREATE TABLE urs_relationships (
  id UUID PRIMARY KEY,
  source_entity_id UUID NOT NULL,
  source_entity_type VARCHAR(50) NOT NULL,
  target_entity_id UUID,
  target_entity_type VARCHAR(50),
  target_external_ref VARCHAR(255),            -- e.g., component:default/my-component
  relationship_type VARCHAR(50) NOT NULL,      -- SOURCE|DERIVES_FROM|REFINES|IMPLEMENTS|VERIFIES|MITIGATES|DEPENDS_ON|AFFECTS|SUPERSEDES
  metadata JSONB,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE urs_templates (
  id UUID PRIMARY KEY,
  template_id VARCHAR(100) UNIQUE NOT NULL,    -- project|plugin|component|data-product
  version VARCHAR(50) NOT NULL,
  definition JSONB NOT NULL,                   -- Full template YAML as JSON
  created_at TIMESTAMP NOT NULL
);
```

### 3.3 New Permissions

Add to `packages/platform-common/src/permissions.ts`:

```typescript
// URS Composer permissions
export const ursReadPermission = createPermission({
  name: 'urs.read',
  attributes: { action: 'read' },
});

export const ursCreatePermission = createPermission({
  name: 'urs.create',
  attributes: { action: 'create' },
});

export const ursManagePermission = createPermission({
  name: 'urs.manage',
  attributes: { action: 'update' },
});

export const ursApprovePermission = createPermission({
  name: 'urs.approve',
  attributes: { action: 'update' },
});

export const ursAdminPermission = createPermission({
  name: 'urs.admin',
  attributes: { action: 'update' },
});
```

**Role Mapping**:
- `urs.read` → VIEWER+
- `urs.create` → DEVELOPER+
- `urs.manage` → OWNER+
- `urs.approve` → OWNER+ (with specific review role)
- `urs.admin` → ADMIN

---

## 4. Solution Types

**Initial** (P0):
- `PROJECT` — Business initiative, system, or solution
- `PLUGIN` — Backstage plugin or platform extension
- `COMPONENT` — Software component or service
- `DATA_PRODUCT` — Pharma data product (reusable data asset)

**Future** (P1+):
- `API` — REST/GraphQL API service
- `MICROSERVICE` — Microservice architecture
- `CONNECTOR` — External system connector
- `APPLICATION` — End-user application
- `TEMPLATE` — Scaffolder template

Each type has an associated template (YAML).

---

## 5. Template-Driven Architecture

### 5.1 Template Location & Format

**Location**: `packages/urs-templates/templates/`

**Format**: YAML (following Backstage Scaffolder conventions)

### 5.2 Conceptual Template Structure

```yaml
# project.yaml
id: project
version: 1.0.0
solutionType: PROJECT
title: Project URS Template
description: For enterprise initiatives, products, or major systems

sections:
  - name: businessContext
    title: Business Context
    fields:
      - id: solutionName
        label: Project Name
        type: string
        required: true
        help: "Clear, concise project identifier"
      
      - id: businessCapability
        label: Business Capability
        type: select
        options:
          - label: Manufacturing Execution
            value: MES
          - label: Laboratory Information
            value: LIMS
          - label: Supply Chain
            value: SCM
        required: true
        help: "Select the primary business domain"
      
      - id: businessProblem
        label: What business problem does this solve?
        type: textarea
        required: true
        gxpRelevant: true
        help: "Describe the business need, not technical solution"

  - name: regulatoryContext
    title: Regulatory Context
    description: "Determine if this solution impacts regulated processes"
    fields:
      - id: gxpRelevance
        label: GxP Relevance
        type: select
        options:
          - label: Direct (affects manufacturing/QA decisions)
            value: DIRECT
          - label: Indirect (supports but doesn't decide)
            value: INDIRECT
          - label: None (administrative only)
            value: NONE
        required: true
        help: "GxP = Good Manufacturing Practice / Good Laboratory Practice / Good Distribution Practice. This field describes data integrity and decision impact."

      - id: patientImpact
        label: Patient Impact
        type: boolean
        help: "Could patient health or safety be affected if this system fails or is inaccurate?"

      - id: electronicRecords
        label: Uses Electronic Records?
        type: boolean
        help: "Will this system store or manage electronic records subject to 21 CFR Part 11?"

  - name: functionalRequirements
    title: Functional Requirements
    repeatable: true
    fields:
      - id: requirementId
        label: Requirement ID (auto-assigned if blank)
        type: string
        readonly: true

      - id: title
        label: Requirement Title
        type: string
        required: true
        help: "Concise one-liner; avoid implementation language"

      - id: statement
        label: Requirement Statement
        type: textarea
        required: true
        help: "Shall/should statements; system-agnostic; testable and measurable"

      - id: priority
        label: Priority
        type: select
        options:
          - label: Must Have (MUST)
            value: MUST
          - label: Should Have (SHOULD)
            value: SHOULD
          - label: Could Have (COULD)
            value: COULD
          - label: Will Not (WONT)
            value: WONT
        required: true

      - id: acceptanceCriteria
        label: Acceptance Criteria
        type: textarea
        help: "How will you know this requirement is satisfied? (Measurable, testable)"

      - id: gxpRelevance
        label: GxP Relevance
        type: select
        options:
          - label: Direct
            value: DIRECT
          - label: Indirect
            value: INDIRECT
          - label: None
            value: NONE

  - name: nonFunctionalRequirements
    title: Non-Functional Requirements
    fields:
      - id: securityRequirements
        label: Security Requirements
        type: textarea
        help: "Authentication, authorization, encryption, data protection"

      - id: performanceRequirements
        label: Performance Requirements
        type: textarea
        help: "Response times, throughput, scalability"

      - id: availabilityRequirements
        label: Availability & Disaster Recovery
        type: textarea
        help: "Uptime SLA, RTO, RPO, backup strategy"

      - id: auditabilityRequirements
        label: Auditability & Data Integrity
        type: textarea
        help: "Audit trail, immutability, change tracking, compliance"

  - name: interfacesAndData
    title: Interfaces & Data (if applicable)
    fields:
      - id: systemInterfaces
        label: External Systems
        type: textarea
        help: "Source systems, target systems, protocols (HTTP, MQTT, files, databases)"

      - id: dataOwnership
        label: Data Ownership & Criticality
        type: textarea
        help: "Who owns the data? Is it master data? How critical for operations?"

      - id: dataRetention
        label: Data Retention Policy
        type: textarea
        help: "How long must data be retained? Archival strategy?"
```

### 5.3 Template Schema

```typescript
// packages/urs-templates/src/types.ts
export interface Template {
  id: string;
  version: string;
  solutionType: 'PROJECT' | 'PLUGIN' | 'COMPONENT' | 'DATA_PRODUCT';
  title: string;
  description: string;
  sections: Section[];
}

export interface Section {
  name: string;
  title: string;
  description?: string;
  repeatable?: boolean;
  fields: Field[];
}

export interface Field {
  id: string;
  label: string;
  type: 'string' | 'textarea' | 'select' | 'boolean' | 'number' | 'date';
  required?: boolean;
  readonly?: boolean;
  help?: string;
  gxpRelevant?: boolean;
  options?: SelectOption[];
  validation?: ValidationRule[];
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface ValidationRule {
  rule: 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number;
  message?: string;
}
```

### 5.4 Template Loader

```typescript
// packages/urs-templates/src/loader.ts
export async function loadTemplate(solutionType: string, version?: string): Promise<Template> {
  // Load YAML template from file
  // Cache in memory
  // Return parsed Template
}
```

---

## 6. URS Wizard — Multi-Step Flow

**8-Step Wizard**:

1. **Solution Type** — Dropdown (PROJECT|PLUGIN|COMPONENT|DATA_PRODUCT)
2. **Business Context** — Fields from template
3. **Regulatory Context** — GxP impact assessment (non-final)
4. **Functional Requirements** — Repeatable requirement entry
5. **Non-Functional Requirements** — Quality attributes
6. **Interfaces & Data** — System topology (if applicable)
7. **Review** — Display complete URS + quality checks + optional AI review
8. **Submit** — Confirmation + initial approval workflow assignment

**UX Pattern**: Multi-step form with save-as-draft, progress indicator, back/forward navigation.

---

## 7. Approval Model

**Initial Roles**:
- `AUTHOR` — Created the URS
- `BUSINESS_REVIEWER` — Verifies business correctness
- `PRODUCT_MANAGER` — Approves product fit
- `QUALITY_REVIEWER` — QA/validation review
- `ADMIN` — Can override/waive any approval

**Workflow**:
1. AUTHOR submits for review → status changes to `IN_REVIEW`
2. Approval gates trigger in order (configurable)
3. Each role must approve or explicitly reject
4. On rejection → return to `DRAFT`, allow editing, resubmit
5. All gates passed → status → `APPROVED`
6. Approved URS is immutable (create new version if changes needed)

---

## 8. API Endpoints (Backend)

**Solutions**:
```
POST   /api/urs/solutions                     # Create solution
GET    /api/urs/solutions/:solutionId         # Get solution detail
GET    /api/urs/solutions                     # List solutions (with filters)
PUT    /api/urs/solutions/:solutionId         # Update draft solution

GET    /api/urs/solutions/:solutionId/history # Version history
```

**Requirements**:
```
POST   /api/urs/solutions/:solutionId/requirements       # Add requirement to set
GET    /api/urs/solutions/:solutionId/requirements       # List requirements
GET    /api/urs/solutions/:solutionId/requirements/:reqId # Get requirement detail
PUT    /api/urs/solutions/:solutionId/requirements/:reqId # Update draft requirement (DRAFT status only)

POST   /api/urs/solutions/:solutionId/requirements/:reqId/new-version # Create new version (supersede)
GET    /api/urs/solutions/:solutionId/requirements/:reqId/versions    # List requirement versions
```

**Workflow**:
```
POST   /api/urs/solutions/:solutionId/submit            # Submit for review
POST   /api/urs/solutions/:solutionId/approve           # Approve (OWNER+)
POST   /api/urs/solutions/:solutionId/reject            # Reject with reason (OWNER+)
POST   /api/urs/solutions/:solutionId/supersede         # Retire + create new version
```

**Quality**:
```
POST   /api/urs/validate                # Quality check a requirement
POST   /api/urs/solutions/:solutionId/validate-set # Quality check entire URS
```

**Relationships**:
```
POST   /api/urs/relationships            # Create relationship
GET    /api/urs/relationships/:solId     # Get relationships for solution
GET    /api/urs/traceability/:solId      # Get traceability graph
```

**Audit**:
```
GET    /api/urs/solutions/:solutionId/audit     # Audit trail
GET    /api/urs/audit-events                    # Search audit events
```

**Templates**:
```
GET    /api/urs/templates/:solutionType         # Get applicable template
GET    /api/urs/templates/:solutionType/version/:version  # Get specific template version
```

---

## 9. Existing Features & Limitations NOT in P0

❌ **P1/P2 Features** (explicitly out of scope):
- FS (Functional Specification) generation or management
- TDS (Technical Design Specification) generation
- Automated test case generation
- GitHub change-impact analysis
- Full knowledge graph traversal
- AI-driven autonomous requirement generation
- GxP compliance claims
- Electronic signature workflows (21 CFR Part 11)
- Regulatory submission packs
- Full audit trail for compliance (basic technical audit only)
- Entitlements constraints on URS creation

---

## 10. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Database schema conflicts with existing plugins | HIGH | Prefix all URS tables with `urs_`, use dedicated schema if possible |
| Permission model doesn't cover approval workflow | MEDIUM | Extend permission model with approval-specific roles; validate with OWNER+ |
| Template loading complexity | MEDIUM | Start with hardcoded templates in P0; move to file-based in P1 |
| Frontend complexity (8-step wizard) | MEDIUM | Use existing Material-UI patterns; break into reusable components |
| Backstage UI plugin integration issues | MEDIUM | Test plugin registration early; verify route routing |
| Requirement ID generation collisions | LOW | Use UUID internally; prefixed human IDs generated server-side |
| Audit trail becomes bloated | LOW | Implement audit retention policy; move old events to archive tables |

---

## 11. Package Locations & Structure

```
NEW:

plugins/urs-composer/                          # Frontend
  package.json (frontend-plugin role)
  src/
    routes.tsx
    pages/
    components/
    hooks/
    api/
    types/
  tests/

plugins/urs-composer-backend/                  # Backend
  package.json (backend-plugin role)
  src/
    index.ts (plugin export)
    plugin.ts (registration)
    router.ts (HTTP routes)
    service.ts (business logic)
    repository.ts (database layer)
    types.ts (TypeScript types)
    models/
    handlers/
    quality/
    db/
  migrations/
  tests/

packages/urs-templates/                        # Template definitions
  package.json (common-library role)
  src/
    index.ts
    types.ts
    loader.ts
  templates/
  tests/

packages/urs-sdk/                              # Future SDK (placeholder in P0)
  package.json (common-library role)
  src/
    index.ts

EXISTING (to modify):

packages/platform-common/src/
  permissions.ts                               # Add urs.* permissions
  roles.ts                                     # Add URS role mappings

packages/app/package.json                      # Add @internal/plugin-urs-composer
packages/backend/src/index.ts                  # Register urs-composer-backend plugin
```

---

## 12. Migration Strategy

1. **Phase 1**: Create tables (migrations run on backend start)
2. **Phase 2**: Register backend plugin in packages/backend
3. **Phase 3**: Register frontend plugin in packages/app
4. **Phase 4**: Add permissions to platform-common
5. **Phase 5**: Routes active; URS creation enabled
6. **Phase 6**: Template loading works
7. **Phase 7**: Wizard functional
8. **Phase 8**: Approval workflow active
9. **Phase 9**: Tests passing
10. **Phase 10**: Documentation complete

---

## 13. Deliverables (P0)

### Code
- [ ] `plugins/urs-composer/` — Frontend plugin
- [ ] `plugins/urs-composer-backend/` — Backend plugin
- [ ] `packages/urs-templates/` — Template definitions
- [ ] `packages/platform-common/src/permissions.ts` — URS permissions
- [ ] Database migrations
- [ ] API endpoints
- [ ] Service layer
- [ ] Repository layer

### Frontend Pages
- [ ] URS Overview / List
- [ ] Create URS (launches wizard)
- [ ] 8-Step Wizard
- [ ] URS Detail view
- [ ] Requirements table
- [ ] Version history view
- [ ] Review/Approval screen
- [ ] Audit trail view

### Backend Services
- [ ] Solution CRUD
- [ ] Requirement CRUD + versioning
- [ ] Approval workflow
- [ ] Audit event recording
- [ ] Quality validation
- [ ] Relationship management
- [ ] Template loading

### Testing
- [ ] Unit tests (service, validation)
- [ ] Integration tests (API endpoints)
- [ ] Permission tests (authorization)
- [ ] Template loading tests

### Documentation
- [ ] `docs/urs-composer/architecture.md`
- [ ] `docs/urs-composer/domain-model.md`
- [ ] `docs/urs-composer/template-schema.md`
- [ ] `docs/urs-composer/permissions.md`
- [ ] `docs/urs-composer/api.md`
- [ ] `docs/urs-composer/knowledge-graph.md`
- [ ] `docs/urs-composer/future-ai-integration.md`

### Example
- [ ] Weight & Dispensing URS (template example, non-production)

---

## 14. Success Criteria (Exit Gate)

✅ **Code Complete**:
- All packages present and building
- TypeScript: zero errors (`yarn tsc`)
- Linting: zero errors (`yarn lint:all`)

✅ **Tests Passing**:
- Unit tests: 100+ tests, all passing
- Integration tests: API endpoints functional
- Permission tests: Server-side authorization enforced

✅ **Functionality**:
- URS creation workflow end-to-end
- Requirement versioning works
- Approval workflow functions
- Audit trail records events
- Quality checks run
- Relationships can be created

✅ **Documentation**:
- All docs written
- Examples functional
- API documented

✅ **No Regressions**:
- Existing tests still pass
- Existing plugins unmodified
- Backstage core untouched
- Golden Paths unaffected

---

## 15. Known Limitations (P0)

1. **Templates are static YAML** — No dynamic template creation UI (P1)
2. **Approval workflow is simplified** — Sequential; no parallel gates (P1)
3. **No full knowledge graph** — Relationships stored; traversal API minimal (P1)
4. **No FS/TDS generation** — Manual or AI-assisted later (P2)
5. **No GitHub integration** — Change-impact analysis deferred (P2)
6. **No GxP claims** — Technical audit trail only; regulatory claims forbidden (P2+)
7. **No audit archival** — All audit events kept in hot table (P2)
8. **No advanced query** — Search/filter minimal (P1)

---

## 16. Recommended Next Steps (Post-P0)

**P1 Priorities**:
1. Admin UI for template management
2. Advanced approval workflows (parallel gates, escalation)
3. Knowledge graph query service
4. FS template + generation stub
5. Requirement traceability UI

**P2 Priorities**:
1. FS/TDS generation pipelines
2. Test case generation stubs
3. GitHub change-impact integration
4. AI-assisted requirement review
5. Regulatory submission workflows

---

## Conclusion

**URS Composer P0 Scope**: A robust, permission-controlled, audit-enabled foundation for requirements management. Configuration-driven, extensible, and integrated with Backstage.

**Next Action**: Proceed with implementation ONLY if this plan is approved.

**Status**: ✋ **AWAITING APPROVAL TO PROCEED**
