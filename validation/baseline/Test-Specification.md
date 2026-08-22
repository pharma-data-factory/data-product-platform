# Test Specification — Platform Core

**Document ID:** VAL-TS-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

No test in this document is PASSED or VALIDATED. Existing automated tests are **evidence candidates** only.

Verification state for all tests in this freeze: **NOT_EXECUTED**.

This baseline does not require electronic signatures. Use **reviewed execution evidence** or **approved execution evidence** as appropriate. Do not require "signed evidence" unless a customer's GxP governance later requires it (DEC-REVIEW-001).

TEST-AUTH-002 coverage of Guest-in-development remains useful as a **development control** check; it does not reinstate REJECTED URS-AUTH-005.

---

## Classification

| Class | Meaning here |
| --- | --- |
| Unit | Isolated function/config assertion |
| Integration | Multiple Core modules or config files |
| System | Running Control Plane observable behavior |
| Security | Abuse / bypass attempt |
| UAT | Authorized user journey |
| IQ candidate | Installation / configuration verification |
| OQ candidate | Operational challenge of specified functions |

---

## TEST-AUTH-001

| Field | Content |
| --- | --- |
| ID | TEST-AUTH-001 |
| Class | Unit / Integration |
| Verifies | URS-AUTH-002, SYS-AUTH-002, TDS-AUTH-002 |
| Objective | Production and Docker configs omit Guest provider and dangerous development flags |
| Method | Assert files as in existing test |
| Evidence candidate | `packages/backend/src/auth/identity.test.ts` |
| Execution evidence | NOT ESTABLISHED as reviewed execution evidence (Jest may run in CI; not an approved OQ record) |
| Result | **NOT EXECUTED** for this baseline |

## TEST-AUTH-002

| Field | Content |
| --- | --- |
| ID | TEST-AUTH-002 |
| Class | Unit |
| Verifies | URS-AUTH-003, URS-AUTH-005, SYS-AUTH-003, SYS-AUTH-005 |
| Objective | `decideSignInAccess` allows Guest/unknown GitHub only when environment ≠ production |
| Method | Table-drive `accessPolicy` |
| Evidence candidate | `packages/platform-common/src/accessPolicy.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-AUTH-003

| Field | Content |
| --- | --- |
| ID | TEST-AUTH-003 |
| Class | Integration |
| Verifies | URS-AUTH-004, SYS-AUTH-004 |
| Objective | User OAuth env keys are not used as GitHub App keys in config |
| Method | Existing github integration test |
| Evidence candidate | `packages/backend/src/githubIntegration.test.ts`; `identity.test.ts` GitHub section |
| Result | **NOT EXECUTED** for this baseline |

## TEST-AUTH-004

| Field | Content |
| --- | --- |
| ID | TEST-AUTH-004 |
| Class | System / OQ candidate / Security |
| Verifies | URS-AUTH-001, SYS-AUTH-001 |
| Objective | Unauthenticated `POST /api/scaffolder/v2/tasks` is rejected |
| Method | HTTP without session |
| Evidence candidate | `docs/pilot-exit-gate.md` notes 401 in that gate — historical note, not reviewed execution evidence |
| Result | **NOT EXECUTED** for this baseline |

## TEST-AUTH-005

| Field | Content |
| --- | --- |
| ID | TEST-AUTH-005 |
| Class | System / UAT / OQ candidate |
| Verifies | URS-AUTH-001, URS-SCF-001 |
| Objective | Approved Developer completes GitHub OAuth and reaches authenticated Home |
| Method | Interactive browser OAuth |
| Evidence | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Result | **NOT EXECUTED** |

## TEST-RBAC-001

| Field | Content |
| --- | --- |
| ID | TEST-RBAC-001 |
| Class | Unit |
| Verifies | URS-RBAC-001, URS-RBAC-004–007 |
| Objective | Permission name sets match role ranks |
| Evidence candidate | `packages/platform-common/src/policy.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-RBAC-002

| Field | Content |
| --- | --- |
| ID | TEST-RBAC-002 |
| Class | Unit / Integration |
| Verifies | URS-RBAC-002, SYS-RBAC-002 |
| Objective | Policy denies when user has no platform group |
| Evidence candidate | `packages/backend/src/permission/policy.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-RBAC-003

| Field | Content |
| --- | --- |
| ID | TEST-RBAC-003 |
| Class | Security / OQ candidate |
| Verifies | URS-RBAC-003, SYS-RBAC-003 |
| Objective | Viewer session cannot POST certification or admin entitlement approve |
| Method | Authenticated API as viewer user |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-ENT-001

| Field | Content |
| --- | --- |
| ID | TEST-ENT-001 |
| Class | Unit |
| Verifies | URS-ENT-001, URS-ENT-002, URS-SCF-002, SYS-ENT-002 |
| Objective | authorizeCreate returns RBAC / ENTITLEMENT / RELEASE / LEGAL as specified |
| Evidence candidate | `packages/platform-common/src/entitlement-service.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-ENT-002

| Field | Content |
| --- | --- |
| ID | TEST-ENT-002 |
| Class | Integration |
| Verifies | URS-ENT-001, SYS-ENT-001 |
| Objective | Scaffolder template permission denied without entitlement even if role is Developer |
| Evidence candidate | `packages/backend/src/permission/policy.test.ts` (if coverage exists — **NEEDS_REVIEW**) |
| Result | **NOT EXECUTED** for this baseline |

## TEST-ENT-003

| Field | Content |
| --- | --- |
| ID | TEST-ENT-003 |
| Class | System / Security |
| Verifies | URS-ENT-003 |
| Objective | `POST /api/entitlements/marketplace/register` does not set a Backstage session cookie |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-ENT-004

| Field | Content |
| --- | --- |
| ID | TEST-ENT-004 |
| Class | Unit / Integration |
| Verifies | URS-ENT-004 |
| Objective | AWS production mode does not fall back to INTERNAL grants on lookup failure |
| Evidence candidate | entitlements-backend AWS tests if present (`plugins/entitlements-backend`) |
| Status of mapping | **NEEDS_REVIEW** / IMPLEMENTATION_NOT_VERIFIED |
| Result | **NOT EXECUTED** for this baseline |

## TEST-LEG-001

| Field | Content |
| --- | --- |
| ID | TEST-LEG-001 |
| Class | Unit |
| Verifies | URS-LEG-001, SYS-LEG-001 |
| Objective | Customer handoff denied when legal BLOCKED; internal handoff not denied by LEGAL |
| Evidence candidate | `entitlement-service.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-LEG-002

| Field | Content |
| --- | --- |
| ID | TEST-LEG-002 |
| Class | UAT / System |
| Verifies | URS-LEG-002, URS-CI-001 |
| Objective | Marketplace / Data Product / Quality Gate pages do not claim GxP validated |
| Evidence candidate | marketplace data tests if they assert disclaimer strings |
| Result | **NOT EXECUTED** for this baseline |

## TEST-CAT-001

| Field | Content |
| --- | --- |
| ID | TEST-CAT-001 |
| Class | IQ candidate / Integration |
| Verifies | URS-CAT-001, SYS-CAT-001 |
| Objective | Configured locations ingest Templates and org Users/Groups |
| Method | Start Core; query catalog API |
| Evidence | NOT ESTABLISHED as reviewed IQ execution evidence |
| Result | **NOT EXECUTED** |

## TEST-CAT-002

| Field | Content |
| --- | --- |
| ID | TEST-CAT-002 |
| Class | IQ candidate |
| Verifies | URS-CAT-002 |
| Objective | Production/docker config files do not list `catalog/samples/` |
| Method | File inspection + catalog query after boot |
| Evidence candidate | Pilot Exit narrative; **NEEDS_REVIEW** of YAML |
| Result | **NOT EXECUTED** |

## TEST-CAT-003

| Field | Content |
| --- | --- |
| ID | TEST-CAT-003 |
| Class | System |
| Verifies | URS-CAT-003 |
| Objective | A data-product component is visible at `/data-products` |
| Evidence candidate | `plugins/data-products` page tests |
| Result | **NOT EXECUTED** for this baseline |

## TEST-SCF-001

| Field | Content |
| --- | --- |
| ID | TEST-SCF-001 |
| Class | UAT / OQ candidate / System |
| Verifies | URS-SCF-001, URS-GH-001 |
| Objective | Interactive Create with GitHub OAuth publishes a repo via the App |
| Evidence | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Result | **NOT EXECUTED** |

## TEST-SCF-002

| Field | Content |
| --- | --- |
| ID | TEST-SCF-002 |
| Class | System / Security |
| Verifies | URS-SCF-002, URS-RBAC-004 |
| Objective | Viewer cannot start Scaffolder task; Developer without entitlement cannot create commercial path |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-SCF-003

| Field | Content |
| --- | --- |
| ID | TEST-SCF-003 |
| Class | Unit |
| Verifies | URS-SCF-003 |
| Objective | Official path not RELEASED cannot be created |
| Evidence candidate | `packages/platform-common/src/releases.test.ts`; `goldenPathRelease.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-GH-001

| Field | Content |
| --- | --- |
| ID | TEST-GH-001 |
| Class | Integration |
| Verifies | URS-GH-001 |
| Objective | GitHub App config keys present in github overlay; not AUTH_GITHUB_* |
| Evidence candidate | `githubIntegration.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-GH-002

| Field | Content |
| --- | --- |
| ID | TEST-GH-002 |
| Class | Security |
| Verifies | URS-GH-002 |
| Objective | Built frontend assets do not contain GITHUB_PRIVATE_KEY or client secrets |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-GH-003

| Field | Content |
| --- | --- |
| ID | TEST-GH-003 |
| Class | System / OQ candidate |
| Verifies | URS-GH-003 |
| Objective | ci-status returns a real Actions conclusion when the App can read Actions; otherwise **DEGRADED / UNVERIFIED**. UNKNOWN must never be treated as PASS. |
| Evidence | Pilot Exit UNKNOWN; `plugins/data-products-backend/src/githubActions.test.ts` (unit mocks) |
| Result | **NOT EXECUTED** (live) |

## TEST-AUD-001

| Field | Content |
| --- | --- |
| ID | TEST-AUD-001 |
| Class | Unit |
| Verifies | URS-AUD-001 |
| Objective | authorizeCreate appends ACCESS_GRANTED or ACCESS_DENIED to auditTrail() |
| Evidence candidate | `entitlement-service.test.ts` if it asserts audit — **NEEDS_REVIEW** |
| Result | **NOT EXECUTED** for this baseline |

## TEST-AUD-002

| Field | Content |
| --- | --- |
| ID | TEST-AUD-002 |
| Class | Integration |
| Verifies | URS-AUD-001 |
| Objective | After application/service restart, validation-relevant Create authorization records remain retrievable (actor, timestamp, action, decision, context). Not a Part 11 test. |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-AUD-003

| Field | Content |
| --- | --- |
| ID | TEST-AUD-003 |
| Class | Security / OQ candidate |
| Verifies | URS-AUD-002 |
| Objective | POST /certification denied for Viewer; allowed for Owner |
| Evidence | NOT ESTABLISHED (router tests may exist — NEEDS_REVIEW `plugins/data-products-backend`) |
| Result | **NOT EXECUTED** for this baseline |

## TEST-DATA-001

| Field | Content |
| --- | --- |
| ID | TEST-DATA-001 |
| Class | IQ candidate |
| Verifies | URS-DATA-001 |
| Objective | Compose Postgres is healthy; Core uses `pg` client in docker/production config |
| Evidence candidate | `docker-compose.yml` healthcheck; `hostingProduction.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-DATA-002

| Field | Content |
| --- | --- |
| ID | TEST-DATA-002 |
| Class | IQ candidate / Security |
| Verifies | URS-DATA-002 |
| Objective | Committed app-config files use `${}` for secrets; no private key material in git |
| Evidence | NOT ESTABLISHED as a full-repo scan record |
| Result | **NOT EXECUTED** |

## TEST-CFG-001

| Field | Content |
| --- | --- |
| ID | TEST-CFG-001 |
| Class | IQ candidate |
| Verifies | URS-CFG-001, URS-CFG-002 |
| Objective | Target environment files record auth.environment, permission.enabled, legalDistributionStatus, catalog locations |
| Evidence | NOT ESTABLISHED (no IQ protocol) |
| Result | **NOT EXECUTED** |

## TEST-MKT-001

| Field | Content |
| --- | --- |
| ID | TEST-MKT-001 |
| Class | System |
| Verifies | URS-MKT-001 |
| Objective | `/marketplace` renders official paths; no payment UI |
| Evidence candidate | `plugins/marketplace/src/data.test.ts` |
| Result | **NOT EXECUTED** for this baseline |

## TEST-MKT-002

| Field | Content |
| --- | --- |
| ID | TEST-MKT-002 |
| Class | UAT |
| Verifies | URS-MKT-002 |
| Objective | Building blocks labeled as such |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-DOC-001

| Field | Content |
| --- | --- |
| ID | TEST-DOC-001 |
| Class | System |
| Verifies | URS-DOC-001, URS-SRC-001 |
| Objective | Authenticated user opens `/developer` and search returns catalog hits |
| Evidence candidate | `DeveloperHubPage.test.tsx`; Playwright `packages/app/e2e-tests/app.test.ts` (not in GH Actions) |
| Result | **NOT EXECUTED** for this baseline |

## TEST-CERT-001

| Field | Content |
| --- | --- |
| ID | TEST-CERT-001 |
| Class | Integration |
| Verifies | URS-CERT-001 |
| Objective | Overlay processor applies file overlay without claiming GxP |
| Evidence candidate | data-products-backend certification tests |
| Result | **NOT EXECUTED** for this baseline |

## TEST-IQ-001

| Field | Content |
| --- | --- |
| ID | TEST-IQ-001 |
| Class | IQ candidate |
| Verifies | URS-CFG-001, URS-DATA-001, URS-AUTH-002 |
| Objective | Installed image/config matches intended overlay set (production + github); Guest absent; Postgres reachable |
| Evidence | NOT ESTABLISHED — no IQ protocol exists |
| Result | **NOT EXECUTED** |

## TEST-IQ-002

| Field | Content |
| --- | --- |
| ID | TEST-IQ-002 |
| Class | IQ candidate |
| Verifies | URS-GH-001, URS-DATA-002 |
| Objective | Required env vars present on host; not committed |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-OQ-001

| Field | Content |
| --- | --- |
| ID | TEST-OQ-001 |
| Class | OQ candidate |
| Verifies | URS-RBAC-004–007, URS-SCF-002 |
| Objective | Four persona accounts exhibit specified allow/deny on Create, certification, entitlement admin |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-OQ-002

| Field | Content |
| --- | --- |
| ID | TEST-OQ-002 |
| Class | OQ candidate |
| Verifies | URS-GH-003, URS-CI-001 |
| Objective | Quality Gate shows a real run or UNKNOWN; copy is not GxP |
| Evidence | NOT ESTABLISHED (live UNKNOWN is a finding, not a pass) |
| Result | **NOT EXECUTED** |

## TEST-SEC-001

| Field | Content |
| --- | --- |
| ID | TEST-SEC-001 |
| Class | Security |
| Verifies | URS-AUTH-001, RA-001 |
| Objective | No Guest refresh success against production-mode process |
| Evidence candidate | Pilot Exit 403 narrative |
| Result | **NOT EXECUTED** for this baseline |

## TEST-SEC-002

| Field | Content |
| --- | --- |
| ID | TEST-SEC-002 |
| Class | Security |
| Verifies | URS-RBAC-003, RA-003 |
| Objective | Each custom API prefix denies Viewer for admin/create/certification mutations |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-SEC-003

| Field | Content |
| --- | --- |
| ID | TEST-SEC-003 |
| Class | Security |
| Verifies | URS-ENT-001, RA-005 |
| Objective | Direct scaffolder API cannot create commercial template without entitlement |
| Evidence | NOT ESTABLISHED |
| Result | **NOT EXECUTED** |

## TEST-UAT-001

| Field | Content |
| --- | --- |
| ID | TEST-UAT-001 |
| Class | UAT |
| Verifies | URS-MKT-001, URS-SCF-001, URS-CAT-003 |
| Objective | Approved Developer: Sign In → Marketplace → Create → Catalog Data Product visible |
| Evidence | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Result | **NOT EXECUTED** |

---

## Intentionally not specified

| Missing test | Why |
| --- | --- |
| OEE GitHub live publish | Out of Platform Core URS (`OEE_GITHUB_LIVE_PROOF_NOT_RUN` is an evidence/scope item) |
| Part 11 / e-signature tests | No corresponding URS |
| PQ of generated plant lines | Out of Core |
| Wave 1 pytest | Out of Core |

## Count

| Class | Approx. IDs |
| --- | --- |
| Unit / Integration | TEST-AUTH-001–003, TEST-RBAC-001–002, TEST-ENT-001–002, TEST-ENT-004, TEST-LEG-001, TEST-SCF-003, TEST-GH-001, TEST-AUD-001, TEST-CERT-001 |
| System / UAT / Security / IQ / OQ | remaining |
| **Total proposed tests** | **41** |

None marked PASSED.
