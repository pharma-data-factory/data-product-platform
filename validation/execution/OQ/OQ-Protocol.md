# OQ Protocol — Platform Core 1.0-RC1

| Field | Value |
| --- | --- |
| Document | VAL-OQ-PC-RC1 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Candidate | 1.0-RC1 |
| Validation status | NOT_VALIDATED |
| Execution | **NOT_EXECUTED** |

Operational Qualification challenges specified Platform Core functions on the installed candidate. Developer unit tests are not OQ evidence.

All Actual Result and Status fields are **NOT_EXECUTED** unless a test is marked **NOT_APPLICABLE_CURRENT_RELEASE**.

Do not validate Golden Path business content.

---

## Authentication

### OQ-AUTH-001 — GitHub OAuth sign-in

| Field | Content |
| --- | --- |
| Test ID | OQ-AUTH-001 |
| Requirement IDs | URS-AUTH-001, URS-AUTH-003 |
| Risk IDs | RA-001 |
| Baseline tests | TEST-AUTH-005, TEST-OQ-001 |
| Preconditions | IQ-004 complete; GitHub OAuth configured; approved Catalog User exists |
| Test Data | Approved GitHub user; unknown GitHub user (if safe) |
| Procedure | Sign in with GitHub as an approved Catalog User. Attempt sign-in as an unknown GitHub user if the environment allows. |
| Expected Result | Approved user receives a Control Plane session. Unknown GitHub user does not receive implicit Viewer access in production. |
| Evidence Required | Redacted session/identity screenshot or log; no tokens |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-AUTH-002 — Unauthenticated access

| Field | Content |
| --- | --- |
| Test ID | OQ-AUTH-002 |
| Requirement IDs | URS-AUTH-001 |
| Risk IDs | RA-001 |
| Baseline tests | TEST-AUTH-004, TEST-SEC-001 |
| Preconditions | Running Control Plane; no session cookie |
| Test Data | Unauthenticated HTTP client |
| Procedure | Call protected routes without credentials: Scaffolder task create, entitlements admin, certification POST, and at least one custom authorized GET that returns catalog data. |
| Expected Result | Requests are rejected (401/403). No catalog mutation and no Create. |
| Evidence Required | HTTP status and redacted bodies |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## RBAC

### OQ-RBAC-001 — Viewer

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-001 |
| Requirement IDs | URS-RBAC-001, URS-RBAC-004 |
| Risk IDs | RA-004, RA-003 |
| Baseline tests | TEST-RBAC-001, TEST-OQ-001 |
| Preconditions | Viewer Catalog identity |
| Test Data | `user` in Viewer group only |
| Procedure | Sign in as Viewer. Browse Catalog / Data Products. Attempt Create and certification write. |
| Expected Result | Read allowed where specified. Create and certification write denied. |
| Evidence Required | UI/API deny evidence |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-RBAC-002 — Developer

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-002 |
| Requirement IDs | URS-RBAC-001, URS-RBAC-005 |
| Risk IDs | RA-004, RA-005 |
| Baseline tests | TEST-RBAC-001, TEST-OQ-001 |
| Preconditions | Developer identity; entitlement where the chosen Golden Path requires it |
| Test Data | Developer user |
| Procedure | Confirm Developer can open an official Golden Path Create form when entitled. Confirm Developer cannot perform Admin-only actions. |
| Expected Result | Create path available when RBAC+entitlement+release allow. Admin routes denied. |
| Evidence Required | Allow/deny records |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-RBAC-003 — Owner

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-003 |
| Requirement IDs | URS-RBAC-006, URS-AUD-002 |
| Risk IDs | RA-003 |
| Baseline tests | TEST-AUD-003 |
| Preconditions | Owner identity |
| Test Data | Data Product Owner user |
| Procedure | Attempt technical certification write as Owner. Attempt the same as Viewer. |
| Expected Result | Owner/Admin allowed; Viewer denied. Stored state remains a technical CERTIFIED/TESTED/DEVELOPMENT label. |
| Evidence Required | HTTP/UI results |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-RBAC-004 — Admin

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-004 |
| Requirement IDs | URS-RBAC-007 |
| Risk IDs | RA-003 |
| Baseline tests | TEST-OQ-001 |
| Preconditions | Platform Admin identity |
| Test Data | Admin user |
| Procedure | Open entitlements admin / integration views. Confirm non-admin is denied. |
| Expected Result | Admin allowed; other roles denied. |
| Evidence Required | HTTP/UI results |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-RBAC-005 — Mutation denial

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-005 |
| Requirement IDs | URS-RBAC-003, URS-RBAC-004 |
| Risk IDs | RA-003 |
| Baseline tests | TEST-RBAC-003, TEST-SEC-002 |
| Preconditions | Viewer session |
| Test Data | Viewer credentials |
| Procedure | Attempt catalog write, scaffolder task create, certification POST, and release transition as Viewer. |
| Expected Result | Mutations denied by backend authorize, not only by hidden UI. |
| Evidence Required | HTTP 403/deny bodies |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Entitlements

### OQ-ENT-001 — GRANT

| Field | Content |
| --- | --- |
| Test ID | OQ-ENT-001 |
| Requirement IDs | URS-ENT-001, URS-ENT-002 |
| Risk IDs | RA-005 |
| Baseline tests | TEST-ENT-001 |
| Preconditions | Developer; organization entitled to an official Golden Path; release GA |
| Test Data | Entitled product / template |
| Procedure | Open template parameters / Create authorization for the entitled official Golden Path. |
| Expected Result | Entitlement layer allows. Deny reason is not ENTITLEMENT. |
| Evidence Required | Authorization result |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-ENT-002 — DENY

| Field | Content |
| --- | --- |
| Test ID | OQ-ENT-002 |
| Requirement IDs | URS-ENT-001, URS-ENT-002, URS-SCF-002 |
| Risk IDs | RA-005 |
| Baseline tests | TEST-ENT-001, TEST-SCF-002 |
| Preconditions | Developer; official Golden Path without entitlement |
| Test Data | Not-entitled commercial template |
| Procedure | Attempt template parameter read / Create for that template. |
| Expected Result | Denied. Reason distinguishes ENTITLEMENT from RBAC. |
| Evidence Required | Structured deny |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-ENT-003 — AWS fail-closed

| Field | Content |
| --- | --- |
| Test ID | OQ-ENT-003 |
| Requirement IDs | URS-ENT-004 |
| Risk IDs | RA-005, RA-013 |
| Baseline tests | TEST-ENT-004 |
| Preconditions | Marketplace-test or AWS production profile; AWS unavailable or unconfigured as designed |
| Test Data | AWS provider enabled |
| Procedure | Perform entitlement lookup / official Create while AWS is fail-closed. |
| Expected Result | No silent INTERNAL grant. Create/entitlement fails closed. |
| Evidence Required | Integration status and deny result |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Create authorization

### OQ-SCF-001 — Allowed Create

| Field | Content |
| --- | --- |
| Test ID | OQ-SCF-001 |
| Requirement IDs | URS-SCF-001, URS-SCF-003, URS-RBAC-005 |
| Risk IDs | RA-009, RA-016 |
| Baseline tests | TEST-SCF-001, TEST-AUTH-005 |
| Preconditions | OQ-AUTH-001; entitled Developer; GA official Golden Path; GitHub App publish configured |
| Test Data | Approved official template |
| Procedure | Execute interactive Scaffolder Create through the official UI path. |
| Expected Result | Task is authorized and proceeds when all layers allow. Golden Path *content* is not assessed. |
| Evidence Required | Task ID / repo URL (no secrets) |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-SCF-002 — Denied Create

| Field | Content |
| --- | --- |
| Test ID | OQ-SCF-002 |
| Requirement IDs | URS-SCF-002, URS-RBAC-004 |
| Risk IDs | RA-005 |
| Baseline tests | TEST-SCF-002 |
| Preconditions | Viewer and/or not-entitled Developer |
| Test Data | Official Golden Path template |
| Procedure | Attempt Create as Viewer. Attempt Create without entitlement. |
| Expected Result | Denied. Reasons distinguishable (RBAC vs ENTITLEMENT vs RELEASE). |
| Evidence Required | Deny results |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-SCF-003 — Durable audit of the official Create decision

| Field | Content |
| --- | --- |
| Test ID | OQ-SCF-003 |
| Requirement IDs | URS-AUD-001 |
| Risk IDs | RA-007 |
| Baseline tests | TEST-AUD-001 |
| Preconditions | IQ-006; OQ-SCF-001 and OQ-SCF-002 |
| Test Data | Same sessions |
| Procedure | After allowed and denied official Create authorization, retrieve durable records (admin audit or JSONL via admin API). Confirm they correspond to `PlatformPermissionPolicy` decisions (`scaffolder.task.create` / `scaffolder.action.execute` / `data-product.create`), not a substitute `/authorize-create`-only path. |
| Expected Result | GRANT and DENY records exist with actor, timestamp, action, decision, context. |
| Evidence Required | Redacted audit records |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Audit

### OQ-AUD-001 — GRANT record

| Field | Content |
| --- | --- |
| Test ID | OQ-AUD-001 |
| Requirement IDs | URS-AUD-001 |
| Risk IDs | RA-007 |
| Baseline tests | TEST-AUD-001 |
| Preconditions | OQ-SCF-003 |
| Test Data | Developer GRANT |
| Procedure | Inspect the GRANT record fields. |
| Expected Result | Actor, `at`, action, GRANT, authorization context present. |
| Evidence Required | Redacted record |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-AUD-002 — DENY record

| Field | Content |
| --- | --- |
| Test ID | OQ-AUD-002 |
| Requirement IDs | URS-AUD-001 |
| Risk IDs | RA-007 |
| Baseline tests | TEST-AUD-001 |
| Preconditions | Viewer or not-entitled DENY |
| Test Data | Viewer `scaffolder.task.create` |
| Procedure | Inspect the DENY record. |
| Expected Result | DENY with actor and reason layer (at least RBAC for Viewer task.create). |
| Evidence Required | Redacted record |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-AUD-003 — Restart persistence

| Field | Content |
| --- | --- |
| Test ID | OQ-AUD-003 |
| Requirement IDs | URS-AUD-001 |
| Risk IDs | RA-007 |
| Baseline tests | TEST-AUD-002 |
| Preconditions | OQ-AUD-001/002 records written |
| Test Data | Existing JSONL file |
| Procedure | Restart the Control Plane process (or service). Retrieve records via admin GET `/admin/entitlements` (or documented admin path). |
| Expected Result | Prior GRANT/DENY records remain retrievable. |
| Evidence Required | Pre/post restart retrieval |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-AUD-004 — Torn / malformed record handling

| Field | Content |
| --- | --- |
| Test ID | OQ-AUD-004 |
| Requirement IDs | URS-AUD-001 |
| Risk IDs | RA-007 |
| Baseline tests | (P1 technical; no dedicated baseline TEST ID) |
| Preconditions | Writable audit file on a controlled host; change control if this mutates the candidate file |
| Test Data | Valid prior line plus an incomplete last JSONL line |
| Procedure | Append a torn line. Call list/admin retrieval. Confirm prior records remain, issues report MALFORMED_JSON, file bytes for the torn line remain. Do not claim Part 11. |
| Expected Result | Deterministic safe retrieval. No silent promotion of torn bytes to a valid event. |
| Evidence Required | `audit` + `auditIssues`; file excerpt |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## CI / GitHub

### OQ-CI-001 — PASS

| Field | Content |
| --- | --- |
| Test ID | OQ-CI-001 |
| Requirement IDs | URS-GH-003, URS-CI-001 |
| Risk IDs | RA-012 |
| Baseline tests | TEST-GH-003, TEST-OQ-002 |
| Preconditions | GitHub App Actions Read-only; a cataloged repo with a passing `ci.yml` |
| Test Data | Entity ref with PASS run |
| Procedure | GET CI status / Quality Gate UI. |
| Expected Result | Technical PASS shown. Copy states this is not GxP validation. |
| Evidence Required | Status payload / screenshot |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-CI-002 — FAIL

| Field | Content |
| --- | --- |
| Test ID | OQ-CI-002 |
| Requirement IDs | URS-GH-003 |
| Risk IDs | RA-012 |
| Baseline tests | TEST-GH-003 |
| Preconditions | Cataloged repo with failing Actions |
| Test Data | FAIL run |
| Procedure | Retrieve CI status. |
| Expected Result | FAIL shown. Not interpreted as PASS. |
| Evidence Required | Status payload |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-CI-003 — UNKNOWN

| Field | Content |
| --- | --- |
| Test ID | OQ-CI-003 |
| Requirement IDs | URS-GH-003 |
| Risk IDs | RA-012 |
| Baseline tests | TEST-GH-003 |
| Preconditions | Missing Actions permission or no run |
| Test Data | Entity that yields UNKNOWN from GitHub |
| Procedure | Retrieve CI status. |
| Expected Result | UNKNOWN is not treated as PASS. |
| Evidence Required | Status payload |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-CI-004 — UNKNOWN displayed as DEGRADED / UNVERIFIED

| Field | Content |
| --- | --- |
| Test ID | OQ-CI-004 |
| Requirement IDs | URS-GH-003, DEC-CI-001 |
| Risk IDs | RA-012 |
| Baseline tests | TEST-OQ-002 |
| Preconditions | OQ-CI-003 |
| Test Data | Same UNKNOWN result |
| Procedure | Observe UI label. |
| Expected Result | Representation is **DEGRADED / UNVERIFIED**. |
| Evidence Required | UI screenshot |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-GH-001 — Live Actions Read-only

| Field | Content |
| --- | --- |
| Test ID | OQ-GH-001 |
| Requirement IDs | URS-GH-001, URS-GH-003 |
| Risk IDs | RA-009, RA-012 |
| Baseline tests | TEST-GH-001, TEST-GH-003 |
| Preconditions | GitHub App with Actions Read-only on a real repo |
| Test Data | Live Actions |
| Procedure | Confirm publish uses App credentials (not user OAuth secret) and Actions status can be read when permission is granted. |
| Expected Result | App-based publish config; live status when permitted. |
| Evidence Required | Redacted App config proof; live status |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Secrets

### OQ-SEC-001 — Committed configuration

| Field | Content |
| --- | --- |
| Test ID | OQ-SEC-001 |
| Requirement IDs | URS-DATA-002, URS-GH-002 |
| Risk IDs | RA-010, RA-009 |
| Baseline tests | TEST-DATA-002, TEST-GH-002 (source) |
| Preconditions | Candidate source tree |
| Test Data | `app-config*.yaml` |
| Procedure | Review committed overlays for raw secrets, private keys, tokens. |
| Expected Result | Secrets are `${ENV}` placeholders. Public clientId may be present. |
| Evidence Required | Review checklist |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-SEC-002 — Compiled frontend bundle scan

| Field | Content |
| --- | --- |
| Test ID | OQ-SEC-002 |
| Requirement IDs | URS-GH-002 |
| Risk IDs | RA-009 |
| Baseline tests | TEST-GH-002 |
| Preconditions | Production frontend build |
| Test Data | Compiled bundle |
| Procedure | Scan the compiled frontend for private keys, tokens, client secrets. |
| Expected Result | Secrets/tokens/private keys absent. Public clientId permitted. |
| Evidence Required | Scan record |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-SEC-003 — Public clientId vs secrets

| Field | Content |
| --- | --- |
| Test ID | OQ-SEC-003 |
| Requirement IDs | URS-GH-002 |
| Risk IDs | RA-009 |
| Baseline tests | TEST-GH-002 |
| Preconditions | OQ-SEC-001/002 |
| Test Data | Frontend-visible config |
| Procedure | Confirm only permitted public identifiers are frontend-visible. |
| Expected Result | `clientId` may be public. `clientSecret`, private keys, tokens are not. |
| Evidence Required | Visibility checklist |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## AWS Marketplace

### OQ-AWS-001 — Fail-closed

| Field | Content |
| --- | --- |
| Test ID | OQ-AWS-001 |
| Requirement IDs | URS-ENT-004, URS-ENT-003 |
| Risk IDs | RA-005 |
| Baseline tests | TEST-ENT-004, TEST-ENT-003 |
| Preconditions | AWS profile or marketplace-test overlay |
| Test Data | Unconfigured or failing AWS |
| Procedure | Observe integration status and Create/entitlement. Confirm register does not create a tenant or session. |
| Expected Result | Fail-closed. `tenantCreated=false`, `accessGranted=false`, no session cookie. |
| Evidence Required | HTTP/integration evidence |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Catalog

### OQ-CAT-001 — Production catalog

| Field | Content |
| --- | --- |
| Test ID | OQ-CAT-001 |
| Requirement IDs | URS-CAT-001, URS-CAT-003 |
| Risk IDs | RA-010 |
| Baseline tests | TEST-CAT-001, TEST-CAT-003 |
| Preconditions | IQ-008 |
| Test Data | Hosted catalog |
| Procedure | Browse Catalog and Data Products for production entities. |
| Expected Result | Production entities discoverable. |
| Evidence Required | Catalog screenshots / query |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-CAT-002 — Samples absent

| Field | Content |
| --- | --- |
| Test ID | OQ-CAT-002 |
| Requirement IDs | URS-CAT-002 |
| Risk IDs | RA-010 |
| Baseline tests | TEST-CAT-002, TEST-IQ-001 |
| Preconditions | IQ-009 |
| Test Data | Known sample entity names |
| Procedure | Search hosted catalog for sample-only entities. |
| Expected Result | Sample-only entities absent. |
| Evidence Required | Query result |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Claim control

### OQ-LEG-002 — Technical CERTIFIED / RELEASED not GMP

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-002 |
| Requirement IDs | URS-LEG-002, URS-CI-001, URS-CERT-001 |
| Risk IDs | RA-014, RA-017 |
| Baseline tests | TEST-LEG-002, TEST-CERT-001 |
| Preconditions | Authenticated Viewer or Developer |
| Test Data | Composer, Release Catalog, Quality Gate, Marketplace, Legal, Data Product |
| Procedure | Walk Core surfaces. Record whether CERTIFIED/RELEASED/composition VALIDATED can reasonably be read as GMP/GxP/Part 11 validation. Confirm platform status NOT_VALIDATED appears where specified. |
| Expected Result | Technical states are qualified. No GMP VALIDATED / GxP COMPLIANT / PART 11 COMPLIANT claim. |
| Evidence Required | Screenshots |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Legal Gate

Policy: DEC-LEGAL-002 / CLOSED OPEN-LEG-001. Official Scaffolder Create is internal and is **not** a Legal Gate operation.

### OQ-LEG-001 — Customer Handoff (exists in RC1)

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-001 |
| Requirement IDs | URS-LEG-001, URS-SCF-002 |
| Risk IDs | RA-006 |
| Baseline tests | TEST-LEG-001 |
| Preconditions | `legalDistributionStatus=BLOCKED` then `APPROVED` (controlled config change with change record if it alters the candidate) |
| Test Data | `POST /api/entitlements/authorize-create` with `handoff=customer` and `handoff=internal` |
| Procedure | As a role that can invoke the API: customer handoff while BLOCKED; internal handoff while BLOCKED; customer handoff while APPROVED. |
| Expected Result | Customer + BLOCKED → LEGAL deny. Internal + BLOCKED → not denied by LEGAL. Customer + APPROVED → Legal Gate allows (other layers may still deny). |
| Evidence Required | JSON responses |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-LEG-003 — Customer Package Export

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-003 |
| Requirement IDs | URS-LEG-001 |
| Risk IDs | RA-006 |
| Preconditions | None |
| Test Data | n/a |
| Procedure | Confirm no Customer Package Export operation exists in RC1. |
| Expected Result | Operation absent. Record **NOT_APPLICABLE_CURRENT_RELEASE** after inventory confirmation. Do not invent an export Legal Gate. |
| Evidence Required | Written confirmation / inventory |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-LEG-004 — Commercial Activation

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-004 |
| Requirement IDs | URS-LEG-001, URS-ENT-003 |
| Risk IDs | RA-006 |
| Preconditions | None |
| Test Data | n/a |
| Procedure | Confirm Marketplace register is not commercial activation (`accessGranted: false`). No separate activation operation exists. |
| Expected Result | No activation operation. Record **NOT_APPLICABLE_CURRENT_RELEASE** after confirmation. Register remains a non-activating handshake (OQ-AWS-001). |
| Evidence Required | Register contract / inventory |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-LEG-005 — Marketplace Commercial Release

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-005 |
| Requirement IDs | URS-LEG-001 |
| Risk IDs | RA-006 |
| Preconditions | None |
| Test Data | n/a |
| Procedure | Confirm no Marketplace commercial publish/release operation exists. Technical RELEASED is a different dimension. |
| Expected Result | Operation absent. Record **NOT_APPLICABLE_CURRENT_RELEASE** after inventory confirmation. |
| Evidence Required | Inventory |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-LEG-006 — Customer Tenant Provisioning

| Field | Content |
| --- | --- |
| Test ID | OQ-LEG-006 |
| Requirement IDs | URS-LEG-001, URS-ENT-003 |
| Risk IDs | RA-006 |
| Preconditions | None |
| Test Data | n/a |
| Procedure | Confirm tenant provisioning is not enabled. |
| Expected Result | Tenant provisioning absent (`tenantCreated: false`). Record **NOT_APPLICABLE_CURRENT_RELEASE** after confirmation. |
| Evidence Required | Inventory / register contract |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## Formal coverage added in Phase 5A.1

These tests were added so every active URS has a planned formal verification item. They are **NOT_EXECUTED**.

### OQ-RBAC-006 — No-role / unmapped user deny

| Field | Content |
| --- | --- |
| Test ID | OQ-RBAC-006 |
| Requirement IDs | URS-RBAC-002 |
| Risk IDs | RA-004 |
| Baseline tests | TEST-RBAC-002 |
| Preconditions | Signed-in Catalog User who is **not** a member of Viewer, Developer, Owner, or Admin groups |
| Test Data | Unmapped user entity |
| Procedure | Authenticate as that user. Attempt Catalog privileged write, Scaffolder Create, entitlements admin, and certification POST. Confirm policy treats the user as having no platform role. |
| Expected Result | Privileged actions are denied. The user does not inherit Viewer or higher. |
| Evidence Required | HTTP/UI deny records; identity/group excerpt (no secrets) |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-MKT-002 — Building-block labels

| Field | Content |
| --- | --- |
| Test ID | OQ-MKT-002 |
| Requirement IDs | URS-MKT-002 |
| Risk IDs | RA-014 |
| Baseline tests | TEST-MKT-002 |
| Preconditions | Authenticated Viewer or Developer; Marketplace page available |
| Test Data | At least one Platform Component offering and one Data Product offering |
| Procedure | Open Marketplace. Record labels on Platform Component cards versus Data Product / Golden Path cards. Confirm a Platform Component is presented as a building block, not as a business Data Product. |
| Expected Result | Platform Components are labeled as building blocks (or equivalent). They are not presented as business Data Products. |
| Evidence Required | Screenshots of labeled cards |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-DOC-001 — Developer Hub and TechDocs

| Field | Content |
| --- | --- |
| Test ID | OQ-DOC-001 |
| Requirement IDs | URS-DOC-001 |
| Risk IDs | RA-014 |
| Baseline tests | TEST-DOC-001 |
| Preconditions | Authenticated user with read access; TechDocs index built for at least one documented entity if the host builds docs |
| Test Data | `/developer` (Developer Hub); a Catalog entity with TechDocs |
| Procedure | Sign in. Open Developer Hub. Open hosted TechDocs for a documented Core/interface entity. Record any index failure. |
| Expected Result | Authenticated user can open Developer Hub. TechDocs content hosted by the Control Plane opens when an index exists. A documented index gap is a finding, not a pass. Golden Path *content* is not judged. |
| Evidence Required | Screenshots / URLs |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

### OQ-SRC-001 — Search Catalog and TechDocs with authorized visibility

| Field | Content |
| --- | --- |
| Test ID | OQ-SRC-001 |
| Requirement IDs | URS-SRC-001 |
| Risk IDs | RA-014 |
| Baseline tests | TEST-DOC-001 |
| Preconditions | Search indexes built (catalog and, if available, TechDocs). Authenticated user with read access. Unauthenticated or no-role user available for a negative check. |
| Test Data | Known catalog entity name; known TechDocs term if indexed |
| Procedure | As an authorized reader, search for a catalog entity and (if indexed) a TechDocs term. As unauthenticated or no-role, confirm search does not expose privileged results beyond specified public/authorized visibility. |
| Expected Result | Authorized search returns Catalog hits and TechDocs hits when those indexes exist. Results respect authorization. Missing indexes are recorded as DEGRADED/findings, not invented as PASS. |
| Evidence Required | Search result screenshots; index status |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |
