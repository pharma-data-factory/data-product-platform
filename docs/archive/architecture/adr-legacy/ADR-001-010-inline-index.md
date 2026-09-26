# Architecture Decision Records (ADRs) — LEGACY

> # ARCHIVED 2026-09-26 · NOT THE LIVE DECISION LOG
>
> **The single source of truth for architecture decisions is
> [`docs/nexora-transformation/DECISIONS.md`](../../../nexora-transformation/DECISIONS.md)
> (`NXD-nnn`).** It is the only decision record that is maintained. Do not add
> an ADR here, and do not cite this file as current.
>
> Moved from `docs/architecture/adr/README.md` during Phase 1.0 (SSOT & ADR
> consolidation).
>
> **This file is not an index — it is the ADRs.** ADR-001 to ADR-010 were
> never split into separate files; their full text is in "ADR Summaries"
> below, which is why it is archived rather than deleted. The links to
> `ADR-00X-*.md` files have never resolved; no such files were ever written.
>
> **Corrections applied 2026-09-26.** Three records claimed work was planned
> or proposed that had in fact shipped. The statuses were corrected in place
> and each correction is annotated where it appears:
>
> | ADR                                     | Was                                                | Is                         | Evidence                                                                                                                                |
> | --------------------------------------- | -------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
> | ADR-003 Operational Persistence         | ACCEPTED, "P0 in-memory, PostgreSQL planned (P1A)" | **ACCEPTED / IMPLEMENTED** | `app-config.production.yaml` runs `client: pg`; `postgres-repository.ts`; PostgreSQL proof suites in CI                                 |
> | ADR-006 Immutable URS Baselines         | **PROPOSED (P1A)**                                 | **ACCEPTED / IMPLEMENTED** | `urs_requirement_version_immutability` trigger and the single-open-version partial index in `urs-composer-backend/src/db/migrations.ts` |
> | ADR-007 Configurable Approval Workflows | **PROPOSED (P1A)**                                 | **ACCEPTED / IMPLEMENTED** | `data/approvalWorkflows.ts`; selection logic in `service.ts` matches this ADR exactly                                                   |
>
> **Two further caveats, not corrected because they need a decision:**
>
> - **ADR-008 is incomplete.** Community RBAC is deliberately disabled. See
>   [`ARCHITECTURE_GUARDRAILS.md`](../../../architecture/ARCHITECTURE_GUARDRAILS.md)
>   D-1, and `NXD-060` for the reversal.
> - **ADR-004 is assigned twice.** Here it is "Git for Versioned Engineering
>   Artifacts", which keeps the number. The other ADR-004
>   ([central platform RBAC](ADR-004-central-platform-rbac.md)) is archived
>   beside this file and its substance is carried forward as `NXD-060`.

**Version**: 1.0  
**Last Updated**: 2026-08-25  
**Status**: ARCHIVED — superseded by `DECISIONS.md` (NXD)  
**Curator**: Architecture Team

---

## Overview

Architecture Decision Records (ADRs) document significant architectural choices made in the Nexora.

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

| Status         | Meaning                                | Action                                 |
| -------------- | -------------------------------------- | -------------------------------------- |
| **ACCEPTED**   | Decision made, approved, actively used | Follow the decision                    |
| **PROPOSED**   | Decision drafted, awaiting approval    | Review & approve before implementing   |
| **DEPRECATED** | No longer recommended                  | Use alternative; migrate when possible |
| **SUPERSEDED** | Replaced by newer decision             | Use replacement ADR instead            |

---

## ADR Index & Matrix

| #       | Title                                      | Status                 | Domain       | Approved | Last Updated         |
| ------- | ------------------------------------------ | ---------------------- | ------------ | -------- | -------------------- |
| ADR-001 | Backstage Platform Foundation              | ACCEPTED               | Platform     | ✅       | 2026-08-25           |
| ADR-002 | Plugin-Based Modular Architecture          | ACCEPTED               | Architecture | ✅       | 2026-08-25           |
| ADR-003 | Operational Persistence Strategy           | ACCEPTED / IMPLEMENTED | Data         | ✅       | corrected 2026-09-26 |
| ADR-004 | Git for Versioned Engineering Artifacts    | ACCEPTED               | Data         | ✅       | 2026-08-25           |
| ADR-005 | Business Capability as Requirements Anchor | ACCEPTED               | Requirements | ✅       | 2026-08-25           |
| ADR-006 | Immutable URS Baselines                    | ACCEPTED / IMPLEMENTED | Requirements | ✅       | corrected 2026-09-26 |
| ADR-007 | Configurable Approval Workflows            | ACCEPTED / IMPLEMENTED | Governance   | ✅       | corrected 2026-09-26 |
| ADR-008 | Backstage Permission Framework             | ACCEPTED               | Security     | ✅       | 2026-08-25           |
| ADR-009 | URS/Product/Validation Domain Separation   | ACCEPTED               | Architecture | ✅       | 2026-08-25           |
| ADR-010 | Reuse Before Build                         | ACCEPTED               | Platform     | ✅       | 2026-08-25           |

---

## Decisions by Domain

### Platform (3 ADRs)

- [ADR-001: Backstage Platform Foundation](#adr-001)
- [ADR-010: Reuse Before Build](#adr-010)
- [ADR-002: Plugin-Based Modular Architecture](#adr-002)

### Architecture (2 ADRs)

- [ADR-002: Plugin-Based Modular Architecture](#adr-002)
- [ADR-009: URS/Product/Validation Domain Separation](#adr-009)

### Requirements (3 ADRs)

- [ADR-005: Business Capability as Requirements Anchor](#adr-005)
- [ADR-006: Immutable URS Baselines](#adr-006) (IMPLEMENTED)
- [ADR-009: URS/Product/Validation Domain Separation](#adr-009)

### Data (2 ADRs)

- [ADR-003: Operational Persistence Strategy](#adr-003)
- [ADR-004: Git for Versioned Engineering Artifacts](#adr-004)

### Governance (1 ADR)

- [ADR-007: Configurable Approval Workflows](#adr-007) (IMPLEMENTED)

### Security (1 ADR)

- [ADR-008: Backstage Permission Framework](#adr-008)

---

## ADR Summaries

### ADR-001: Backstage Platform Foundation

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: The Nexora is built on Backstage as the platform foundation.

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

**Status corrected 2026-09-26: IMPLEMENTED.** The original text read
"Current P0: In-memory with abstraction layer ready for PostgreSQL (P1A) /
Future P1A: Full PostgreSQL implementation planned". PostgreSQL is in
production use (`app-config.production.yaml`, `client: pg`;
`plugins/urs-composer-backend/src/postgres-repository.ts`), with persistence
proof suites running against it in CI. Note that the shipped _development_
default is still `ursComposer.persistence.mode: memory`.

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
Product Design (HOW)
  ↓
Implementation & Testing
  ↓
Evidence & Validation
```

**Implementation**: URS Composer anchors requirements to Business Capabilities

**Related**: ADR-006, ADR-009

---

### ADR-006: Immutable URS Baselines

**Status**: ACCEPTED / IMPLEMENTED (corrected 2026-09-26; originally PROPOSED (P1A))  
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

**Implementation**: shipped. Enforced in the database, not only in
application code — `urs_requirement_version_immutability` (row trigger,
freezes content once a version leaves DRAFT) and
`requirement_versions_single_open` (partial unique index), both in
`plugins/urs-composer-backend/src/db/migrations.ts`. PostgreSQL only.

**Related**: ADR-005, ADR-007

---

### ADR-007: Configurable Approval Workflows

**Status**: ACCEPTED / IMPLEMENTED (corrected 2026-09-26; originally PROPOSED (P1A))  
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

**Implementation**: shipped. `plugins/urs-composer-backend/src/data/approvalWorkflows.ts`
defines both workflows; the selection logic documented above matches
`service.ts` exactly.

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

### ADR-009: URS/Product/Validation Domain Separation

**Status**: ACCEPTED  
**Date**: MVP 1.0 (2026-08-25)

**Decision**: URS Composer, Product Composer, and Validation Expert are separate domains.

**Rationale**:

- Clear responsibility boundaries
- Avoid duplication and cross-cutting logic
- Enable independent evolution
- Support clean integration seams

**Responsibilities**:

| Domain                | Question                                                            | Responsibility                        |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| **URS Composer**      | WHAT must the solution do?                                          | Requirement specification, approval   |
| **Product Composer**  | HOW will the requirement be implemented?                            | Product design, component composition |
| **Validation Expert** | How do we demonstrate the implementation satisfies the requirement? | Risk, tests, evidence                 |

**Integration**:

- URS Composer → Product Composer (requirement reference)
- Product Composer → Validation Expert (implementation reference)
- Validation Expert → URS Composer (evidence linkage)

**Implementation**: P0 validates URS, P1A adds versioning, P1B+ adds Product/Validation integration

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

**P1A (complete)**:

- ADR-006 ✅ (IMPLEMENTED — status corrected 2026-09-26)
- ADR-007 ✅ (IMPLEMENTED — status corrected 2026-09-26)

**P1B+ (Planned)**:

- Extension of ADR-006, ADR-007, ADR-009

---

## Related Documentation

Paths repointed 2026-09-26 when this file was archived; two targets never
existed and are marked as such rather than linked.

- `architecture-principles.md` — **never written.** The foundational rules are
  in [`/AGENTS.md`](../../../../AGENTS.md) and
  [`ARCHITECTURE_GUARDRAILS.md`](../../../architecture/ARCHITECTURE_GUARDRAILS.md).
- [platform-architecture.md](../../../architecture/platform-architecture.md) — layered design
- `domain-architecture.md` — **never written.** Domain responsibilities are in
  [`TARGET_OPERATING_MODEL.md`](../../../architecture/TARGET_OPERATING_MODEL.md).
- [status-model.md](../../../status-model.md) — status definitions
- [architecture.md](../../../architecture.md) — design rules
- [DECISIONS.md](../../../nexora-transformation/DECISIONS.md) — **the live decision log**

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
