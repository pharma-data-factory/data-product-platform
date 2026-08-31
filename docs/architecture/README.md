# Nexora — Architecture Documentation

**Version**: 1.0  
**Last Updated**: 2026-08-25  
**Audience**: Internal engineering, architecture team, platform developers  

---

## Overview

This directory contains the authoritative architecture documentation for the Nexora, an internal developer platform (IDP) built on Backstage for pharmaceutical manufacturing data integration, requirement management, and solution composition.

**Key Principles:**

1. **Backstage-First**: Reuse official Backstage capabilities; custom development targets pharma-specific domains only
2. **Domain Separation**: URS Composer, Solution Composer, and Validation Expert maintain clear responsibility boundaries
3. **Implementation vs Plan**: Documentation clearly distinguishes IMPLEMENTED, PARTIALLY IMPLEMENTED, PLANNED, and CONCEPTUAL capabilities
4. **Architecture as Code**: Architecture documentation evolves with implementation

---

## Structure

### Core Architecture Documents

- **[platform-architecture.md](platform-architecture.md)** — Overall platform layering and component interaction
- **[domain-architecture.md](domain-architecture.md)** — Pharma engineering domains and their responsibilities
- **[plugin-architecture.md](plugin-architecture.md)** — Custom plugins and their role in the platform
- **[data-architecture.md](data-architecture.md)** — Persistence mechanisms and system-of-record assignments
- **[integration-architecture.md](integration-architecture.md)** — External integrations and boundaries
- **[security-architecture.md](security-architecture.md)** — Authentication, authorization, and audit
- **[validation-architecture.md](validation-architecture.md)** — Validation concepts and traceability
- **[architecture-principles.md](architecture-principles.md)** — Foundational architectural rules

### Architecture Decision Records (ADRs)

- **[adr/README.md](adr/README.md)** — ADR index and status matrix
- **[adr/ADR-001-backstage-platform-foundation.md](adr/ADR-001-backstage-platform-foundation.md)**
- **[adr/ADR-002-plugin-based-modular-architecture.md](adr/ADR-002-plugin-based-modular-architecture.md)**
- **[adr/ADR-003-operational-persistence.md](adr/ADR-003-operational-persistence.md)**
- **[adr/ADR-004-git-engineering-artifacts.md](adr/ADR-004-git-engineering-artifacts.md)**
- **[adr/ADR-005-business-capability-anchor.md](adr/ADR-005-business-capability-anchor.md)**
- **[adr/ADR-006-immutable-urs-baselines.md](adr/ADR-006-immutable-urs-baselines.md)**
- **[adr/ADR-007-configurable-approval-workflows.md](adr/ADR-007-configurable-approval-workflows.md)**
- **[adr/ADR-008-backstage-permission-framework.md](adr/ADR-008-backstage-permission-framework.md)**
- **[adr/ADR-009-engineering-domain-separation.md](adr/ADR-009-engineering-domain-separation.md)**
- **[adr/ADR-010-reuse-before-build.md](adr/ADR-010-reuse-before-build.md)**

---

## Quick Reference

### Platform Layers

```
┌─────────────────────────────────────────┐
│    EXPERIENCE LAYER                     │
│  (User-facing plugins & experiences)    │
├─────────────────────────────────────────┤
│   PHARMA ENGINEERING                    │
│ (URS, Solution, Validation domains)     │
├─────────────────────────────────────────┤
│   PLATFORM SERVICES                     │
│ (Catalog, Permissions, APIs, TechDocs)  │
├─────────────────────────────────────────┤
│   PERSISTENCE & DATA                    │
│ (PostgreSQL, Git, Catalog, Artifacts)   │
└─────────────────────────────────────────┘
```

### Pharma Engineering Flow

```
WHY (Business Context)
  ↓
WHAT (URS Composer)
  ↓
HOW (Solution Composer)
  ↓
PROVE (Validation Expert)
```

### Status Definitions

- **IMPLEMENTED**: Code present, working in repository
- **PARTIALLY IMPLEMENTED**: Core logic present, some features deferred
- **PLANNED**: Architecture decided, implementation not yet started
- **CONCEPTUAL**: Discussed or sketched, not yet formally planned

---

## Navigation by Role

### Platform Architect
Start with:
1. [architecture-principles.md](architecture-principles.md) — Foundational rules
2. [platform-architecture.md](platform-architecture.md) — Overall structure
3. [adr/README.md](adr/README.md) — Decisions and trade-offs

### Plugin Developer
Start with:
1. [plugin-architecture.md](plugin-architecture.md) — Plugin patterns
2. [data-architecture.md](data-architecture.md) — Persistence options
3. [security-architecture.md](security-architecture.md) — Permissions & audit

### Domain Expert (URS/Solution/Validation)
Start with:
1. [domain-architecture.md](domain-architecture.md) — Domain responsibilities
2. [validation-architecture.md](validation-architecture.md) — Traceability concepts
3. Relevant ADR (e.g., ADR-005, ADR-006, ADR-009)

### Operations / SRE
Start with:
1. [integration-architecture.md](integration-architecture.md) — External dependencies
2. [data-architecture.md](data-architecture.md) — Persistence infrastructure
3. [security-architecture.md](security-architecture.md) — Audit & compliance

---

## Key Decisions at a Glance

| Decision | Status | ADR |
|----------|--------|-----|
| Backstage as foundation | ACCEPTED | ADR-001 |
| Plugin-based architecture | ACCEPTED | ADR-002 |
| PostgreSQL + Git persistence | ACCEPTED | ADR-003 |
| Git for engineering artifacts | ACCEPTED | ADR-004 |
| Business Capability as anchor | ACCEPTED | ADR-005 |
| Immutable URS Baselines | PROPOSED (P1A) | ADR-006 |
| Configurable workflows | PROPOSED (P1A) | ADR-007 |
| Backstage Permissions | ACCEPTED | ADR-008 |
| Domain separation (URS/Solution/Validation) | ACCEPTED | ADR-009 |
| Reuse before build | ACCEPTED | ADR-010 |

---

## Architecture Governance

### Update Protocol

Any implementation that introduces, removes, or materially changes an architectural decision must:

1. Update relevant architecture documentation in this directory
2. Create or update an ADR if a decision is involved
3. Include architecture documentation in the pull request
4. Maintain alignment with [Status model](../status-model.md)

### Definition of Done (Architecture)

For architecture-affecting changes:

- [ ] Implementation completed
- [ ] Tests completed
- [ ] Architecture documentation updated
- [ ] ADR created/updated if required
- [ ] API documentation updated (if applicable)
- [ ] Data model documentation updated (if applicable)
- [ ] Security/permission impact reviewed
- [ ] Validation impact considered

---

## Related Documents

- **[../status-model.md](../status-model.md)** — Implementation, release, commercial, and validation status definitions
- **[../capability-matrix.md](../capability-matrix.md)** — Current platform capabilities inventory
- **[../mvp-1.0-baseline.md](../mvp-1.0-baseline.md)** — MVP 1.0 freeze and commitments
- **[../identity-and-rbac.md](../identity-and-rbac.md)** — Authentication and authorization details
- **[../engineering-contract.md](../engineering-contract.md)** — Engineering artifact standards

---

## Feedback & Contributions

Architecture documentation is living. If you find inconsistencies, gaps, or opportunities for clarification:

1. Open an issue referencing the relevant architecture document
2. Propose updates via pull request with rationale
3. Update ADRs if significant decisions change

---

**Last reviewed by**: Architecture team  
**Next review scheduled**: 2026-Q4
