# Architecture Decision Records (ADRs)

**Version**: 1.0  
**Last Updated**: 2026-08-25  
**Curator**: Architecture Team  

---

## Overview

Architecture Decision Records (ADRs) document significant architectural choices made in the Pharma Data Factory.

Each ADR follows a standard format:
- **Context**: Why the decision was needed
- **Decision**: What was decided
- **Rationale**: Why this decision
- **Alternatives Considered**: Other options
- **Consequences**: Positive + negative impacts
- **Related Components**: What this affects
- **Related ADRs**: Cross-references

---

## ADR Status Definitions

| Status | Meaning | Action |
|--------|---------|--------|
| **ACCEPTED** | Decision made, approved, actively used | Follow the decision |
| **PROPOSED** | Decision drafted, awaiting approval | Review & approve before implementing |
| **DEPRECATED** | No longer recommended | Use alternative; migrate when possible |
| **SUPERSEDED** | Replaced by newer decision | Use replacement ADR instead |

---

## ADR Index & Matrix

| # | Title | Status | Domain | Approved | Last Updated |
|---|-------|--------|--------|----------|--------------|
| ADR-001 | Backstage Platform Foundation | ACCEPTED | Platform | ✅ | 2026-08-25 |
| ADR-002 | Plugin-Based Modular Architecture | ACCEPTED | Architecture | ✅ | 2026-08-25 |
| ADR-003 | Operational Persistence Strategy | ACCEPTED | Data | ✅ | 2026-08-25 |
| ADR-004 | Git for Versioned Engineering Artifacts | ACCEPTED | Data | ✅ | 2026-08-25 |
| ADR-005 | Business Capability as Requirements Anchor | ACCEPTED | Requirements | ✅ | 2026-08-25 |
| ADR-006 | Immutable URS Baselines | PROPOSED | Requirements | ⏳ P1A | 2026-08-25 |
| ADR-007 | Configurable Approval Workflows | PROPOSED | Governance | ⏳ P1A | 2026-08-25 |
| ADR-008 | Backstage Permission Framework | ACCEPTED | Security | ✅ | 2026-08-25 |
| ADR-009 | URS/Solution/Validation Domain Separation | ACCEPTED | Architecture | ✅ | 2026-08-25 |
| ADR-010 | Reuse Before Build | ACCEPTED | Platform | ✅ | 2026-08-25 |

---

## Decisions by Domain

### Platform (3 ADRs)

- [ADR-001: Backstage Platform Foundation](#adr-001)
- [ADR-010: Reuse Before Build](#adr-010)
- [ADR-002: Plugin-Based Modular Architecture](#adr-002)

### Architecture (2 ADRs)

- [ADR-002: Plugin-Based Modular Architecture](#adr-002)
- [ADR-009: URS/Solution/Validation Domain Separation](#adr-009)

### Requirements (3 ADRs)

- [ADR-005: Business Capability as Requirements Anchor](#adr-005)
- [ADR-006: Immutable URS Baselines](#adr-006) (PROPOSED)
- [ADR-009: URS/Solution/Validation Domain Separation](#adr-009)

### Data (2 ADRs)

- [ADR-003: Operational Persistence Strategy](#adr-003)
- [ADR-004: Git for Versioned Engineering Artifacts](#adr-004)

### Governance (1 ADR)

- [ADR-007: Configurable Approval Workflows](#adr-007) (PROPOSED)

### Security (1 ADR)

- [ADR-008: Backstage Permission Framework](#adr-008)

---

## ADR Summaries

### ADR-001: Backstage Platform Foundation

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: The Pharma Data Factory is built on Backstage as the platform foundation.

**Rationale**:
- Backstage provides mature IDP capabilities (Catalog, Scaffolder, TechDocs, Permissions)
- Avoid building custom platform infrastructure
- Focus pharma engineering efforts on domain-specific plugins
- Community-driven development and regular updates

**Key Decisions**:
- Do not fork Backstage core
- Prefer official plugins and APIs
- Custom development targets pharma domains only

**Related**: ADR-002, ADR-010

---

### ADR-002: Plugin-Based Modular Architecture

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Platform capabilities are delivered through modular, independently deployable plugins.

**Rationale**:
- Separation of concerns
- Parallel development teams
- Independent testing and deployment
- Clean boundaries and APIs

**Plugin Categories**:
- Backstage core plugins (27) — Official, maintained by Backstage
- Pharma backend plugins (15) — Custom domain logic
- Pharma frontend plugins (13+11 modules) — User experiences
- Golden Path templates (7) — Official Data Product solutions

**Related**: ADR-001, ADR-010

---

### ADR-003: Operational Persistence Strategy

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Operational state uses PostgreSQL; Git stores versioned artifacts.

**Rationale**:
- PostgreSQL: ACID transactions, complex queries, audit trail
- Git: Version control, decentralized backups, audit via commit history
- Separation: Different concerns need different persistence

**Current P0**: In-memory with abstraction layer ready for PostgreSQL (P1A)  
**Future P1A**: Full PostgreSQL implementation planned

**Stores in PostgreSQL**:
- URS operational state
- Approval workflows & instances
- Audit events
- Business capabilities

**Related**: ADR-004

---

### ADR-004: Git for Versioned Engineering Artifacts

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Engineering artifacts (code, templates, configuration) are versioned in Git.

**Rationale**:
- Single source of truth for engineering work
- Complete audit trail via Git history
- Decentralized backup and disaster recovery
- Generated Data Products run independently (no Backstage dependency)

**Artifacts in Git**:
- Generated Data Product source code
- Software templates (Golden Paths)
- Engineering documentation
- Configuration as code

**Related**: ADR-003

---

### ADR-005: Business Capability as Requirements Anchor

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Business Capabilities are the upstream anchor for requirements.

**Rationale**:
- Clear traceability from business need to engineering
- Prevents requirements disconnection from business context
- Enables capability-driven roadmapping

**Flow**:
```
Business Capability
  ↓
Business Need (WHY)
  ↓
URS / Requirement (WHAT)
  ↓
Solution Design (HOW)
  ↓
Implementation & Testing
  ↓
Evidence & Validation
```

**Implementation**: URS Composer anchors requirements to Business Capabilities

**Related**: ADR-006, ADR-009

---

### ADR-006: Immutable URS Baselines

**Status**: PROPOSED (P1A)  
**Date**: 2026-08-25

**Decision**: Approved URS baselines are immutable; revisions create new versions.

**Rationale**:
- Approved state must be provable and auditable
- Change history remains queryable
- Enables reliable traceability (requirement version → implementation → tests)

**Model**:
```
URS v1.0 APPROVED (immutable)
  ├─ Requirement 001 v1.0
  ├─ Requirement 002 v1.0
  └─ Requirement 003 v1.0

URS v1.1 APPROVED (immutable)
  ├─ Requirement 001 v1.1
  ├─ Requirement 002 v1.0
  └─ Requirement 003 v1.1

Previous: v1.0 → SUPERSEDED
```

**Implementation**: P1A introduces baseline versioning

**Related**: ADR-005, ADR-007

---

### ADR-007: Configurable Approval Workflows

**Status**: PROPOSED (P1A)  
**Date**: 2026-08-25

**Decision**: URS approval workflows are template-based and configurable.

**Rationale**:
- Different requirements may need different approval gates
- Avoid hardcoding workflow logic
- Support future customization per organization

**Workflows (P1A Seeded)**:
- `standard-gxp-urs`: 3-step (Business → Product → Quality)
- `non-gxp-urs`: 2-step (Business → Product)

**Selection Logic**:
```
GxP.DIRECT    → standard-gxp-urs
GxP.INDIRECT  → standard-gxp-urs
GxP.NONE      → non-gxp-urs
```

**Implementation**: P1A introduces configurable workflows

**Related**: ADR-006, ADR-008

---

### ADR-008: Backstage Permission Framework

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Authorization uses the Backstage Permission Framework.

**Rationale**:
- Avoid custom IAM system
- Standard Backstage policy model
- Clean separation of concerns

**Current Permissions** (MVP 1.0):
- `data-product.read` — View data products
- `data-product.create` — Create data products
- `data-product.admin` — Administer

**URS Permissions** (P0):
- `urs.read` — View requirements
- `urs.create` — Create requirements
- `urs.manage` — Edit drafts
- `urs.approve` — Approve/reject
- `urs.admin` — Manage workflows

**Architecture**: PlatformPermissionPolicy in platform-common

**Related**: ADR-009

---

### ADR-009: URS/Solution/Validation Domain Separation

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: URS Composer, Solution Composer, and Validation Expert are separate domains.

**Rationale**:
- Clear responsibility boundaries
- Avoid duplication and cross-cutting logic
- Enable independent evolution
- Support clean integration seams

**Responsibilities**:

| Domain | Question | Responsibility |
|--------|----------|---|
| **URS Composer** | WHAT must the solution do? | Requirement specification, approval |
| **Solution Composer** | HOW will the requirement be implemented? | Solution design, component composition |
| **Validation Expert** | How do we demonstrate the implementation satisfies the requirement? | Risk, tests, evidence |

**Integration**:
- URS Composer → Solution Composer (requirement reference)
- Solution Composer → Validation Expert (implementation reference)
- Validation Expert → URS Composer (evidence linkage)

**Implementation**: P0 validates URS, P1A adds versioning, P1B+ adds Solution/Validation integration

**Related**: ADR-005, ADR-006, ADR-007

---

### ADR-010: Reuse Before Build

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: Reuse Backstage capabilities and mature platforms before building custom equivalents.

**Rationale**:
- Reduce maintenance burden
- Benefit from community improvements
- Focus development effort on pharma differentiation

**Reuse (Do Not Duplicate)**:
- Catalog Graph
- Entity Relations
- Permission Framework
- CI/CD (GitHub Actions)
- TechDocs
- Search
- Notifications

**Build Only When**:
- Backstage lacks pharma-specific capability
- Existing solution doesn't fit domain requirements
- Clear business value of custom solution exceeds maintenance cost

**Related**: ADR-001, ADR-002

---

## Cross-Cutting Decisions

### By Implementation Phase

**P0 (Current MVP 1.0)**:
- ADR-001 ✅
- ADR-002 ✅
- ADR-003 ✅
- ADR-004 ✅
- ADR-005 ✅
- ADR-008 ✅
- ADR-009 ✅
- ADR-010 ✅

**P1A (In Progress)**:
- ADR-006 🔶 (PROPOSED)
- ADR-007 🔶 (PROPOSED)

**P1B+ (Planned)**:
- Extension of ADR-006, ADR-007, ADR-009

---

## Related Documentation

- [../architecture-principles.md](../architecture-principles.md) — Foundational rules
- [../platform-architecture.md](../platform-architecture.md) — Layered design
- [../domain-architecture.md](../domain-architecture.md) — Domain responsibilities
- [../../status-model.md](../../status-model.md) — Status definitions
- [../../architecture.md](../../architecture.md) — Design rules

---

## How to Propose a New ADR

1. Check existing ADRs (1-10 covers MVP 1.0 and P1A)
2. For new decisions: Create ADR-XXX following the template
3. Set status to PROPOSED
4. Include decision, rationale, alternatives, consequences
5. Submit for architecture review
6. Once approved, update this index

---

## Template for New ADRs

```markdown
# ADR-XXX — [Title]

**Status**: PROPOSED/ACCEPTED/DEPRECATED/SUPERSEDED  
**Date**: YYYY-MM-DD

## Context
[Why was this decision needed?]

## Decision
[What was decided?]

## Rationale
[Why this decision?]

## Alternatives Considered
[Other options & why not chosen]

## Consequences
### Positive
[Benefits]

### Negative / Trade-offs
[Costs & limitations]

## Related Components
[What this affects]

## Related ADRs
[ADR-XXX, ADR-YYY]
```

---

**Last Reviewed**: 2026-08-25  
**Next Review**: When significant architecture decisions are made  
**Status**: BASELINE COMPLETE ✅
