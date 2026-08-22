# URS Human Review Register — Platform Core

**Document ID:** VAL-REV-URS-001  
**Record type:** Phase 2B historical review (preserved)  
**Date:** 2026-08-22  
**Source URS at time of review:** Phase 2 PROPOSED `URS.md`

**Phase 2C freeze:** Human URS decisions were applied in `validation/baseline/URS.md` and `validation/baseline/BASELINE.yaml`. This register is **not** rewritten so recommendation history is not destroyed. Executive-table "Human Decision PENDING" cells below are the Phase 2B snapshot. Authoritative dispositions are in Baseline v1.0.

This artifact was generated as a PROPOSED validation baseline from repository evidence. It is not a validated release.

Review question for each URS: **Should the validated Platform Core be required to do this?**  
Not: “Does the current software already do this?”

Paths below are under `data-product-platform/` unless noted.

---

## Executive review table

| URS | Short Description | AI Recommendation | Implementation | Risk | Human Decision |
| --- | --- | --- | --- | --- | --- |
| URS-AUTH-001 | Authenticate before protected functions | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-AUTH-002 | Production shall not accept Guest | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-AUTH-003 | Production GitHub sign-in requires Catalog User | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-AUTH-004 | User OAuth secrets ≠ GitHub App secrets | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-AUTH-005 | Local Guest sign-in allowed in non-production | REJECT | IMPLEMENTED | HIGH | PENDING |
| URS-RBAC-001 | Four Catalog-derived platform roles | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-RBAC-002 | No platform role → deny privileged actions | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-RBAC-003 | Backend authorization; UI hide insufficient | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-RBAC-004 | Viewer read-only; cannot create | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-RBAC-005 | Developer Create when other gates pass | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-RBAC-006 | Owner technical certification management | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-RBAC-007 | Admin platform / template / entitlement admin | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-ENT-001 | Commercial Create requires active entitlement | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-ENT-002 | Entitlement independent of RBAC | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-ENT-003 | Marketplace register ≠ tenant or portal session | ACCEPT | NOT_VERIFIED | MEDIUM | PENDING |
| URS-ENT-004 | AWS production entitlement lookup fail-closed | ACCEPT | NOT_VERIFIED | HIGH | PENDING |
| URS-LEG-001 | Legal gate on customer handoff only | NEEDS DISCUSSION | IMPLEMENTED | HIGH | PENDING |
| URS-LEG-002 | CERTIFIED/RELEASED must not be shown as GxP | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-CAT-001 | Catalog of software / Data Product entities | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-CAT-002 | Production/Docker must not load sample catalog | ACCEPT | NOT_VERIFIED | MEDIUM | PENDING |
| URS-CAT-003 | Data Products discoverable in Data Products UI | ACCEPT | IMPLEMENTED | LOW | PENDING |
| URS-SCF-001 | Authorized user can create GitHub repo from template | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-SCF-002 | Create denied per RBAC/release/entitlement/legal | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-SCF-003 | Official Create only for RELEASED versions | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-GH-001 | Publish via GitHub App, not user OAuth secret | ACCEPT | IMPLEMENTED | HIGH | PENDING |
| URS-GH-002 | Frontend must not receive GitHub secrets | MODIFY | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-GH-003 | Server-side CI status as technical Quality Gate | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-CI-001 | Actions results are technical status only | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-AUD-001 | Record entitlement Create grant/deny | MODIFY | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-AUD-002 | Certification writes restricted and technical-only | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-DATA-001 | Hosted Core persists in PostgreSQL | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-DATA-002 | Secrets not hard-coded in committed config | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-CFG-001 | Auth/catalog/commercial/legal config per deploy | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |
| URS-CFG-002 | Permission Framework enabled for RBAC deployments | ACCEPT | PARTIALLY_IMPLEMENTED | HIGH | PENDING |
| URS-MKT-001 | Marketplace discovery; no payments | ACCEPT | IMPLEMENTED | LOW | PENDING |
| URS-MKT-002 | Platform Components labeled building blocks | ACCEPT | NOT_VERIFIED | LOW | PENDING |
| URS-DOC-001 | Authenticated access to Developer Hub / TechDocs | ACCEPT | PARTIALLY_IMPLEMENTED | LOW | PENDING |
| URS-SRC-001 | Search Catalog and TechDocs indexes | ACCEPT | PARTIALLY_IMPLEMENTED | LOW | PENDING |
| URS-CERT-001 | Certification annotation canonical; overlay not GxP | ACCEPT | IMPLEMENTED | MEDIUM | PENDING |

---

## Flagged decisions (read first)

These URS and decisions define whether the Core can be an intended validated system. They are **not** approved.

| Theme | IDs | AI stance |
| --- | --- | --- |
| Authentication | URS-AUTH-001–004 | ACCEPT |
| Guest access | URS-AUTH-002, URS-AUTH-005, **DEC-GUEST-001** | Production: no Guest. AUTH-005: REJECT from validated set |
| RBAC / Admin privileges | URS-RBAC-001–007 | ACCEPT; ADMIN is high-risk (no SoD specified) |
| Entitlements | URS-ENT-001–004 | ACCEPT; ENT-004 fail-closed NOT_VERIFIED |
| Legal gates | URS-LEG-001, **DEC-LEGAL-001** | NEEDS DISCUSSION — current URS matches code, may be too narrow |
| Audit trail / durable persistence | URS-AUD-001, URS-DATA-001, **DEC-AUDIT-001** | MODIFY AUD-001 to require durable records; not Part 11 |
| GitHub repository creation | URS-SCF-001, URS-GH-001 | ACCEPT; interactive proof missing |
| GitHub App permissions / CI status | URS-GH-003, URS-CI-001, **DEC-CI-001** | ACCEPT; UNKNOWN is degraded, not qualified normal |
| Secrets | URS-GH-002, URS-DATA-002 | MODIFY GH-002 to allow public clientId |
| Configuration integrity | URS-CFG-001–002, URS-CAT-002 | ACCEPT; overlays not fully verified |
| Fail-closed behavior | URS-ENT-004, URS-SCF-002 | ACCEPT as intended |
| Traceability / claim-control | URS-LEG-002, URS-CERT-001, URS-CI-001 | ACCEPT |
| Part 11 | **DEC-P11-001** only | NO / FUTURE — no URS added |
| Backstage SOUP | **DEC-SOUP-001** | Process controls, not a functional URS |
| OEE live proof | **DEC-OEE-001** | Outside Core |
| Reviewer roles | **DEC-REVIEW-001** | PENDING |

---

## URS-AUTH-001

### Proposed Requirement

A user shall authenticate before using protected Control Plane functions (Catalog write, Scaffolder, entitlements, certification management).

### Why this requirement exists

A validated Control Plane must know *who* is performing privileged actions. Unauthenticated Create, catalog write, or certification change would make later review meaningless.

### Current implementation

Auth and permission plugins are registered; `permission.enabled` is true in base config. Health routes remain public by design.

### Validation assessment

ACCEPT

### Recommendation rationale

This is a core intended security property of any production Control Plane, independent of how Backstage implements sessions.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/packages/backend/src/index.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUTH-002

### Proposed Requirement

Production configuration shall not accept the Guest identity.

### Why this requirement exists

Guest is an anonymous development identity. A validated production system must not treat an unauthenticated fallback as a real user.

### Current implementation

Production config omits the Guest provider. Automated tests assert that. `accessPolicy.ts` denies Guest when environment is production.

### Validation assessment

ACCEPT

### Recommendation rationale

This is the **production Guest policy**. It should remain in the validated set. See DEC-GUEST-001.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/backend/src/auth/identity.test.ts`  
`data-product-platform/packages/platform-common/src/accessPolicy.ts`  
`data-product-platform/app-config.production.yaml`  
`data-product-platform/catalog/org.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUTH-003

### Proposed Requirement

In production, GitHub sign-in shall succeed only for an approved Catalog User. Unknown GitHub users shall not receive implicit Viewer access.

### Why this requirement exists

GitHub membership of the public internet is not an approved platform identity. Validated access must be an explicit Catalog User with groups.

### Current implementation

Development allows `dangerouslyAllowSignInWithoutUserInCatalog`. Production tests require that flag to be absent. Policy denies users without a platform role.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended production identity model. Development convenience must not define the validated requirement.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/accessPolicy.ts`  
`data-product-platform/packages/backend/src/auth/identity.test.ts`  
`data-product-platform/app-config.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUTH-004

### Proposed Requirement

GitHub user login credentials shall be separate from GitHub App repository-publishing credentials.

### Why this requirement exists

Login should not be the same secret that can create organization repositories. Separation limits blast radius and matches least privilege.

### Current implementation

`AUTH_GITHUB_*` in base/production config; `GITHUB_APP_*` in `app-config.github.yaml`. Comments and tests treat them as distinct.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended trust-boundary design for GitHub integration.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/app-config.github.yaml`  
`data-product-platform/packages/backend/src/auth/identity.test.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUTH-005

### Proposed Requirement

Local development may offer Guest sign-in when the auth environment is not production.

### Why this requirement exists

The *proposed* text documents a developer convenience so local work can proceed without GitHub OAuth.

### Current implementation

Guest is configured in development, including membership of `data-product-developers`.

### Validation assessment

REJECT

### Recommendation rationale

This should **not** be a validated Platform Core requirement. Development convenience is outside the validated configuration. The production requirement is already URS-AUTH-002. Keeping AUTH-005 in the approved set would imply Guest is an intended validated capability.

Guest access determination:

- Development-only: yes (current engineering practice)
- Production capability: **no**
- Validation scope: **out of scope**

See DEC-GUEST-001.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

(If rejected from the validated set, residual risk is Guest leaking into a hosted environment — controlled by URS-AUTH-002, not by keeping AUTH-005.)

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/packages/platform-common/src/accessPolicy.ts`  
`data-product-platform/catalog/org.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-001

### Proposed Requirement

Authorization shall use approved platform roles derived from Catalog group membership: Viewer, Developer, Data Product Owner, Platform Admin.

### Why this requirement exists

The product needs a small, named access model that stays independent of the identity provider.

### Current implementation

`roles.ts` maps the four groups. `catalog/org.yaml` defines those groups and sample users.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended RBAC model for the Control Plane. Entra/OIDC later should not invent new Core roles.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/roles.ts`  
`data-product-platform/catalog/org.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-002

### Proposed Requirement

A signed-in user with no platform role shall be denied privileged Control Plane actions.

### Why this requirement exists

Authentication without authorization must not grant Viewer-or-higher by default.

### Current implementation

`decidePermission` denies when role is undefined. Policy requires `hasApprovedPlatformAccess`.

### Validation assessment

ACCEPT

### Recommendation rationale

Essential fail-closed identity mapping.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/policy.ts`  
`data-product-platform/packages/backend/src/permission/policy.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-003

### Proposed Requirement

Authorization shall be enforced on the backend. Hiding a UI control shall not be sufficient to grant or deny an action.

### Why this requirement exists

A validated system cannot rely on the browser to enforce privileges. Direct API calls are the real attack and error path.

### Current implementation

`PlatformPermissionPolicy` is registered. Selected routers call `authorize`. Frontend uses role helpers; no `usePermission` observed. Not every custom route has been proven to authorize.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended control is backend enforcement. Incomplete route coverage is an **implementation gap**, not a reason to drop the URS.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/backend/src/permission/policy.ts`  
`data-product-platform/app-config.yaml`  
`data-product-platform/packages/platform-common/src/policy.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-004

### Proposed Requirement

A Viewer shall be able to read Catalog, Marketplace, and Data Product information and shall not create Data Products.

### Why this requirement exists

Browse-only stakeholders need discover without Create.

### Current implementation

`VIEWER_PERMISSION_NAMES` excludes `data-product.create` and scaffolder task create.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended least-privilege browse role.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/permissions.ts`  
`data-product-platform/catalog/org.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-005

### Proposed Requirement

A Developer shall be able to execute approved Scaffolder templates when release, entitlement, and applicable legal gates also pass.

### Why this requirement exists

Create is the main intended job of a Data Product Developer. Other gates remain independent.

### Current implementation

Developer permission set includes scaffolder create. `authorizeCreate` still applies entitlement/release/legal. Interactive production Create is not executed (evidence gap, not a missing role).

### Validation assessment

ACCEPT

### Recommendation rationale

Intended Create persona. Evidence of a live OAuth journey is separate (TEST-UAT-001).

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/permissions.ts`  
`data-product-platform/packages/platform-common/src/entitlement-service.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-006

### Proposed Requirement

A Data Product Owner shall be able to perform technical certification management in addition to Developer capabilities.

### Why this requirement exists

Technical CERTIFIED/TESTED/DEVELOPMENT must be changeable only by a governance role, and must stay non-GxP.

### Current implementation

Owner set includes `data-product.certification.manage`.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended owner/governance function. Does not imply GxP certification authority.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/permissions.ts`  
`data-product-platform/catalog/org.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-RBAC-007

### Proposed Requirement

A Platform Admin shall be able to administer platform, templates, marketplace, Golden Path release transitions, and entitlements.

### Why this requirement exists

Someone must administer the Control Plane. This is a high-privilege role by intent.

### Current implementation

`ADMIN_PERMISSION_NAMES` includes platform, template, marketplace, release, and entitlement admin. No segregation-of-duties or dual control is specified.

### Validation assessment

ACCEPT

### Recommendation rationale

The role is intended. Absence of SoD is a residual process risk (not a reason to reject the URS). Humans may later add SoD as a separate requirement.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/permissions.ts`  
`data-product-platform/plugins/entitlements-backend/src/router.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-ENT-001

### Proposed Requirement

Creating a commercially offered Golden Path shall require an active entitlement for the organization, in addition to RBAC.

### Why this requirement exists

Commercial offer is not the same as “has Developer role.” Validated Create must not ignore licensing/entitlement.

### Current implementation

Permission policy AND-gate plus `authorizeCreate` entitlement check for commercially offered products.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended two-layer model. Keep even if a future local-only lab disables commercial products.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/backend/src/permission/policy.ts`  
`data-product-platform/packages/platform-common/src/entitlement-service.ts`  
`data-product-platform/config/commercial-products.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-ENT-002

### Proposed Requirement

Entitlement decisions shall be independent of platform role. Missing entitlement shall not be explained as an RBAC failure except as an additional deny on commercial Create.

### Why this requirement exists

Operators need to distinguish “wrong role” from “organization not entitled.” Mixing them hides commercial and access failures.

### Current implementation

`CreateAuthorization.reason` uses separate `RBAC` and `ENTITLEMENT` values.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended diagnosable fail-closed behavior.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/entitlement-service.ts`  
`data-product-platform/packages/backend/src/permission/policy.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-ENT-003

### Proposed Requirement

AWS Marketplace registration shall not create a tenant and shall not grant a Control Plane portal session. Human Catalog identity shall remain separate from the AWS customer identity.

### Why this requirement exists

Procurement identity must not silently become a validated portal user or a multi-tenant org. SaaS tenancy is out of MVP.

### Current implementation

Registration endpoint exists and is documented as not creating tenants. Witnessed proof that it cannot mint a session cookie is not established.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended boundary is correct even though implementation is not fully verified.

### Implementation status

NOT_VERIFIED

### Risk if requirement is absent

MEDIUM

### Evidence

`ARCHITECTURE.md`  
`data-product-platform/plugins/entitlements-backend/src/registration.ts`  
`data-product-platform/plugins/entitlements-backend/src/router.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-ENT-004

### Proposed Requirement

When the entitlement provider is AWS in a production commercial environment, entitlement lookup shall fail closed (no silent INTERNAL fallback).

### Why this requirement exists

If AWS is unreachable or misconfigured, the system must not silently treat everyone as internally entitled.

### Current implementation

Roadmap/architecture claim fail-closed. Line-level verification of `awsMarketplace.ts` / runtime was marked IMPLEMENTATION_NOT_VERIFIED in the TDS.

### Validation assessment

ACCEPT

### Recommendation rationale

Fail-closed is the *intended* production behavior. Incomplete verification does not cancel the requirement.

### Implementation status

NOT_VERIFIED

### Risk if requirement is absent

HIGH

### Evidence

`ARCHITECTURE.md`  
`ROADMAP.md`  
`data-product-platform/plugins/entitlements-backend/src/awsMarketplace.ts`  
`data-product-platform/plugins/entitlements-backend/src/runtime.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-LEG-001

### Proposed Requirement

Customer artifact handoff shall be denied unless legal distribution status is APPROVED. Internal generation may remain available when status is BLOCKED.

### Why this requirement exists

Counsel has not approved commercial distribution. The product still needs internal generation for engineering and pilot.

### Current implementation

`authorizeCreate` applies LEGAL only when `handoff === 'customer'`. Permission policy does not repeat the legal check. Internal Scaffolder publish can still create a GitHub repository.

### Validation assessment

NEEDS DISCUSSION

### Recommendation rationale

The text matches **current software**, not necessarily the **intended validated control**. If “internal” Create yields a customer-deliverable repo, BLOCKED can be bypassed in practice. Humans must choose: keep a narrow software gate plus process control, or later modify the URS to block publish. See DEC-LEGAL-001. Do not auto-accept because the code works this way.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/entitlement-service.ts`  
`data-product-platform/packages/platform-common/src/entitlement-service.test.ts`  
`data-product-platform/app-config.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-LEG-002

### Proposed Requirement

The Control Plane shall not present technical CERTIFIED or RELEASED as GxP validated, regulatory approved, or commercially distributable when those dimensions are not met.

### Why this requirement exists

Status collapse is the main claim risk for a pharma-facing platform. CERTIFIED must stay technical.

### Current implementation

Status model and many Marketplace/OEE strings include disclaimers. Completeness of every UI surface is not verified.

### Validation assessment

ACCEPT

### Recommendation rationale

Claim-control is an intended validated property of the Core, regardless of remaining copy gaps.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/docs/status-model.md`  
`PRODUCT.md`  
`data-product-platform/plugins/marketplace/src/data.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CAT-001

### Proposed Requirement

The Control Plane shall maintain a catalog of software and Data Product entities (name, owner, type, documentation links, relations).

### Why this requirement exists

Discover and ownership inventory are the Control Plane’s primary information model.

### Current implementation

Catalog backend with file locations for entities, org, templates, and platform components.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended Discover capability. Backstage is the mechanism (SOUP), not the requirement.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/packages/backend/src/index.ts`  
`data-product-platform/catalog/`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CAT-002

### Proposed Requirement

Production and Docker Control Plane configurations shall not load local demo/sample catalog locations.

### Why this requirement exists

A validated or hosted catalog must not present fixture / example entities as real assets.

### Current implementation

Local `app-config.yaml` loads `catalog/samples/`. Pilot Exit states production does not. Docker/production YAML exclusion was not re-quoted in TDS (NOT_VERIFIED).

### Validation assessment

ACCEPT

### Recommendation rationale

Intended configuration integrity for hosted Core. Verification gap does not invalidate the requirement.

### Implementation status

NOT_VERIFIED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/docs/pilot-exit-gate.md`  
`data-product-platform/app-config.docker.yaml`  
`data-product-platform/app-config.production.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CAT-003

### Proposed Requirement

Data Products registered in the Catalog shall be discoverable under the Data Products experience.

### Why this requirement exists

The official journey ends at Data Products, Contract, TechDocs, and Quality Gate.

### Current implementation

`/data-products` and detail routes in the data-products plugin.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended Discover UX for cataloged Data Products (interface to instances, not instance validation).

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

LOW

### Evidence

`data-product-platform/plugins/data-products/src/plugin.tsx`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-SCF-001

### Proposed Requirement

An authorized user shall be able to create a GitHub repository from an approved Scaffolder template.

### Why this requirement exists

Create is the product’s central promised action: Marketplace → repository.

### Current implementation

Scaffolder + GitHub module + `publish:github` on templates. Interactive OAuth Create is `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`. A GitHub App API fallback published an MQTT pilot repo (not a signed UAT).

### Validation assessment

ACCEPT

### Recommendation rationale

This is an intended Core capability even though live UAT evidence is missing. Do not drop the URS because the proof was not run.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/backend/src/index.ts`  
`data-product-platform/app-config.github.yaml`  
`data-product-platform/docs/pilot-exit-gate.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-SCF-002

### Proposed Requirement

Create shall be denied when RBAC, release eligibility, required entitlement, or applicable legal handoff check fails. The deny reason shall distinguish those layers.

### Why this requirement exists

Fail-closed Create with a diagnosable reason is required so operators do not “retry until it works” across the wrong layer.

### Current implementation

`authorizeCreate` returns `RBAC` | `ENTITLEMENT` | `RELEASE` | `LEGAL`.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended fail-closed Create. “Applicable legal” remains tied to DEC-LEGAL-001.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/entitlement-service.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-SCF-003

### Proposed Requirement

Official Golden Path Create shall be offered only for a generally available (RELEASED) version per the release catalog.

### Why this requirement exists

Users must not Create retired or unreleased official paths as if they were the current product line.

### Current implementation

Release catalog JSON plus `isGenerallyAvailableRelease` / `canCreateOfficialGoldenPath` in policy.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended version governance for official paths (interface), not GxP.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/releases.ts`  
`data-product-platform/packages/platform-common/src/golden-path-releases.json`  
`data-product-platform/packages/backend/src/permission/policy.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-GH-001

### Proposed Requirement

Repository publishing shall use the GitHub App integration loaded by the backend, not end-user OAuth as the publishing secret.

### Why this requirement exists

Org repository creation should use an installed App with reviewed permissions, not a user’s OAuth token.

### Current implementation

`app-config.github.yaml` App block; scaffolder GitHub module.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended GitHub publishing model.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.github.yaml`  
`data-product-platform/packages/backend/src/index.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-GH-002

### Proposed Requirement

The frontend shall not receive GitHub App or OAuth client secrets.

### Why this requirement exists

The browser is an untrusted tier. App private keys and client secrets must stay on the server.

### Current implementation

Secrets use env placeholders. OAuth `clientId` is marked `@visibility frontend` (normal for OAuth apps). Bundle scan is NOT ESTABLISHED.

### Validation assessment

MODIFY

### Recommendation rationale

The intended requirement is correct, but the wording should explicitly allow a **public OAuth client ID** in the frontend and forbid **client secret, App private key, and webhook secret**. Do not reject the URS; clarify it.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/app-config.github.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-GH-003

### Proposed Requirement

The Control Plane shall resolve CI workflow status for a cataloged Data Product from GitHub using server-side credentials and display it as a technical Quality Gate, not as GxP evidence.

### Why this requirement exists

The official journey includes a visible technical pipeline result. It must never be sold as validation evidence.

### Current implementation

Server-side GitHub Actions client and Quality Gate card. Live result is UNKNOWN without Actions Read-only.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended interface capability. UNKNOWN is a degraded state (DEC-CI-001), not a reason to drop the URS. App permission is a control, not a new URS.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/plugins/data-products-backend/src/githubActions.ts`  
`data-product-platform/plugins/data-products/src/components/CiQualityGateCard.tsx`  
`data-product-platform/docs/pilot-exit-gate.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CI-001

### Proposed Requirement

Platform Core shall treat GitHub Actions results as technical pipeline status only.

### Why this requirement exists

CI pass is not IQ/OQ/PQ and not GxP. The Core must keep that distinction in user-facing language.

### Current implementation

Developer Hub / documentation copy states the Quality Gate is not GxP.

### Validation assessment

ACCEPT

### Recommendation rationale

Claim-control. Complements URS-GH-003 and URS-LEG-002.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/documentation.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUD-001

### Proposed Requirement

Entitlement Create authorization decisions (grant or deny, with reason) shall be recorded for administrator review.

### Why this requirement exists

Create is a validation-relevant Control Plane action: it changes what repositories and catalog entities exist. Administrators need a reviewable history of who was allowed or denied, and why.

The proposed URS **omits durability** because the current store is in-memory and Part 11 was not inferred. That lets implementation define the requirement.

### Current implementation

`PlatformEntitlementService` appends events to a process-local array and exposes `auditTrail()`. Admin API can return the list. Events are lost on restart. Not written to PostgreSQL. Not Part 11.

### Validation assessment

MODIFY

### Recommendation rationale

The validated Core **should** require a **durable** record of these entitlement Create decisions (actor, time, organization, product/template, grant/deny, reason) that survives restart and can be reviewed by an administrator.

Do **not** weaken the URS to match in-memory storage.  
Do **not** add 21 CFR Part 11, e-signatures, WORM, or ALCOA+ (DEC-P11-001 = NO / FUTURE).

Suggested direction for a later baseline edit (not applied now): keep the recording obligation; add durability / survival of restart; keep scope to validation-relevant Create authorization (humans may later add certification and admin entitlement actions).

Implementation gap: no durable store, no retention, no integrity protection.

See DEC-AUDIT-001.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/packages/platform-common/src/entitlement-service.ts`  
`data-product-platform/packages/platform-common/src/entitlements.ts`  
`data-product-platform/plugins/entitlements-backend/src/router.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-AUD-002

### Proposed Requirement

Technical certification writes shall be restricted to authorized Owner/Admin roles and shall remain labeled as technical platform certification.

### Why this requirement exists

Status writes change what the portal claims about an asset. Unprivileged or unlabeled writes would collapse CERTIFIED into GxP.

### Current implementation

POST `/api/data-products/certification` requires `data-product.certification.manage`. Statuses are DEVELOPMENT / TESTED / CERTIFIED.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended governance of technical certification. Not GxP authority.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/packages/platform-common/src/permissions.ts`  
`data-product-platform/plugins/data-products-backend/src/router.ts`  
`data-product-platform/docs/engineering/certification.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-DATA-001

### Proposed Requirement

A hosted Control Plane shall persist Backstage state (auth, catalog, scaffolder, search as configured) in PostgreSQL. Local development may use file-backed SQLite.

### Why this requirement exists

Hosted Core state (sessions, catalog, scaffolder tasks) must survive container restart. SQLite is a local-dev convenience.

### Current implementation

Local `better-sqlite3`; Compose/production `pg` + Postgres 16. Entitlement audit is **not** in this database.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended hosted persistence for Backstage state. Does not satisfy DEC-AUDIT-001 by itself.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/docker-compose.yml`  
`data-product-platform/app-config.production.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-DATA-002

### Proposed Requirement

Secrets (OAuth client secrets, GitHub App private key, database passwords, backend secret) shall be supplied by environment or uncommitted files, not hard-coded in committed config.

### Why this requirement exists

Committed secrets make every clone a credential leak and break configuration integrity.

### Current implementation

YAML uses `${...}` placeholders. Whole-repository secret scan is not established as a validation record.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended secret-handling rule. Scan gap is verification, not a reason to reject.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/app-config.github.yaml`  
`data-product-platform/app-config.production.yaml`  
`AGENTS.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CFG-001

### Proposed Requirement

Auth environment, catalog locations, commercial provider, organization id, and legal distribution status shall be configuration-controlled per deployment.

### Why this requirement exists

The same image must be able to run as local, docker, or production-pilot without code changes, and those switches are validation-relevant.

### Current implementation

Layered `app-config*.yaml` files.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended configuration integrity model. IQ of a specific host remains unexecuted.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/app-config.production.yaml`  
`data-product-platform/app-config.docker.yaml`  
`data-product-platform/app-config.github.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CFG-002

### Proposed Requirement

The Permission Framework shall be enabled for Platform Core deployments that are intended to enforce RBAC.

### Why this requirement exists

If permission is disabled, URS-RBAC-* become unenforceable.

### Current implementation

`permission.enabled: true` in base config. Overlays not fully re-verified.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended prerequisite for RBAC. Overlay confirmation is an implementation/verification gap.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

HIGH

### Evidence

`data-product-platform/app-config.yaml`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-MKT-001

### Proposed Requirement

The Marketplace shall list approved platform assets for technical discovery and Create navigation. It shall not process payments.

### Why this requirement exists

Technical discovery must stay separate from billing and from AWS Marketplace procurement.

### Current implementation

Marketplace plugin; product docs forbid payments in MVP.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended Discover/Create entry. Low GxP relevance; still a Core capability.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

LOW

### Evidence

`data-product-platform/plugins/marketplace/`  
`PRODUCT.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-MKT-002

### Proposed Requirement

If a Platform Component appears in Marketplace, it shall be presented as a building block, not as a business Data Product.

### Why this requirement exists

Mixing building blocks with Golden Paths causes false “Data Product” claims.

### Current implementation

Architecture rule exists. Label audit of `plugins/marketplace/src/data.ts` was not completed.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended claim-control. Verification of every label is outstanding.

### Implementation status

NOT_VERIFIED

### Risk if requirement is absent

LOW

### Evidence

`ARCHITECTURE.md`  
`data-product-platform/plugins/marketplace/src/data.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-DOC-001

### Proposed Requirement

An authenticated user with read access shall be able to open Developer Hub and TechDocs content hosted by the Control Plane.

### Why this requirement exists

Operators and developers need the hosted how-to and architecture docs.

### Current implementation

Developer Hub module and TechDocs backend. Pilot Exit reported empty TechDocs HTML search index for a fixture.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended documentation access. Index gap is evidence/implementation, not a reason to reject.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

LOW

### Evidence

`data-product-platform/packages/app/src/modules/developer-hub/`  
`data-product-platform/packages/backend/src/index.ts`  
`data-product-platform/docs/pilot-exit-gate.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-SRC-001

### Proposed Requirement

Search shall query Catalog and TechDocs indexes configured on the Control Plane.

### Why this requirement exists

Discover includes finding entities and docs without browsing every page.

### Current implementation

Search backend modules for catalog and TechDocs are registered. Index completeness not proven.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended Discover function.

### Implementation status

PARTIALLY_IMPLEMENTED

### Risk if requirement is absent

LOW

### Evidence

`data-product-platform/packages/backend/src/index.ts`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## URS-CERT-001

### Proposed Requirement

Catalog annotation shall remain the canonical technical certification field. Any file overlay shall be documented as an overlay, not as GxP evidence.

### Why this requirement exists

Traceability of technical status must have one canonical field. A mutable JSON overlay must not be treated as regulatory evidence.

### Current implementation

Annotation plus `catalog/certification-overrides.json` overlay processor. Overlay is mutable (not WORM). Acceptable because Part 11 is out of scope.

### Validation assessment

ACCEPT

### Recommendation rationale

Intended source-of-truth and claim-control rule.

### Implementation status

IMPLEMENTED

### Risk if requirement is absent

MEDIUM

### Evidence

`data-product-platform/app-config.yaml`  
`data-product-platform/plugins/data-products-backend/src/certificationOverlay.ts`  
`data-product-platform/docs/engineering/source-of-truth.md`

### Human Decision

`PENDING`

### Human Comment

`[TO BE COMPLETED]`

---

## Reviewer sign-off (not executed)

| Role | Name | Date | Outcome |
| --- | --- | --- | --- |
| Product owner | | | PENDING |
| Platform architect | | | PENDING |
| CSV / QA | | | PENDING |
| Security | | | PENDING |

AI must not complete this table as APPROVED.
