# System Specification — Platform Core

**Document ID:** VAL-SYS-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22  
**Parent URS:** `URS.md`

This artifact was generated as a PROPOSED validation baseline from repository evidence and updated for Baseline v1.0 human decisions. System requirements describe **observable Control Plane behavior**. They do not prescribe implementation.

Active SYS follow active URS (38). SYS-AUTH-005 is **REJECTED** with its parent URS and is not active coverage.

Requirement state BASELINED ≠ implemented or verified.

---

## SYS-AUTH-001

| Field | Content |
| --- | --- |
| ID | SYS-AUTH-001 |
| Parent URS | URS-AUTH-001 |
| Observable behavior | Unauthenticated requests to protected backend APIs and Scaffolder task creation are rejected. Health endpoints that are documented as public may remain reachable without a user session. |
| Requirement state | BASELINED |
| Evidence | `app-config.yaml` permission.enabled; router auth on entitlements/data-products (Phase 1 inventory). Exact 401/403 matrix: NEEDS_REVIEW |

## SYS-AUTH-002

| Field | Content |
| --- | --- |
| ID | SYS-AUTH-002 |
| Parent URS | URS-AUTH-002 |
| Observable behavior | When auth environment is production, Guest refresh / Guest sign-in is not offered as a successful identity. |
| Requirement state | BASELINED |
| Evidence | `packages/backend/src/auth/identity.test.ts`; `docs/pilot-exit-gate.md` (Guest refresh → 403 in that gate) |

## SYS-AUTH-003

| Field | Content |
| --- | --- |
| ID | SYS-AUTH-003 |
| Parent URS | URS-AUTH-003 |
| Observable behavior | In production, a GitHub account that is not a Catalog User cannot complete an approved platform session that grants a platform role. |
| Requirement state | BASELINED |
| Evidence | `accessPolicy.ts`; production config without `dangerouslyAllowSignInWithoutUserInCatalog` |

## SYS-AUTH-004

| Field | Content |
| --- | --- |
| ID | SYS-AUTH-004 |
| Parent URS | URS-AUTH-004 |
| Observable behavior | User login uses AUTH_GITHUB_* settings. Repository publish uses GITHUB_APP_* / App block. The two secret sets are not interchangeable in configuration. |
| Requirement state | BASELINED |
| Evidence | `app-config.yaml`; `app-config.github.yaml` |

## SYS-AUTH-005

| Field | Content |
| --- | --- |
| ID | SYS-AUTH-005 |
| Parent URS | URS-AUTH-005 (REJECTED) |
| Observable behavior | Historical only. Guest in non-production is DEVELOPMENT_ONLY and is not an active validated system requirement. Production Guest remain prohibited by SYS-AUTH-002. |
| Requirement state | REJECTED |
| Evidence | `accessPolicy.ts`; `catalog/org.yaml` |

## SYS-RBAC-001

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-001 |
| Parent URS | URS-RBAC-001 |
| Observable behavior | Effective privileges change when the signed-in user’s Catalog group membership is Viewer, Developer, Owner, or Admin as defined in org catalog. |
| Requirement state | BASELINED |
| Evidence | `roles.ts`; `catalog/org.yaml` |

## SYS-RBAC-002

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-002 |
| Parent URS | URS-RBAC-002 |
| Observable behavior | A user whose ownership refs include none of the four platform groups receives deny on privileged permission checks. |
| Requirement state | BASELINED |
| Evidence | `policy.ts` deny when `!role` |

## SYS-RBAC-003

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-003 |
| Parent URS | URS-RBAC-003 |
| Observable behavior | Direct API calls that omit or spoof only the UI still undergo permission policy evaluation. |
| Requirement state | BASELINED |
| Evidence | `permission-backend` + `PlatformPermissionPolicy`. End-to-end API abuse test: Evidence: NOT ESTABLISHED as executed system test |

## SYS-RBAC-004

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-004 |
| Parent URS | URS-RBAC-004 |
| Observable behavior | Viewer can read marketplace/data-product view permissions and cannot obtain `data-product.create` or scaffolder task create. |
| Requirement state | BASELINED |
| Evidence | `permissions.ts` VIEWER set |

## SYS-RBAC-005

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-005 |
| Parent URS | URS-RBAC-005 |
| Observable behavior | Developer permission set includes scaffolder task create and `data-product.create`. Subsequent entitlement/release/legal checks may still deny Create. |
| Requirement state | BASELINED |
| Evidence | `permissions.ts`; `authorizeCreate` |

## SYS-RBAC-006

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-006 |
| Parent URS | URS-RBAC-006 |
| Observable behavior | Owner can authorize `data-product.certification.manage` and `data-product.governance`. Viewer/Developer cannot. |
| Requirement state | BASELINED |
| Evidence | `permissions.ts` OWNER vs DEVELOPER sets |

## SYS-RBAC-007

| Field | Content |
| --- | --- |
| ID | SYS-RBAC-007 |
| Parent URS | URS-RBAC-007 |
| Observable behavior | Admin can authorize `platform.admin`, `template.admin`, `marketplace.admin`, `golden-path.release.manage`, `entitlement.admin`. |
| Requirement state | BASELINED |
| Evidence | `permissions.ts` ADMIN set; entitlements admin routes require `entitlement.admin` |

## SYS-ENT-001

| Field | Content |
| --- | --- |
| ID | SYS-ENT-001 |
| Parent URS | URS-ENT-001 |
| Observable behavior | Scaffolder template permissions for a commercially offered product are denied when the organization has no active entitlement for that productId. |
| Requirement state | BASELINED |
| Evidence | `PlatformPermissionPolicy` + `hasEntitlement` |

## SYS-ENT-002

| Field | Content |
| --- | --- |
| ID | SYS-ENT-002 |
| Parent URS | URS-ENT-002 |
| Observable behavior | `authorizeCreate` reports `reason: 'ENTITLEMENT'` separately from `reason: 'RBAC'`. |
| Requirement state | BASELINED |
| Evidence | `entitlement-service.ts` |

## SYS-ENT-003

| Field | Content |
| --- | --- |
| ID | SYS-ENT-003 |
| Parent URS | URS-ENT-003 |
| Observable behavior | Completing marketplace registration does not log the caller into the portal and does not provision a new organization tenant in Catalog. |
| Requirement state | BASELINED |
| Evidence | `ARCHITECTURE.md` §13. Runtime proof of no session cookie: **IMPLEMENTATION_NOT_VERIFIED** as a witnessed test |

## SYS-ENT-004

| Field | Content |
| --- | --- |
| ID | SYS-ENT-004 |
| Parent URS | URS-ENT-004 |
| Observable behavior | In production AWS mode, a failed AWS entitlement lookup results in deny / no silent grant of local INTERNAL entitlements. |
| Requirement state | BASELINED |
| Evidence | Claimed in roadmap/architecture. Code-level fail-closed: **IMPLEMENTATION_NOT_VERIFIED** pending human review of `awsMarketplace.ts` |

## SYS-LEG-001

| Field | Content |
| --- | --- |
| ID | SYS-LEG-001 |
| Parent URS | URS-LEG-001 |
| Observable behavior | Explicitly defined commercial/customer-handoff operations are denied when legal distribution status is not APPROVED. Internal development Create is not automatically blocked by the Legal Gate. RBAC and entitlement denies remain independent. Operation list: DEC-LEGAL-002 / CLOSED OPEN-LEG-001. Observed RC1 software: Legal Gate on `authorizeCreate` `handoff === 'customer'` (Customer Handoff). Other listed commercial operations: NOT_APPLICABLE_CURRENT_RELEASE. |
| Requirement state | BASELINED |
| Evidence | `entitlement-service.ts`; `entitlement-service.test.ts` |

## SYS-LEG-002

| Field | Content |
| --- | --- |
| ID | SYS-LEG-002 |
| Parent URS | URS-LEG-002 |
| Observable behavior | User-visible product copy for official paths states that CERTIFIED is technical and not GxP. Validation status remains NOT VALIDATED. |
| Requirement state | BASELINED |
| Evidence | `docs/status-model.md`; marketplace/OEE strings |

## SYS-CAT-001

| Field | Content |
| --- | --- |
| ID | SYS-CAT-001 |
| Parent URS | URS-CAT-001 |
| Observable behavior | Configured file locations are ingested as Catalog entities (Component, Template, User, Group, etc. per rules). |
| Requirement state | BASELINED |
| Evidence | `app-config.yaml` catalog.locations |

## SYS-CAT-002

| Field | Content |
| --- | --- |
| ID | SYS-CAT-002 |
| Parent URS | URS-CAT-002 |
| Observable behavior | Production-pilot catalog does not contain sample entities from `catalog/samples/`. |
| Requirement state | BASELINED |
| Evidence | `docs/pilot-exit-gate.md`. Overlay file check: NEEDS_REVIEW `app-config.docker.yaml` / `app-config.production.yaml` |

## SYS-CAT-003

| Field | Content |
| --- | --- |
| ID | SYS-CAT-003 |
| Parent URS | URS-CAT-003 |
| Observable behavior | Components of type data-product appear on `/data-products` and a detail route `/data-products/:name`. |
| Requirement state | BASELINED |
| Evidence | `plugins/data-products` |

## SYS-SCF-001

| Field | Content |
| --- | --- |
| ID | SYS-SCF-001 |
| Parent URS | URS-SCF-001 |
| Observable behavior | An authenticated Developer (or higher) can start a Scaffolder task that publishes a repository when GitHub App is configured and other gates pass. |
| Requirement state | BASELINED |
| Evidence | Scaffolder + GitHub module. Interactive production run: Evidence: NOT ESTABLISHED (`INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`) |

## SYS-SCF-002

| Field | Content |
| --- | --- |
| ID | SYS-SCF-002 |
| Parent URS | URS-SCF-002 |
| Observable behavior | Failed Create authorization returns a structured reason among RBAC, RELEASE, ENTITLEMENT, LEGAL. |
| Requirement state | BASELINED |
| Evidence | `CreateAuthorization` type; `POST /api/entitlements/authorize-create` |

## SYS-SCF-003

| Field | Content |
| --- | --- |
| ID | SYS-SCF-003 |
| Parent URS | URS-SCF-003 |
| Observable behavior | Official Golden Path template permissions are denied when the current release is not generally available. |
| Requirement state | BASELINED |
| Evidence | `isGenerallyAvailableRelease` in permission policy; `canCreateOfficialGoldenPath` |

## SYS-GH-001

| Field | Content |
| --- | --- |
| ID | SYS-GH-001 |
| Parent URS | URS-GH-001 |
| Observable behavior | Publish configuration is the GitHub App block, not the user OAuth client secret. |
| Requirement state | BASELINED |
| Evidence | `app-config.github.yaml` |

## SYS-GH-002

| Field | Content |
| --- | --- |
| ID | SYS-GH-002 |
| Parent URS | URS-GH-002 |
| Observable behavior | OAuth client IDs may appear in public/frontend configuration. Client secrets, access tokens, private keys, and equivalent credentials do not appear in source, generated artifacts, logs, UI, or public configuration. |
| Requirement state | BASELINED |
| Evidence | Env substitution. Artifact/log/UI inspection: Evidence: NOT ESTABLISHED |

## SYS-GH-003

| Field | Content |
| --- | --- |
| ID | SYS-GH-003 |
| Parent URS | URS-GH-003 |
| Observable behavior | `GET /api/data-products/ci-status` returns technical Actions status. `UNKNOWN` is never treated as PASS. `UNKNOWN` is represented as **DEGRADED / UNVERIFIED** (DEC-CI-001). |
| Requirement state | BASELINED |
| Evidence | `githubActions.ts`; Pilot Exit UNKNOWN finding. DEGRADED/UNVERIFIED label: NOT ESTABLISHED |

## SYS-CI-001

| Field | Content |
| --- | --- |
| ID | SYS-CI-001 |
| Parent URS | URS-CI-001 |
| Observable behavior | Quality Gate UI/docs state that the result is not GxP validation. |
| Requirement state | BASELINED |
| Evidence | `documentation.ts`; `CiQualityGateCard` |

## SYS-AUD-001

| Field | Content |
| --- | --- |
| ID | SYS-AUD-001 |
| Parent URS | URS-AUD-001 |
| Observable behavior | After a validation-relevant Create authorization decision, an administrator can retrieve a durable record (actor, timestamp, action, decision, authorization context) that is still present after application/service restart. Part 11 is not claimed. |
| Requirement state | BASELINED |
| Evidence | `PlatformPermissionPolicy.handle()` records GRANT/DENY for `scaffolder.task.create`, `scaffolder.action.execute`, and `data-product.create` to `FileCreateAuthorizationAuditStore`. Admin GET `/admin/entitlements` returns `audit` plus `auditIssues`. Formal restart OQ remains NOT_EXECUTED. |

## SYS-AUD-002

| Field | Content |
| --- | --- |
| ID | SYS-AUD-002 |
| Parent URS | URS-AUD-002 |
| Observable behavior | `POST /api/data-products/certification` is denied without `data-product.certification.manage`. Stored status values are DEVELOPMENT, TESTED, or CERTIFIED as technical states. |
| Requirement state | BASELINED |
| Evidence | `plugins/data-products-backend/src/router.ts` (Phase 1) |

## SYS-DATA-001

| Field | Content |
| --- | --- |
| ID | SYS-DATA-001 |
| Parent URS | URS-DATA-001 |
| Observable behavior | Hosted compose/production uses PostgreSQL connection settings. Local default uses a SQLite directory. |
| Requirement state | BASELINED |
| Evidence | `docker-compose.yml`; `app-config.yaml` database block |

## SYS-DATA-002

| Field | Content |
| --- | --- |
| ID | SYS-DATA-002 |
| Parent URS | URS-DATA-002 |
| Observable behavior | Committed YAML references secrets via environment placeholders. |
| Requirement state | BASELINED |
| Evidence | `${AUTH_GITHUB_CLIENT_SECRET}`, `${GITHUB_PRIVATE_KEY}`, `${POSTGRES_PASSWORD}`, `${BACKEND_SECRET}` |

## SYS-CFG-001

| Field | Content |
| --- | --- |
| ID | SYS-CFG-001 |
| Parent URS | URS-CFG-001 |
| Observable behavior | Changing commercial.legalDistributionStatus, entitlementProvider, auth.environment, and catalog locations changes subsequent Core behavior after reload. |
| Requirement state | BASELINED |
| Evidence | Config files. Reload/IQ procedure: Evidence: NOT ESTABLISHED |

## SYS-CFG-002

| Field | Content |
| --- | --- |
| ID | SYS-CFG-002 |
| Parent URS | URS-CFG-002 |
| Observable behavior | With permission.enabled true, policy decisions are consulted. |
| Requirement state | BASELINED |
| Evidence | `app-config.yaml` |

## SYS-MKT-001

| Field | Content |
| --- | --- |
| ID | SYS-MKT-001 |
| Parent URS | URS-MKT-001 |
| Observable behavior | `/marketplace` lists curated assets and does not collect payment. |
| Requirement state | BASELINED |
| Evidence | `plugins/marketplace`; `PRODUCT.md` |

## SYS-MKT-002

| Field | Content |
| --- | --- |
| ID | SYS-MKT-002 |
| Parent URS | URS-MKT-002 |
| Observable behavior | Platform Component entries, if shown, are labeled as building blocks. |
| Requirement state | BASELINED |
| Evidence | Marketplace data — human label check required |

## SYS-DOC-001

| Field | Content |
| --- | --- |
| ID | SYS-DOC-001 |
| Parent URS | URS-DOC-001 |
| Observable behavior | `/developer` and `/docs` serve documentation to an authenticated reader. |
| Requirement state | BASELINED |
| Evidence | developer-hub module; TechDocs plugin |

## SYS-SRC-001

| Field | Content |
| --- | --- |
| ID | SYS-SRC-001 |
| Parent URS | URS-SRC-001 |
| Observable behavior | `/search` returns hits from catalog and TechDocs search modules when indexes are built. |
| Requirement state | BASELINED |
| Evidence | search backend modules. Pilot empty TechDocs index: evidence gap |

## SYS-CERT-001

| Field | Content |
| --- | --- |
| ID | SYS-CERT-001 |
| Parent URS | URS-CERT-001 |
| Observable behavior | Entity certification displayed in Core comes from Catalog annotation and optional documented overlay file. Overlay is not labeled GxP evidence. |
| Requirement state | BASELINED |
| Evidence | `certification-overrides.json` path in app-config; overlay processor |

---

## Count

38 active BASELINED system requirements. SYS-AUTH-005 is REJECTED (historical). OPEN-LEG-001 is CLOSED under SYS-LEG-001 (DEC-LEGAL-002).

## Not specified (excluded features)

No SYS IDs for AAS CRUD, UNS, Wave 1 runtime, generated product APIs, Part 11, or Entra ID.
