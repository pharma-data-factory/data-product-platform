# OQ blocked tests evidence (RC2) — environment prerequisites

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| execution_timestamp | 2026-08-22T20:10:11+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| status | BLOCKED (listed tests) |

## Blocker A — Interactive authenticated sessions not established

Observed:

- Catalog **User** entities exist (`admin`, `developer`, `viewer`, `owner`, `guest`, `schmeckm`) and RBAC **Group** entities exist.
- `backstage_plugin_auth.sessions` count = **0**; `user_info` count = **0**.
- GitHub OAuth env names PRESENT_NON_EMPTY on container (values not recorded).
- No interactive browser OAuth sign-in was executed; no session cookie obtained.
- Authenticated APIs return 401 without credentials (authorize-create, ci-status, search, admin, TechDocs metadata).

Blocks: OQ-AUTH-001, OQ-RBAC-001…006, OQ-ENT-001, OQ-ENT-002, OQ-SCF-001…003, OQ-AUD-001…004, OQ-CI-001…004, OQ-GH-001, OQ-LEG-001, OQ-LEG-002, OQ-MKT-002, OQ-DOC-001, OQ-SRC-001.

Finding: **OQ-FIND-001**.

## Blocker B — AWS Marketplace provider not active on validation stack

Observed:

- `ENTITLEMENT_PROVIDER` ABSENT_DEFAULT_LOCAL.
- Validation compose uses production+github overlays, not marketplace-test/AWS profile.
- Register returns `NOT_CONFIGURED` (usable for LEG-004/006 inventory only).

Blocks: OQ-ENT-003, OQ-AWS-001.

Finding: **OQ-FIND-002**.

## Supporting probes (not PASS for blocked tests)

| Probe | Result |
| --- | --- |
| POST authorize-create (unauth) | 401 Missing credentials |
| GET ci-status (unauth) | 401 |
| GET search (unauth) | 401 |
| GET techdocs metadata (unauth) | 401 |
| GET /developer | 200 SPA shell only |
| GET /marketplace | 200 SPA shell only |
| Audit JSONL lines | IQ probe markers only (not Create GRANT/DENY) |
| Claim phrase scan in compiled JS | Forbidden GMP/GxP/Part11 COMPLIANT claims = 0; `NOT_VALIDATED` / `not GxP` / `DEGRADED / UNVERIFIED` present — insufficient alone for OQ-LEG-002 / OQ-CI-004 without authenticated UI |

## Objective evidence

`OQ-env-presence.txt`, `OQ-LEG-002-claim-scan.txt`, HTTP bodies under this directory, auth DB counts in this record.
