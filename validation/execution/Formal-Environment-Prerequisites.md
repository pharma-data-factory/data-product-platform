# Formal environment prerequisites — Platform Core 1.0-RC1

**Validation status:** NOT_VALIDATED  
**Formal execution:** NOT_EXECUTED  
**Date:** 2026-08-22  

Do not start IQ/OQ/UAT until the items marked required for that phase exist. Do not invent executor names, credentials, or hostnames.

## Common (all phases)

| Prerequisite | Status now | Notes |
| --- | --- | --- |
| Named human executor | NOT_ESTABLISHED | Required on every evidence record |
| Unique candidate commit + tag `platform-core-v1.0-rc1` | Established (RC1). RC2 uses `platform-core-v1.0-rc2` |
| Validation package in that commit | In-repo under `validation/` |
| Evidence storage path | `validation/execution/evidence/` | IQ records present |
| Findings path | `validation/execution/findings/` | IQ-FIND-001 |
| No fabricated signatures | In force | |

---

## Required for IQ

| Prerequisite | Why |
| --- | --- |
| Candidate commit/tag | IQ-001 |
| Hosted or compose instance using docker/production overlay | IQ-002 |
| PostgreSQL reachable | IQ-005 |
| `permission.enabled` merged true | IQ-003 |
| GitHub OAuth env *names* set (values not copied to evidence) | IQ-004, IQ-015 |
| GitHub App env names if publish profile is in scope | IQ-015 |
| `commercial.createAuthorizationAuditPath` on a durable volume | IQ-006; CC-001 adds volume `create_authorization_audit` → `/app/.runtime` |
| RC2 validation compose | `docker-compose.validation.yml` (ports 7008 / 5435) |
| Health endpoints reachable | IQ-016 |
| Lockfile / Node / Yarn versions recorded | IQ-011, IQ-014 |
| SBOM or explicit NOT_ESTABLISHED | IQ-012 |

---

## Required for OQ

All IQ prerequisites plus:

| Prerequisite | Why |
| --- | --- |
| Approved Catalog User (Developer) | OQ-AUTH-001, Create |
| Viewer Catalog User | OQ-RBAC-001, UAT-003 |
| Owner Catalog User | OQ-RBAC-003 |
| Admin Catalog User | OQ-RBAC-004 |
| No-role / unmapped Catalog User | OQ-RBAC-006 |
| GitHub OAuth working end-to-end | OQ-AUTH-001 |
| GitHub App publish (for allowed Create) | OQ-SCF-001, OQ-GH-001 |
| Actions Read-only on a cataloged repo | OQ-CI-*, OQ-GH-001 |
| Entitled and not-entitled official Golden Path | OQ-ENT-001/002 |
| AWS Marketplace profile **only if** those OQ tests are in the execution set | OQ-ENT-003, OQ-AWS-001 |
| Admin access to retrieve audit JSONL | OQ-AUD-* |
| Production frontend build for bundle scan | OQ-SEC-002 |
| Browser identified (name + version) | UI OQ/UAT |

AWS is **not** required to start IQ or non-AWS OQ.

---

## Required for UAT

All OQ identity/GitHub prerequisites for the Developer journey plus:

| Prerequisite | Why |
| --- | --- |
| Interactive Scaffolder Create possible | UAT-001 |
| Catalog registration after Create | UAT-001 |
| A Data Product with UNKNOWN/degraded CI | UAT-005 |
| Unauthenticated access to the public URL | UAT-002 |

Golden Path *business* correctness is out of scope.

---

## Runtime versions (observed on 2026-08-22 planner host — confirm on executor host)

| Item | Observed / declared |
| --- | --- |
| Node | v22.12.0 (engines 22 \|\| 24) |
| Yarn | 4.13.0 |
| Postgres image | postgres:16-alpine (compose) |
| Browser | NOT_ESTABLISHED |

---

## Explicitly not required to start IQ

- AWS live Marketplace
- Compiled bundle scan tooling (OQ-SEC-002)
- Named validation approver / e-signature
- Validation Expert plugin
