# User Requirements Specification — Platform Core

**Document ID:** VAL-URS-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0 (`PDF-PC-VAL-BL-1.0`)  
**Requirement document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Part 11:** NOT_CLAIMED  
**Date:** 2026-08-22

This artifact was generated as a PROPOSED validation baseline from repository evidence and then updated to apply documented human baseline decisions. It is a **requirements baseline**, not a validated release.

Human review history: `validation/reviews/URS-Human-Review.md` (Phase 2B records preserved).  
Decisions: `validation/reviews/Validation-Decisions.md`.

Dimensions are not collapsed:

| Dimension | Meaning |
| --- | --- |
| Requirement state | BASELINED / REJECTED / OPEN_POLICY_DEFINITION |
| Implementation | IMPLEMENTED / PARTIALLY_IMPLEMENTED / NOT_IMPLEMENTED / NOT_VERIFIED |
| Verification | NOT_EXECUTED / PASSED / FAILED / BLOCKED |

Do not use VALIDATED as a requirement state.

---

## Baseline disposition

| URS | Requirement state | Human decision | Implementation | Verification |
| --- | --- | --- | --- | --- |
| URS-AUTH-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-AUTH-002 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-AUTH-003 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-AUTH-004 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-AUTH-005 | REJECTED | REJECT | n/a (not an active requirement) | n/a |
| URS-RBAC-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-002 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-003 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-004 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-005 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-006 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-RBAC-007 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-ENT-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-ENT-002 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-ENT-003 | BASELINED | ACCEPT | NOT_VERIFIED | NOT_EXECUTED |
| URS-ENT-004 | BASELINED | ACCEPT | NOT_VERIFIED | NOT_EXECUTED |
| URS-LEG-001 | BASELINED | MODIFY | IMPLEMENTED | NOT_EXECUTED |
| URS-LEG-002 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-CAT-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-CAT-002 | BASELINED | ACCEPT | NOT_VERIFIED | NOT_EXECUTED |
| URS-CAT-003 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-SCF-001 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-SCF-002 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-SCF-003 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-GH-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-GH-002 | BASELINED | MODIFY | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-GH-003 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-CI-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-AUD-001 | BASELINED | MODIFY | IMPLEMENTED | NOT_EXECUTED |
| URS-AUD-002 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-DATA-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-DATA-002 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-CFG-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-CFG-002 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-MKT-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |
| URS-MKT-002 | BASELINED | ACCEPT | NOT_VERIFIED | NOT_EXECUTED |
| URS-DOC-001 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-SRC-001 | BASELINED | ACCEPT | PARTIALLY_IMPLEMENTED | NOT_EXECUTED |
| URS-CERT-001 | BASELINED | ACCEPT | IMPLEMENTED | NOT_EXECUTED |

Active BASELINED count: **38**. REJECTED count: **1**. OPEN_POLICY_DEFINITION: **0** (`OPEN-LEG-001` CLOSED 2026-08-22; see DEC-LEGAL-002).

---

## Active BASELINED requirements

### URS-AUTH-001

| Field | Content |
| --- | --- |
| ID | URS-AUTH-001 |
| Requirement | A user shall authenticate before using protected Control Plane functions (Catalog write, Scaffolder, entitlements, certification management). |
| Rationale | Intended access control for the portal. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §5, §6; `PRODUCT.md` |
| Evidence reference | `data-product-platform/app-config.yaml`; `packages/backend/src/index.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-AUTH-002

| Field | Content |
| --- | --- |
| ID | URS-AUTH-002 |
| Requirement | Production configuration shall not accept the Guest identity. |
| Rationale | Guest is DEVELOPMENT_ONLY. Production Guest authentication is prohibited (DEC-GUEST-001). |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6; DEC-GUEST-001 |
| Evidence reference | `packages/backend/src/auth/identity.test.ts`; `app-config.production.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-AUTH-003

| Field | Content |
| --- | --- |
| ID | URS-AUTH-003 |
| Requirement | In production, GitHub sign-in shall succeed only for an approved Catalog User. Unknown GitHub users shall not receive implicit Viewer access. |
| Rationale | Production identity is catalog-backed. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6; `accessPolicy.ts` |
| Evidence reference | `packages/platform-common/src/accessPolicy.ts`; `identity.test.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-AUTH-004

| Field | Content |
| --- | --- |
| ID | URS-AUTH-004 |
| Requirement | GitHub user login credentials shall be separate from GitHub App repository-publishing credentials. |
| Rationale | Least privilege; login must not be conflated with org repo administration. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6 |
| Evidence reference | `app-config.yaml`; `app-config.github.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-001

| Field | Content |
| --- | --- |
| ID | URS-RBAC-001 |
| Requirement | Authorization shall use approved platform roles derived from Catalog group membership: Viewer, Developer, Data Product Owner, Platform Admin. |
| Rationale | Documented RBAC model independent of IdP. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6; `roles.ts` |
| Evidence reference | `packages/platform-common/src/roles.ts`; `catalog/org.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-002

| Field | Content |
| --- | --- |
| ID | URS-RBAC-002 |
| Requirement | A signed-in user with no platform role shall be denied privileged Control Plane actions. |
| Rationale | Unknown or unassigned users must not inherit Viewer or higher. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6 |
| Evidence reference | `packages/platform-common/src/policy.ts`; `packages/backend/src/permission/policy.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-003

| Field | Content |
| --- | --- |
| ID | URS-RBAC-003 |
| Requirement | Authorization shall be enforced on the backend. Hiding a UI control shall not be sufficient to grant or deny an action. |
| Rationale | Explicit architecture rule. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6 |
| Evidence reference | `packages/backend/src/permission/policy.ts`; `app-config.yaml` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-004

| Field | Content |
| --- | --- |
| ID | URS-RBAC-004 |
| Requirement | A Viewer shall be able to read Catalog, Marketplace, and Data Product information and shall not create Data Products. |
| Rationale | Least privilege for browse-only users. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `catalog/org.yaml`; `permissions.ts` |
| Evidence reference | `packages/platform-common/src/permissions.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-005

| Field | Content |
| --- | --- |
| ID | URS-RBAC-005 |
| Requirement | A Developer shall be able to execute approved Scaffolder templates when release, entitlement, and applicable legal gates also pass. |
| Rationale | Intended Create role. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `catalog/org.yaml`; `PRODUCT.md` |
| Evidence reference | `permissions.ts`; `entitlement-service.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-006

| Field | Content |
| --- | --- |
| ID | URS-RBAC-006 |
| Requirement | A Data Product Owner shall be able to perform technical certification management in addition to Developer capabilities. |
| Rationale | Owner/governance actions. Technical cert ≠ GxP. |
| GxP relevance | Claim-control |
| Risk level | Medium |
| Source | `catalog/org.yaml` |
| Evidence reference | `packages/platform-common/src/permissions.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-RBAC-007

| Field | Content |
| --- | --- |
| ID | URS-RBAC-007 |
| Requirement | A Platform Admin shall be able to administer platform, templates, marketplace, Golden Path release transitions, and entitlements. |
| Rationale | Documented admin role. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `catalog/org.yaml` |
| Evidence reference | `packages/platform-common/src/permissions.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-ENT-001

| Field | Content |
| --- | --- |
| ID | URS-ENT-001 |
| Requirement | Creating a commercially offered Golden Path shall require an active entitlement for the organization, in addition to RBAC. |
| Rationale | Commercial capability is not a role. Independent of the legal gate. |
| GxP relevance | None / Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §13 |
| Evidence reference | `entitlement-service.ts`; `packages/backend/src/permission/policy.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-ENT-002

| Field | Content |
| --- | --- |
| ID | URS-ENT-002 |
| Requirement | Entitlement decisions shall be independent of platform role. Missing entitlement shall not be explained as an RBAC failure except as an additional deny on commercial Create. |
| Rationale | Documented two-layer model. RBAC and entitlement remain independent. |
| GxP relevance | None / Indirect |
| Risk level | Medium |
| Source | `policy.ts`; `entitlements.ts` |
| Evidence reference | `packages/backend/src/permission/policy.ts`; `packages/platform-common/src/entitlements.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-ENT-003

| Field | Content |
| --- | --- |
| ID | URS-ENT-003 |
| Requirement | AWS Marketplace registration shall not create a tenant and shall not grant a Control Plane portal session. Human Catalog identity shall remain separate from the AWS customer identity. |
| Rationale | No silent tenancy. |
| GxP relevance | None |
| Risk level | Medium |
| Source | `ARCHITECTURE.md` §13 |
| Evidence reference | `plugins/entitlements-backend/src/registration.ts` |
| Requirement state | BASELINED |
| Implementation | NOT_VERIFIED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-ENT-004

| Field | Content |
| --- | --- |
| ID | URS-ENT-004 |
| Requirement | When the entitlement provider is AWS in a production commercial environment, entitlement lookup shall fail closed (no silent INTERNAL fallback). |
| Rationale | Fail-closed production rule. |
| GxP relevance | None / Indirect |
| Risk level | High |
| Source | `ROADMAP.md` V1.2; `ARCHITECTURE.md` §13 |
| Evidence reference | `plugins/entitlements-backend/src/awsMarketplace.ts` |
| Requirement state | BASELINED |
| Implementation | NOT_VERIFIED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-LEG-001

| Field | Content |
| --- | --- |
| ID | URS-LEG-001 |
| Requirement | The Legal Gate shall deny explicitly defined commercial/customer-handoff operations unless legal distribution status is APPROVED. The Legal Gate shall not automatically block every internal development Create operation. RBAC and entitlement remain independent authorization controls. |
| Policy detail | Exact list: **CLOSED** (`OPEN-LEG-001` / DEC-LEGAL-002). Internal development (Catalog browse; internal Data Product Create; Scaffolder / Repository Create; Build and Test; Internal Development Deployment) does **not** require the Legal Gate. Commercial/customer operations (Customer Package Export; Customer Handoff; Commercial Activation; Marketplace Commercial Release; Customer Tenant Provisioning) **do** require the Legal Gate. RC1 implements Legal Gate only for existing Customer Handoff (`authorizeCreate` `handoff=customer`). Other commercial operations are **NOT_APPLICABLE_CURRENT_RELEASE**. Requirement sentence unchanged. |
| Rationale | Legal distribution BLOCKED must apply to customer handoff, not to all internal engineering Create (DEC-LEGAL-001). |
| GxP relevance | None (legal/commercial) |
| Risk level | High |
| Source | `PRODUCT.md` §8; DEC-LEGAL-001 |
| Evidence reference | `packages/platform-common/src/entitlement-service.ts` |
| Requirement state | BASELINED (policy detail CLOSED) |
| Implementation | IMPLEMENTED (Customer Handoff API only; other listed commercial operations NOT_APPLICABLE_CURRENT_RELEASE) |
| Verification | NOT_EXECUTED |
| Human decision | MODIFY |
| Proposed (historical) | Customer artifact handoff shall be denied unless legal distribution status is APPROVED. Internal generation may remain available when status is BLOCKED. |

### URS-LEG-002

| Field | Content |
| --- | --- |
| ID | URS-LEG-002 |
| Requirement | The Control Plane shall not present technical CERTIFIED or RELEASED as GxP validated, regulatory approved, or commercially distributable when those dimensions are not met. |
| Rationale | Status model forbids collapsing dimensions. |
| GxP relevance | Claim-control |
| Risk level | High |
| Source | `docs/status-model.md`; `PRODUCT.md` §6 |
| Evidence reference | `docs/status-model.md`; `plugins/marketplace/src/data.ts` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CAT-001

| Field | Content |
| --- | --- |
| ID | URS-CAT-001 |
| Requirement | The Control Plane shall maintain a catalog of software and Data Product entities (name, owner, type, documentation links, relations). |
| Rationale | Discover capability. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `PRODUCT.md` §3; `ARCHITECTURE.md` §8 |
| Evidence reference | `app-config.yaml` catalog.locations |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CAT-002

| Field | Content |
| --- | --- |
| ID | URS-CAT-002 |
| Requirement | Production and Docker Control Plane configurations shall not load local demo/sample catalog locations. |
| Rationale | Hosted catalog must not present fixtures as real assets. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `app-config.yaml`; `docs/pilot-exit-gate.md` |
| Evidence reference | `app-config.yaml`; `app-config.docker.yaml`; `app-config.production.yaml` |
| Requirement state | BASELINED |
| Implementation | NOT_VERIFIED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CAT-003

| Field | Content |
| --- | --- |
| ID | URS-CAT-003 |
| Requirement | Data Products registered in the Catalog shall be discoverable under the Data Products experience. |
| Rationale | Official journey endpoint (interface). |
| GxP relevance | None |
| Risk level | Low |
| Source | `PRODUCT.md` §4 |
| Evidence reference | `plugins/data-products/src/plugin.tsx` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-SCF-001

| Field | Content |
| --- | --- |
| ID | URS-SCF-001 |
| Requirement | An authorized user shall be able to create a GitHub repository from an approved Scaffolder template. |
| Rationale | Create Golden Path / service template. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `PRODUCT.md` §3; `ARCHITECTURE.md` §6, §9 |
| Evidence reference | `packages/backend/src/index.ts`; `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-SCF-002

| Field | Content |
| --- | --- |
| ID | URS-SCF-002 |
| Requirement | Create shall be denied when RBAC, release eligibility, required entitlement, or applicable legal handoff check fails. The deny reason shall distinguish those layers. |
| Rationale | Fail closed on each independent gate. Legal applicability follows URS-LEG-001. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `entitlement-service.ts` |
| Evidence reference | `packages/platform-common/src/entitlement-service.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-SCF-003

| Field | Content |
| --- | --- |
| ID | URS-SCF-003 |
| Requirement | Official Golden Path Create shall be offered only for a generally available (RELEASED) version per the release catalog. |
| Rationale | Versioned product assets. |
| GxP relevance | Claim-control |
| Risk level | Medium |
| Source | `docs/engineering/golden-path-lifecycle.md` |
| Evidence reference | `packages/platform-common/src/releases.ts`; `golden-path-releases.json` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-GH-001

| Field | Content |
| --- | --- |
| ID | URS-GH-001 |
| Requirement | Repository publishing shall use the GitHub App integration loaded by the backend, not end-user OAuth as the publishing secret. |
| Rationale | Org-repo publish; least privilege. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6 |
| Evidence reference | `app-config.github.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-GH-002

| Field | Content |
| --- | --- |
| ID | URS-GH-002 |
| Requirement | OAuth client IDs may be public configuration. OAuth client secrets, access tokens, private keys, and equivalent credentials shall not be exposed through source code, generated artifacts, logs, UI, or public configuration. |
| Rationale | Trust boundary. Public client IDs are normal for OAuth; secrets are not. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §6; Phase 2C MODIFY |
| Evidence reference | `app-config.yaml`; `app-config.github.yaml` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | MODIFY |
| Proposed (historical) | The frontend shall not receive GitHub App or OAuth client secrets. |

### URS-GH-003

| Field | Content |
| --- | --- |
| ID | URS-GH-003 |
| Requirement | The Control Plane shall resolve CI workflow status for a cataloged Data Product from GitHub using server-side credentials and display it as a technical Quality Gate, not as GxP evidence. |
| CI interpretation (DEC-CI-001) | Status `UNKNOWN` shall never be interpreted as `PASS`. `UNKNOWN` shall be represented as explicit **DEGRADED / UNVERIFIED**. |
| Rationale | Official journey Quality Gate. |
| GxP relevance | Claim-control |
| Risk level | High |
| Source | `PRODUCT.md` §4; DEC-CI-001 |
| Evidence reference | `plugins/data-products-backend/src/githubActions.ts`; `CiQualityGateCard.tsx`; `docs/pilot-exit-gate.md` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT (interpretation clarified by DEC-CI-001) |
| Proposed (historical) | Same core text as Phase 2 PROPOSED; DEC-CI-001 adds UNKNOWN representation. |

### URS-CI-001

| Field | Content |
| --- | --- |
| ID | URS-CI-001 |
| Requirement | Platform Core shall treat GitHub Actions results as technical pipeline status only. |
| Rationale | Prevents collapsing CI pass into validation. Complements DEC-CI-001. |
| GxP relevance | Claim-control |
| Risk level | Medium |
| Source | `documentation.ts`; DEC-CI-001 |
| Evidence reference | `packages/platform-common/src/documentation.ts` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-AUD-001

| Field | Content |
| --- | --- |
| ID | URS-AUD-001 |
| Requirement | Validation-relevant Create authorization decisions shall be durably recorded so that records survive application/service restart. Each record shall make the relevant actor, timestamp, action, decision, and applicable authorization context (including deny/grant reason layers where produced) traceable for administrator review. This requirement does not claim 21 CFR Part 11 electronic records or electronic signatures. |
| Rationale | Create is a validation-relevant Control Plane action. Implementation must not define the requirement (DEC-AUDIT-001). |
| GxP relevance | Indirect. **Part 11: NOT CLAIMED.** |
| Risk level | High |
| Source | DEC-AUDIT-001; Phase 2C MODIFY |
| Evidence reference | `packages/backend/src/permission/policy.ts` (authoritative Create decision); `packages/platform-common/src/create-authorization-audit-store.ts` (durable JSONL). Requirement text unchanged. |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | MODIFY |
| Proposed (historical) | Entitlement Create authorization decisions (grant or deny, with reason) shall be recorded for administrator review. Durability was not specified. |

### URS-AUD-002

| Field | Content |
| --- | --- |
| ID | URS-AUD-002 |
| Requirement | Technical certification writes shall be restricted to authorized Owner/Admin roles and shall remain labeled as technical platform certification. |
| Rationale | Prevents unprivileged status changes and GxP implication. |
| GxP relevance | Claim-control |
| Risk level | Medium |
| Source | `docs/engineering/certification.md` |
| Evidence reference | `plugins/data-products-backend/src/router.ts`; `data-product.certification.manage` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-DATA-001

| Field | Content |
| --- | --- |
| ID | URS-DATA-001 |
| Requirement | A hosted Control Plane shall persist Backstage state (auth, catalog, scaffolder, search as configured) in PostgreSQL. Local development may use file-backed SQLite. |
| Rationale | Documented deployment split. Does not by itself satisfy URS-AUD-001. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `ARCHITECTURE.md` §12 |
| Evidence reference | `app-config.yaml`; `docker-compose.yml`; `app-config.production.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-DATA-002

| Field | Content |
| --- | --- |
| ID | URS-DATA-002 |
| Requirement | Secrets (OAuth client secrets, GitHub App private key, database passwords, backend secret) shall be supplied by environment or uncommitted files, not hard-coded in committed config. |
| Rationale | Security principle. Complements URS-GH-002. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `AGENTS.md` §10; `ARCHITECTURE.md` §14 |
| Evidence reference | `app-config.yaml`; `app-config.github.yaml` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CFG-001

| Field | Content |
| --- | --- |
| ID | URS-CFG-001 |
| Requirement | Auth environment, catalog locations, commercial provider, organization id, and legal distribution status shall be configuration-controlled per deployment. |
| Rationale | Environment-based configuration. |
| GxP relevance | Indirect |
| Risk level | Medium |
| Source | `ARCHITECTURE.md` §14 |
| Evidence reference | `app-config.yaml`; `app-config.production.yaml`; `app-config.docker.yaml`; `app-config.github.yaml` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CFG-002

| Field | Content |
| --- | --- |
| ID | URS-CFG-002 |
| Requirement | The Permission Framework shall be enabled for Platform Core deployments that are intended to enforce RBAC. |
| Rationale | Without it, route policy is not authoritative. |
| GxP relevance | Indirect |
| Risk level | High |
| Source | `ARCHITECTURE.md` §5 |
| Evidence reference | `app-config.yaml` `permission.enabled: true` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-MKT-001

| Field | Content |
| --- | --- |
| ID | URS-MKT-001 |
| Requirement | The Marketplace shall list approved platform assets for technical discovery and Create navigation. It shall not process payments. |
| Rationale | MVP marketplace. |
| GxP relevance | None |
| Risk level | Low |
| Source | `PRODUCT.md` §7 |
| Evidence reference | `plugins/marketplace/` |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-MKT-002

| Field | Content |
| --- | --- |
| ID | URS-MKT-002 |
| Requirement | If a Platform Component appears in Marketplace, it shall be presented as a building block, not as a business Data Product. |
| Rationale | Architecture rule. |
| GxP relevance | Claim-control |
| Risk level | Low |
| Source | `ARCHITECTURE.md` §8a |
| Evidence reference | `plugins/marketplace/src/data.ts` |
| Requirement state | BASELINED |
| Implementation | NOT_VERIFIED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-DOC-001

| Field | Content |
| --- | --- |
| ID | URS-DOC-001 |
| Requirement | An authenticated user with read access shall be able to open Developer Hub and TechDocs content hosted by the Control Plane. |
| Rationale | Discover / documentation. |
| GxP relevance | None |
| Risk level | Low |
| Source | `ARCHITECTURE.md` §4 |
| Evidence reference | `packages/app/src/modules/developer-hub/`; TechDocs backend |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-SRC-001

| Field | Content |
| --- | --- |
| ID | URS-SRC-001 |
| Requirement | Search shall query Catalog and TechDocs indexes configured on the Control Plane. |
| Rationale | Discover. |
| GxP relevance | None |
| Risk level | Low |
| Source | `ARCHITECTURE.md` §4, §5 |
| Evidence reference | `packages/backend/src/index.ts` |
| Requirement state | BASELINED |
| Implementation | PARTIALLY_IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

### URS-CERT-001

| Field | Content |
| --- | --- |
| ID | URS-CERT-001 |
| Requirement | Catalog annotation shall remain the canonical technical certification field. Any file overlay shall be documented as an overlay, not as GxP evidence. |
| Rationale | Source-of-truth rule. |
| GxP relevance | Claim-control |
| Risk level | Medium |
| Source | `docs/engineering/source-of-truth.md` |
| Evidence reference | `app-config.yaml`; `plugins/data-products-backend` overlay processor |
| Requirement state | BASELINED |
| Implementation | IMPLEMENTED |
| Verification | NOT_EXECUTED |
| Human decision | ACCEPT |
| Proposed (historical) | Same text as Phase 2 PROPOSED. |

---

## REJECTED — historical record (not active)

### URS-AUTH-005

| Field | Content |
| --- | --- |
| ID | URS-AUTH-005 |
| Proposed requirement (historical) | Local development may offer Guest sign-in when the auth environment is not production. |
| Requirement state | **REJECTED** |
| Classification | DEVELOPMENT_ONLY — not a validated production requirement |
| Human decision | REJECT |
| Production rule | Production Guest authentication is prohibited (URS-AUTH-002, DEC-GUEST-001). |
| Why retained | Proposed-and-rejected history must not be silently deleted. |
| Review record | `validation/reviews/URS-Human-Review.md` § URS-AUTH-005 |
| Evidence of software (not a requirement) | `app-config.yaml` Guest provider; `catalog/org.yaml`; `accessPolicy.ts` |
| Counts toward active baseline coverage | **No** |

---

## Intentionally omitted (unchanged)

| Topic | Why |
| --- | --- |
| 21 CFR Part 11 / e-signatures | DEC-P11-001 PART 11: NOT CLAIMED |
| IQ/OQ/PQ execution | Process, not a product URS |
| Entra ID / OIDC | Not current Core capability |
| OEE live GitHub proof | DEC-OEE-001 outside Core |
| AAS / UNS / Golden Path content | DEC-SCOPE-001 |

---

## Counts

| | Count |
| --- | --- |
| Active BASELINED URS | 38 |
| REJECTED URS | 1 (URS-AUTH-005) |
| OPEN_POLICY_DEFINITION | 0 (`OPEN-LEG-001` CLOSED) |
| IMPLEMENTED | 24 |
| PARTIALLY_IMPLEMENTED | 10 |
| NOT_IMPLEMENTED | 0 |
| NOT_VERIFIED | 4 |
| Verification PASSED | 0 |
