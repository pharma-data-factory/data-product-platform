# External Dependencies — CSV Phase 0

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-ED-001 |
| Status | DRAFT for GATE-03 / supplier consideration |
| Product validation status | **NOT_VALIDATED** |
| Date | 2026-08-23 |

Dependencies below are **external** to the Validated Platform Candidate. They are not “validated by inclusion.” Supplier/service assessment may be required later; this Phase 0 list only identifies them.

---

## 1. Dependency register

### ED-01 — GitHub (SaaS)

| Field | Content |
| --- | --- |
| Purpose | User authentication (OAuth); optional GitHub App for repository creation; Actions for generated CI |
| Data exchanged | OAuth identity claims; repository contents; workflow logs; App permissions |
| Trust boundary | Platform → public GitHub API / OAuth endpoints |
| Authentication | OAuth client secrets; GitHub App private key (env — not committed) |
| Failure impact | Login and/or scaffold publish fail; catalog may remain available depending on config |
| Validation relevance | HIGH for Intended Use create/auth flows |
| Supplier consideration | SaaS provider controls; availability/SLAs out of platform CSV |
| Responsibility | Platform team configures App/OAuth; GitHub operates service |

### ED-02 — PostgreSQL

| Field | Content |
| --- | --- |
| Purpose | Persistent store for Backstage plugins in Compose/validation/pilot |
| Data exchanged | Catalog, auth sessions/keys as configured, scaffolder state, plugin data |
| Trust boundary | Platform ↔ database network |
| Authentication | DB user/password via env |
| Failure impact | Control Plane unavailable or degraded |
| Validation relevance | HIGH for persistence claims |
| Supplier consideration | Self-hosted image `postgres:16-alpine` in Compose; ops own backups |
| Responsibility | Platform ops |

### ED-03 — SQLite (better-sqlite3)

| Field | Content |
| --- | --- |
| Purpose | Local development persistence |
| Data exchanged | Same class as Postgres for local |
| Trust boundary | Local filesystem |
| Authentication | File system permissions |
| Failure impact | Local only |
| Validation relevance | LOW for production baseline; may be OUT for frozen pilot env |
| Responsibility | Developer workstation |

### ED-04 — Docker / container runtime

| Field | Content |
| --- | --- |
| Purpose | Run platform Compose stacks; build images; run generated workloads |
| Data exchanged | Images, env, volumes |
| Trust boundary | Host OS ↔ engine |
| Authentication | Host/docker auth as configured |
| Failure impact | Cannot deploy Compose/validation stack |
| Validation relevance | MEDIUM–HIGH for IQ of containerized baseline |
| Responsibility | Platform ops / developers |

### ED-05 — Node.js / Yarn toolchain

| Field | Content |
| --- | --- |
| Purpose | Build and run Control Plane |
| Data exchanged | Source → bundles; lockfile installs |
| Trust boundary | Build environment |
| Authentication | N/A (local); CI uses GitHub-hosted runners |
| Failure impact | Cannot build/start platform |
| Validation relevance | HIGH for reproducible build |
| Responsibility | Platform team pins engines + `yarn.lock` |

### ED-06 — npm / Yarn package registries

| Field | Content |
| --- | --- |
| Purpose | Resolve JavaScript dependencies |
| Data exchanged | Package tarballs |
| Trust boundary | Build host → registry |
| Authentication | Public or tokenized as configured |
| Failure impact | Non-reproducible or failed installs |
| Validation relevance | MEDIUM (lockfile mitigates) |
| Responsibility | Platform team maintains lockfile |

### ED-07 — PyPI (Golden Path / components)

| Field | Content |
| --- | --- |
| Purpose | Python dependencies for templates and platform-components |
| Data exchanged | Python packages |
| Trust boundary | Build host → PyPI |
| Failure impact | GP content / component builds fail |
| Validation relevance | HIGH for Layer 2/3; LOW for Platform Core if GPs out of Baseline 0.1 |
| Responsibility | Template owners |

### ED-08 — Backstage open-source framework

| Field | Content |
| --- | --- |
| Purpose | Portal framework (catalog, scaffolder, auth, permissions APIs) |
| Data exchanged | N/A (library/SOUP) |
| Trust boundary | In-process |
| Failure impact | Platform non-functional |
| Validation relevance | Treated as **SOUP/OTS**; configured instance is in scope, not upstream Backstage project validation |
| Responsibility | Platform team pins version (`backstage.json` 1.53.0); monitors advisories |

### ED-09 — Container image registries (e.g. GHCR)

| Field | Content |
| --- | --- |
| Purpose | Store/publish platform images from CI |
| Validation relevance | MEDIUM for deployment identity |
| Responsibility | Platform CI + registry ACLs |

---

## 2. Explicit non-dependencies for Baseline 0.1 Intended Use

- Plant historians / MES / SAP live connections  
- AWS Marketplace commerce APIs (FUTURE / blocked)  
- Validation Expert as required runtime  
- External AAS Foundation service  

---

## 3. Notes

No supplier audit is performed in Phase 0. Failure modes listed are technical, not contractual.
