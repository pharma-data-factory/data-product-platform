# Nexora — Backstage Access & Permission Management Audit 1.0

**Date**: 2026-08-25  
**Scope**: Complete authorization architecture inspection  
**Verdict**: See Executive Summary below  

---

## EXECUTIVE SUMMARY

### Direct Answers to 5 Critical Questions

**Q1: CAN AN ADMIN CURRENTLY RESTRICT DEVELOPERS?**

**A: PARTIAL**
- ✅ RBAC layer works: Admin can remove developer from `data-product-developers` Backstage group
- ✅ Backend enforces: Permission checks protect sensitive routes (certification, Golden Path release)
- ⚠️ COVERAGE GAP: Many backend routes in model-company, validation-manager, etc. lack permission checks
- ⚠️ VISIBILITY GAP: No Admin UI showing which developers have which permissions
- **Verdict**: Technically yes, but gaps in enforcement and visibility

---

**Q2: CAN AN ADMIN CURRENTLY SEE EFFECTIVE ACCESS?**

**A: NO**
- ✅ Permission definitions exist: 31+ permissions in platform-common
- ✅ Role hierarchy exists: VIEWER < DEVELOPER < OWNER < ADMIN
- ❌ No Admin UI for effective access
- ❌ No UI to inspect a user and see derived permissions
- ❌ No visibility into which routes are actually protected
- **Verdict**: Zero visibility for platform admins today

---

**Q3: ARE ALL PRIVILEGED BACKEND ROUTES ACTUALLY PROTECTED?**

**A: NO — SIGNIFICANT GAPS**

| Plugin | Status | Details |
|--------|--------|---------|
| data-products-backend | PARTIAL | /ci-status ✅, /certification ✅, /consume routes ✅, but missing coverage for other critical operations |
| model-company-backend | FULL | All GET/POST routes have permission checks ✅ |
| validation-manager-backend | **NONE** | ❌ /requirements POST, /requirements/:id/approve, /requirements/:id/sign, /admin/dashboard, all unprotected |
| plugin-directory | UNKNOWN | Not audited in detail |
| entitlements-backend | UNKNOWN | Not audited in detail |
| marketplace | UNKNOWN | Not audited in detail |

**Critical Finding**: validation-manager backend has sensitive operations (approval, signing) with ZERO authorization checks

---

**Q4: CAN THE MODEL SUPPORT ENTRA ID / OKTA / LDAP WITHOUT REWRITING AUTHORIZATION?**

**A: YES — ARCHITECTURE IS IDENTITY-PROVIDER-NEUTRAL**

✅ **Clean separation**:
- Identity Provider (GitHub, Entra, Okta, LDAP) → Backstage Identity
- Backstage Identity (user + ownershipEntityRefs) → Catalog User/Group
- Catalog User/Group → Platform Role Resolution
- Platform Role → Permissions

✅ **Key insight**: `resolvePlatformRole(ownershipEntityRefs)` works with ANY identity source

✅ **Entitlements stay separate**: No hardcoding of GitHub Teams

⚠️ **Caveat**: Only if:
1. New IdP maintains Backstage User/Group integration
2. Group naming convention respected (platform-admins, data-product-developers, etc.)
3. ownershipEntityRefs properly populated

**Verdict**: Architecture is provider-neutral. Switchable without rewriting RBAC.

---

**Q5: ARE WE DUPLICATING BACKSTAGE ANYWHERE?**

**A: MINIMAL DUPLICATION — WELL-ARCHITECTED**

✅ What we're using from Backstage:
- `@backstage/plugin-permission-backend` ✓
- `@backstage/plugin-auth-backend` + GitHub provider ✓
- `Catalog User / Group` entities ✓
- `PermissionsService` + `HttpAuthService` ✓
- `PolicyQuery` + `PermissionPolicy` interface ✓

✅ What we customized appropriately:
- `PlatformPermissionPolicy` (implements Backstage interface)
- `decidePermission()` (domain-specific RBAC logic)
- Entitlement layer (separate from Backstage)

❌ What looks duplicated but isn't:
- `platform-common/permissions.ts` — Pharma-specific, not a copy of Backstage
- `platform-common/policy.ts` — Pharma domain logic, properly separated

⚠️ Frontend role check duplication:
- RBAC happens server-side ✓
- Frontend checks same rules for UX (hiding disabled buttons) ⚠️
- Frontend checks are advisory, not security-critical ✓

**Verdict**: Architecture is clean. No unnecessary duplication.

---

### Recommendation Summary

**Recommended Option**: **C** — Backstage Core + Thin Pharma Admin UX

**Reasoning**:
- Backstage Permission Framework is production-ready and battle-tested
- Domain-specific authorization is minimal (commercial entitlements + Golden Path release gating)
- Admin UX layer is needed for visibility and management
- Do NOT build custom policy engine or identity system
- Do NOT fork or modify Backstage core

**Expected Outcome**:
- Pharma admins can see user → role → effective access
- All backend routes are consistently protected
- Authorization remains provider-neutral
- Maintenance burden is low

---

## DETAILED FINDINGS

### 1. Executive Verdict

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           BACKSTAGE_ACCESS_MODEL_NEEDS_HARDENING               ║
║                                                                   ║
║  The architecture is fundamentally sound and uses Backstage       ║
║  standard APIs properly. However, enforcement is incomplete:      ║
║                                                                   ║
║  ✅ RBAC foundation: Working (role → permission mapping)         ║
║  ✅ Identity model: Provider-neutral (GitHub → Backstage)        ║
║  ✅ Policy layer: Correct separation (Backstage + Pharma domain) ║
║  ✅ Entitlements: Properly separate from RBAC                    ║
║                                                                   ║
║  ❌ ENFORCEMENT GAPS: Not all privileged routes protected        ║
║  ❌ ADMIN VISIBILITY: Zero UI for permission management          ║
║  ❌ AUDIT LOGGING: Minimal beyond create-authorization events    ║
║  ❌ RESOURCE OWNERSHIP: Metadata exists, but not enforced        ║
║                                                                   ║
║  Estimated effort to harden: 4-6 weeks (Medium)                  ║
║  Risk of NOT hardening: Medium (privilege escalation possible)   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 2. Current Authorization Architecture

```
EXTERNAL IDENTITY
├─ GitHub OAuth
├─ (Future: Entra ID, Okta, LDAP)
│
↓
BACKSTAGE IDENTITY (@backstage/plugin-auth-backend)
├─ user:default/{github-login}
├─ ownershipEntityRefs
│
↓
CATALOG USERS + GROUPS
├─ User entity (metadata, memberOf)
├─ Group entity (team, description)
│
↓
BACKSTAGE PERMISSION FRAMEWORK (@backstage/plugin-permission-backend)
├─ PolicyQuery (permission, resourceRef)
├─ PermissionPolicy (Pharma implementation)
│
↓
PHARMA DOMAIN LAYER
├─ Role resolution (VIEWER | DEVELOPER | OWNER | ADMIN)
├─ Commercial entitlements (AWS Marketplace, INTERNAL, MANUAL)
├─ Golden Path release gating
│
↓
EFFECTIVE ACCESS
├─ Backend route enforcement (403 Forbidden if denied)
├─ Frontend UX (hide/disable if not permitted)
├─ Audit logging (create-authorization events)
```

**Assessment**: Architecture is correct, uses Backstage standard APIs, properly layered.

---

### 3. What Already Uses Backstage Standard

#### ✅ FULLY USING BACKSTAGE

| Component | How | Status |
|-----------|-----|--------|
| **Permissions** | `@backstage/plugin-permission-common` + `createPermission()` | ✓ Standard |
| **Permission Backend** | `@backstage/plugin-permission-backend` deployed | ✓ Standard |
| **Policy Framework** | Implements `PermissionPolicy` interface | ✓ Standard |
| **HTTP Auth** | `HttpAuthService` from backend-plugin-api | ✓ Standard |
| **Catalog Users** | Backstage User entities in org.yaml | ✓ Standard |
| **Catalog Groups** | Backstage Group entities in org.yaml | ✓ Standard |
| **Identity** | `@backstage/plugin-auth-backend` + GitHub provider | ✓ Standard |
| **Authorization check** | `permissions.authorize([permission], { credentials })` | ✓ Standard |

#### ✅ APPROPRIATELY CUSTOMIZED (NOT DUPLICATION)

| Component | Customization | Justification |
|-----------|--------------|---------------|
| `PlatformPermissionPolicy` | Implements Backstage interface with domain logic | ✓ Correct |
| `decidePermission()` | RBAC: role → permissions | ✓ Domain-specific |
| Entitlement gate in policy | Commercial product → permission decision | ✓ Domain-specific |
| Golden Path release check | Release status → permission decision | ✓ Domain-specific |

#### ⚠️ PARTIAL OR MISSING

| Component | Status | Details |
|-----------|--------|---------|
| **Scaffolder permissions** | PARTIAL | Backstage enforces task.create, but Golden Path-specific gating added via Pharma policy ✓ |
| **Catalog ownership** | METADATA ONLY | spec.owner exists but not enforced for resource-level auth yet ⚠️ |
| **Resource-level conditions** | MISSING | No conditional/fine-grained permissions yet (future Phase 3) |
| **Admin UI for permissions** | MISSING | No built-in; would need Pharma custom UI |
| **Audit logging** | MINIMAL | Only create-authorization audited; read/view/update not logged |

---

### 4. What Is Custom Today (Not Backstage Standard)

| Item | Type | Purpose | Maintainability |
|------|------|---------|-----------------|
| `PlatformRole` enum | Domain type | 4-role hierarchy (VIEWER, DEVELOPER, OWNER, ADMIN) | Low effort |
| `permissionsForRole()` | Domain function | Maps role → permission set | Low effort |
| `decidePermission()` | Domain function | RBAC decision logic | Low effort |
| `PlatformPermissionPolicy` class | Implementation | Backstage interface + entitlements + release gating | Medium effort |
| `EntitlementGate` interface | Domain abstraction | Separates commercial from RBAC | Low effort |
| Pharma permissions (31+) | Definitions | Domain-specific permission names | Low effort |

**Assessment**: All custom components are thin, domain-appropriate, and properly layered. NOT building a custom auth system.

---

### 5. Current Permission Inventory

**Total Permissions Defined**: 31

**By Category**:
- Marketplace: 2 (view, admin)
- Data Products: 6 (view, create, governance, certification.manage, consume, viewQuality, viewValidation, admin)
- Platform: 2 (platform.admin, template.admin)
- Golden Paths: 1 (release.manage)
- AAS: 2 (read, manage)
- Entitlements: 2 (view, admin)
- Validation Expert: 6 (read, run.start, test.execute, review, admin, approve [reserved])
- Risk/Baseline: 2 (risk.accept [reserved], baseline.modify [reserved])
- Plugin Directory: 2 (read, admin)
- Model Company: 4 (read, runScenario, control, admin)
- Scaffolder: 5 (via Backstage: task.create, task.read, task.cancel, action.execute, template.management)
- Catalog: 5 (via Backstage: entity.read, entity.create, entity.delete, entity.refresh, entity.validate, location.create, location.delete, location.analyze)

**Permission Sets by Role**:
```
VIEWER (14 permissions)
├─ catalog.entity.read
├─ catalog.location.read
├─ catalog.entity.validate
├─ marketplace.view
├─ data-product.view
├─ data-product.consume
├─ data-product.viewQuality
├─ data-product.viewValidation
├─ aas.read
├─ entitlement.view
├─ validation.read
├─ requirement.read
├─ traceability.read
└─ modelCompany.read

DEVELOPER (24 permissions = VIEWER + 10 additional)
├─ All VIEWER permissions
├─ catalog.entity.create
├─ catalog.entity.refresh
├─ scaffolder.task.create
├─ scaffolder.task.read
├─ scaffolder.task.cancel
├─ scaffolder.action.execute
├─ scaffolder.template.parameter.read
├─ scaffolder.template.step.read
├─ data-product.create
├─ validation.run.start
├─ validation.test.execute
├─ pluginDirectory.read
└─ modelCompany.runScenario
└─ modelCompany.control

DATA_PRODUCT_OWNER (27 permissions = DEVELOPER + 3 additional)
├─ All DEVELOPER permissions
├─ data-product.governance
├─ data-product.certification.manage
├─ aas.manage
└─ validation.review

PLATFORM_ADMIN (35+ permissions = OWNER + 8+ additional)
├─ All OWNER permissions
├─ catalog.entity.delete
├─ catalog.location.create
├─ catalog.location.delete
├─ catalog.location.analyze
├─ scaffolder.template.management
├─ marketplace.admin
├─ template.admin
├─ platform.admin
├─ golden-path.release.manage
├─ entitlement.admin
├─ validation.admin
├─ pluginDirectory.admin
├─ modelCompany.admin
└─ data-product.admin
```

**Reserved Permissions (NEVER auto-granted in v0.1)**:
- `validation.approve` — Human approval only
- `risk.accept` — Offline/human only
- `baseline.modify` — Baseline is immutable

**Assessment**: Permission model is well-designed, comprehensive, and appropriately restrictive on sensitive operations.

---

### 6. Backend Route Coverage Audit

#### SEVERITY: 🔴 CRITICAL GAP

| Plugin | Route | Method | Operation | Permission Check | Result | Risk |
|--------|-------|--------|-----------|------------------|--------|------|
| **data-products** | /ci-status | GET | View CI status | ✅ data-product.view | PASS | Low |
| **data-products** | /certification | POST | Manage certification | ✅ data-product.certification.manage | PASS | Low |
| **data-products** | /consume/* | GET/POST | Consumption framework | ✅ dataProductConsumePermission | PASS | Low |
| **model-company** | /overview | GET | Factory overview | ✅ modelCompanyReadPermission | PASS | Low |
| **model-company** | /sites, /lines, /equipment | GET | Factory data | ✅ modelCompanyReadPermission | PASS | Low |
| **model-company** | /simulation/start, /stop | POST | Scenario control | ✅ modelCompanyControlPermission | PASS | Low |
| **model-company** | /scenarios/run | POST | Scenario execution | ✅ modelCompanyRunScenarioPermission | PASS | Low |
| **validation-manager** | /requirements | GET | View requirements | ❌ NONE | **FAIL** | **HIGH** |
| **validation-manager** | /requirements | POST | Create requirement | ❌ NONE | **FAIL** | **HIGH** |
| **validation-manager** | /requirements/:id/approve | POST | **Approve requirement** | ❌ NONE | **FAIL** | **CRITICAL** |
| **validation-manager** | /requirements/:id/sign | POST | **Sign requirement** | ❌ NONE | **FAIL** | **CRITICAL** |
| **validation-manager** | /admin/dashboard | GET | View admin dashboard | ❌ NONE | **FAIL** | **HIGH** |
| **validation-manager** | /documents/generate | POST | Generate docs | ❌ NONE | **FAIL** | **HIGH** |
| **plugin-directory** | Unknown | ? | ? | Unknown | UNKNOWN | ? |
| **entitlements** | Unknown | ? | ? | Unknown | UNKNOWN | ? |
| **marketplace** | Unknown | ? | ? | Unknown | UNKNOWN | ? |

**Critical Assessment**:
- ✅ **data-products-backend**: Protected ✓
- ✅ **model-company-backend**: Protected ✓
- 🔴 **validation-manager-backend**: COMPLETELY UNPROTECTED ❌
  - Approval endpoints are sensitive (signatures, formal decisions)
  - Zero authorization checks
  - Anyone with network access can approve/sign

---

### 7. Role Model Assessment

#### CURRENT ROLE HIERARCHY

```
VIEWER (broadest)
  ↓
DEVELOPER
  ↓
DATA_PRODUCT_OWNER
  ↓
PLATFORM_ADMIN (narrowest)
```

#### CAPABILITIES BY ROLE

| Capability | VIEWER | DEVELOPER | OWNER | ADMIN |
|-----------|--------|-----------|-------|-------|
| **Browse Catalog** | ✅ | ✅ | ✅ | ✅ |
| **View Marketplace** | ✅ | ✅ | ✅ | ✅ |
| **Use Component Library** | ✅ | ✅ | ✅ | ✅ |
| **View TechDocs** | ✅ | ✅ | ✅ | ✅ |
| **View Data Products** | ✅ | ✅ | ✅ | ✅ |
| **View Validation Evidence** | ✅ | ✅ | ✅ | ✅ |
| **Use Composer** | ❌ | ✅ | ✅ | ✅ |
| **Create Data Product** | ❌ | ✅ | ✅ | ✅ |
| **Run approved Golden Paths** | ❌ | ✅ | ✅ | ✅ |
| **Start validation run** | ❌ | ✅ | ✅ | ✅ |
| **Execute validation tests** | ❌ | ✅ | ✅ | ✅ |
| **Manage owned products** | ❌ | ❌ | ✅ | ✅ |
| **Review validation evidence** | ❌ | ❌ | ✅ | ✅ |
| **Manage AAS** | ❌ | ❌ | ✅ | ✅ |
| **Release Golden Paths** | ❌ | ❌ | ❌ | ✅ |
| **Manage platform components** | ❌ | ❌ | ❌ | ✅ |
| **Manage platform configuration** | ❌ | ❌ | ❌ | ✅ |
| **Manage marketplace** | ❌ | ❌ | ❌ | ✅ |
| **Manage validation system** | ❌ | ❌ | ❌ | ✅ |
| **Administer entitlements** | ❌ | ❌ | ❌ | ✅ |

**Assessment**: Role model is clear and appropriate. No changes recommended. Hierarchy is correct.

---

### 8. Responsibility Model Assessment

**Current**: Roles only (no separate responsibilities)

**Evaluation**: 

Hypothetical specialized responsibilities might be useful later:
- VALIDATION_REVIEWER (can review evidence, NOT approve)
- GOLDEN_PATH_MAINTAINER (can manage specific Golden Paths, NOT release)
- COMPONENT_MAINTAINER (can manage specific components)

**But** today:
- ❌ No separate responsibility model implemented
- ❌ No use cases requiring more fine-grained roles
- ✓ Can be added in Phase 2+ using Backstage Groups

**Assessment**: Current 4-role model is sufficient for MVP. Defer specialized responsibilities to later if needed.

---

### 9. Ownership-Based Authorization Assessment

**Current State**:
- ✅ Catalog entities have `spec.owner` metadata
- ✅ Ownership is recorded in generated Data Products
- ❌ NOT enforced in permission decisions
- ❌ No resource-level conditional permissions yet

**Example of what COULD work (future)**:
```
Developer belongs to: team:default/packaging-engineering
Data Product owned by: team:default/packaging-engineering

Then: data-product.update ALLOWED for that product
But: data-product.update DENIED for products owned by other teams
```

**Current Implementation Needed**: None (not yet required)

**Future Implementation (Phase 3)**: Backstage supports conditional permissions via policy attributes

**Assessment**: 
- Architecture supports it (Backstage is ready)
- Not urgent (role-based covers MVP)
- Defer to Phase 3 if customers demand it

---

### 10. Scaffolder / Create Assessment

#### HOW IT WORKS TODAY

```
Developer has role: DEVELOPER
  ↓
Has permission: scaffolder.task.create ✅
  ↓
Can execute templates: YES ✅
  ↓
BUT: Golden Path templates have release gating
  ↓
Only released Golden Paths can be executed ✅
```

#### GOLDEN PATH GATING (Custom Pharma Layer)

```
PlatformPermissionPolicy.handle():
  ├─ Is scaffolder.task.create? YES
  ├─ Is template commercial? Check
  ├─ Is organization entitled? Check
  ├─ Is Golden Path released? Check
  └─ Result: ALLOW (all checks pass) or DENY
```

**Code Reference**: `packages/backend/src/permission/policy.ts` lines 83-106

**Assessment**: 
- ✅ Correctly layered (Backstage + Pharma domain)
- ✅ Release gating prevents pre-release execution
- ✅ Entitlement checking prevents unauthorized commercial use
- ✅ NOT reimplementing Backstage Scaffolder auth

---

### 11. Validation Expert Assessment

#### CURRENT PERMISSIONS

| Permission | VIEWER | DEVELOPER | OWNER | ADMIN |
|-----------|--------|-----------|-------|-------|
| validation.read | ✅ | ✅ | ✅ | ✅ |
| validation.run.start | ❌ | ✅ | ✅ | ✅ |
| validation.test.execute | ❌ | ✅ | ✅ | ✅ |
| validation.review | ❌ | ❌ | ✅ | ✅ |
| validation.admin | ❌ | ❌ | ❌ | ✅ |
| **validation.approve** [RESERVED] | ❌ | ❌ | ❌ | ❌ |
| **risk.accept** [RESERVED] | ❌ | ❌ | ❌ | ❌ |
| **baseline.modify** [RESERVED] | ❌ | ❌ | ❌ | ❌ |

**Assessment of Separation**:
- ✅ **Correctly restrictive**: approval never auto-granted
- ✅ **Risk acceptance is human-only**: not a permission system decision
- ✅ **Baseline is immutable**: correct for GxP stability

#### BACKEND ENFORCEMENT GAP ❌

**CRITICAL FINDING**: validation-manager-backend has sensitive routes with NO permission checks:
- POST /requirements/:id/approve — Should require validation.review
- POST /requirements/:id/sign — Should require validation.review or special role

**Assessment**: 
- ❌ Permission system defined correctly
- ❌ But backend does NOT enforce it
- This is a CRITICAL security gap

---

### 12. Entitlements Separation Assessment

#### IS ENTITLEMENT SEPARATE FROM PERMISSION?

**Answer**: YES ✅

```
PERMISSION: Can this user perform this action?
  ↓ (decided by role + policy)

ENTITLEMENT: Has organization obtained access?
  ↓ (decided by AWS Marketplace or MANUAL)

RESULT: Permission AND Entitlement
```

**Code Example** (`packages/backend/src/permission/policy.ts` lines 83-106):
```typescript
if (allowed && this.commercial && isScaffolderTemplatePermission(...)) {
  if (product && isCommerciallyOffered(product)) {
    entitled = await this.commercial.hasEntitlement(...);
    if (!entitled) {
      allowed = false;
      reason = 'ENTITLEMENT';
    }
  }
}
```

**Assessment**:
- ✅ Correctly separated (not merged)
- ✅ Entitlement service is independent
- ✅ Does NOT confuse commercial access with RBAC
- ✅ Audit trail distinguishes RBAC failures from entitlement failures

---

### 13. Enterprise Identity Readiness Assessment

#### CAN WE SWITCH FROM GITHUB TO ENTRA ID / OKTA / LDAP?

**Answer**: YES, with minimal changes ✅

**Why**:
1. Backstage Identity layer is provider-agnostic
2. Catalog User/Group mapping is independent of identity source
3. Role resolution works on ownershipEntityRefs, not GitHub specifics

**Migration Path**:
```
GitHub OAuth              Entra ID / OKTA / LDAP
       ↓                          ↓
@backstage/plugin-auth-backend (provider-swappable)
       ↓
Backstage Identity (user + ownershipEntityRefs)
       ↓
Catalog User / Group (org.yaml or organization provider)
       ↓
resolvePlatformRole(ownershipEntityRefs)
       ↓
Permission Framework
```

**Requirements**:
- ✅ New IdP must integrate with Backstage auth-backend
- ✅ Must populate ownershipEntityRefs correctly
- ✅ Must maintain group naming convention (platform-admins, etc.)
- ✅ Can use Backstage organization provider (directory sync) for future

**Assessment**: Architecture is provider-neutral. Switchable.

---

### 14. Backstage/Plugin Reuse Opportunities

#### WHAT WE'RE USING (GOOD)

| Component | Status | Notes |
|-----------|--------|-------|
| @backstage/plugin-permission-backend | ✅ Deployed | Handles policy decisions |
| @backstage/plugin-auth-backend | ✅ Deployed | GitHub OAuth |
| @backstage/plugin-catalog-backend | ✅ Deployed | User/Group entities |
| @backstage/plugin-scaffolder-backend | ✅ Deployed | Template execution |
| @backstage/plugin-permission-node | ✅ Used | PolicyQuery interface |

#### EXISTING RBAC PLUGINS WE'RE NOT USING

| Plugin | Why NOT | Recommendation |
|--------|--------|-----------------|
| **@backstage/plugin-rbac** | Doesn't exist in Backstage core (it's a new community plugin) | Monitor; if mature, could replace custom policy in Phase 2+ |
| **Kubernetes RBAC** | Not applicable (we're not using K8s auth) | Skip |

#### WHAT WE COULD REUSE

| Opportunity | Current | Future |
|-------------|---------|--------|
| **Catalog ownership enforcement** | Metadata only | Phase 3: Backstage conditions/resource permissions |
| **Group synchronization** | Manual org.yaml | Phase 2: Backstage organization provider (LDAP/Okta sync) |
| **Advanced audit** | Minimal (create-authorization only) | Phase 2: @backstage/plugin-audit-backend? (if mature) |
| **Fine-grained conditions** | Not used yet | Phase 3: Backstage condition syntax (resourceRef, user attributes, etc.) |

**Assessment**: Using appropriate plugins, not building unnecessary infrastructure.

---

### 15. Recommended Admin UX

#### MINIMAL ADMIN AREA STRUCTURE

```
/admin/access/

├─ Users
│  └─ [user-name]
│     ├─ Identity Provider
│     ├─ Platform Role
│     ├─ Group Memberships
│     └─ Effective Access (derived view)
│
├─ Groups
│  └─ [group-name]
│     ├─ Members
│     ├─ Mapped to Role
│     └─ Permissions
│
└─ Role Administration
   ├─ Viewer
   │  └─ [14 permissions listed]
   ├─ Developer
   │  └─ [24 permissions listed]
   ├─ Data Product Owner
   │  └─ [27 permissions listed]
   └─ Platform Admin
      └─ [35+ permissions listed]
```

#### EXPECTED USER DETAIL PAGE

```
ANNA MÜLLER

IDENTITY
├─ Provider: GitHub
├─ Backstage User: anna.mueller
├─ User Entity Ref: user:default/anna.mueller

GROUPS
├─ Packaging Engineering Team (team:default/packaging-team)
└─ Data Product Developers (group:default/data-product-developers)

PLATFORM ROLE
└─ DEVELOPER [inherited from data-product-developers group]

EFFECTIVE ACCESS (DERIVED — NOT STORED)
├─ Browse Platform                                ✅ ALLOWED
├─ Use Component Library                          ✅ ALLOWED
├─ Use Composer                                   ✅ ALLOWED
├─ Create Data Product                            ✅ ALLOWED
├─ Modify Team-Owned Products                     ✅ ALLOWED (future, ownership-based)
├─ Modify Other Products                          ❌ DENIED
├─ Manage Components                              ❌ DENIED
├─ Manage Golden Paths                            ❌ DENIED
├─ Approve Validation Results                     ❌ DENIED
└─ Platform Administration                        ❌ DENIED
```

**Key Principle**: Effective Access is DERIVED from Role, Group, and Ownership. NOT a separate stored matrix.

---

### 16. Proposed Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│  ENTERPRISE IDENTITY SOURCES                                   │
│                                                                │
│  GitHub    │  Azure Entra ID  │  Okta  │  LDAP  │  Keycloak   │
└──────┬─────────────────┬───────────────────┬──────────────────┘
       │ (OAuth2/OIDC)   │ (OIDC)           │ (SAML/LDAP)
       │                 │                   │
       └─────────────────┼───────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  BACKSTAGE FOUNDATION (open-source)                            │
│                                                                │
│  @backstage/plugin-auth-backend (provider-pluggable)          │
│  ↓                                                             │
│  Backstage Identity (user:default/alice, ownershipEntityRefs) │
│  ↓                                                             │
│  @backstage/plugin-catalog-backend                            │
│  ├─ User entities (with memberOf)                             │
│  └─ Group entities (team, responsibilities)                   │
│                                                                │
│  @backstage/plugin-permission-backend                         │
│  ├─ PolicyQuery handler                                       │
│  └─ PermissionPolicy interface implementation                 │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  NEXORA POLICY LAYER (thin, domain-specific)      │
│                                                                │
│  PlatformPermissionPolicy                                     │
│  ├─ Role resolution (ownershipEntityRefs → Platform Role)     │
│  ├─ RBAC decision (role → permissions)                        │
│  ├─ Commercial entitlements check (organization → access)     │
│  └─ Golden Path release gating (template → release status)    │
│                                                                │
│  Entitlements Service (separate, not permissions)             │
│  ├─ AWS Marketplace integration (optional)                    │
│  └─ Organization commercial access tracking                   │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────┬─────────────┬────────────────┬─────────────┐
│   CREATE         │  COMPOSER   │   VALIDATION   │  DATA       │
│   (Scaffolder)   │ (Components)│   (Evidence)   │  PRODUCTS   │
│                  │             │                │             │
│ ✓ Permission     │ ✓ Permission│ ✓ Permission   │ ✓ Permission│
│ ✓ Entitlement    │ ✓ Entitlement                │ ✓ Entitlement
│ ✓ Release status │             │                │             │
└──────────────────┴─────────────┴────────────────┴─────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  PHARMA ADMIN UX (minimal, visibility only)                    │
│                                                                │
│  /admin/access                                                 │
│  ├─ Users (view → role → effective access)                     │
│  ├─ Groups (management)                                        │
│  └─ Roles (documentation of permissions)                       │
│                                                                │
│  NOTE: Admin UI is a read-mostly view over Backstage identity  │
│  and authorization decisions. It does NOT become a second      │
│  authorization engine.                                         │
└────────────────────────────────────────────────────────────────┘
```

**Visual Legend**:
- **Backstage Foundation** (blue): Reused, not modified
- **Pharma Layer** (teal): Thin domain layer only
- **Admin UX** (gray): Visibility and management only

---

### 17. Recommended Option: C (Backstage Core + Thin Admin UX)

#### OPTION A: Backstage Core Only
❌ Not sufficient: Admin has zero visibility
✗ Support burden: Admins can't see who has what access
✗ Compliance: Hard to audit decisions

#### OPTION B: Backstage Core + Existing RBAC Plugin
⚠️ No mature RBAC plugin in Backstage ecosystem today
⚠️ @backstage/plugin-rbac is early-stage
🔲 Could reconsider in Phase 2+ if it matures

#### **OPTION C: Backstage Core + Thin Pharma Admin UX** ✅ RECOMMENDED
✅ Maintains Backstage standard (no core changes)
✅ Adds only domain-appropriate visibility
✅ Low maintenance burden
✅ Enterprise-ready
✅ Provider-neutral (supports future IdP switch)

**Why C is best**:
1. **Maintenance**: Thin admin UX is easier to maintain than custom policy engine
2. **Upgrade compatibility**: No Backstage core modifications
3. **Security**: Still uses Backstage permission framework (battle-tested)
4. **Extensibility**: Can add fine-grained permissions in Phase 3 without rewriting
5. **Vendor lock-in**: None (Backstage is open-source, policies are standard)
6. **Enterprise readiness**: Meets expectations for access management UI

#### COMPARISON TABLE

| Criteria | Option A | Option B | **Option C** |
|----------|----------|----------|------------|
| **Backstage standard** | ✅ | ⚠️ | ✅ |
| **Admin visibility** | ❌ | ✅ | ✅ |
| **Maintenance burden** | Low | High | Medium |
| **Enterprise-ready** | ❌ | ✅ | ✅ |
| **Provider-neutral** | ✅ | ✅ | ✅ |
| **Upgrade compatible** | ✅ | ✅ | ✅ |
| **Cost to implement** | $0 | $12-16k | $8-10k |
| **Effort (weeks)** | 0 | 6-8 | 4-6 |
| **Risk** | HIGH | MEDIUM | LOW |
| **Recommended** | ❌ | ❌ | ✅ |

---

### 18. P0/P1/P2 Gaps

#### P0 (Critical, now)
- [ ] **Backend enforcement audit** → Validate all privileged routes are protected
- [ ] **Validation-manager hardening** → Add permission checks to approval/sign endpoints
- [ ] **Route inventory** → Maintain list of what's protected vs. not

#### P1 (High priority, next 4-6 weeks)
- [ ] **Admin Access UI** → Users, Groups, Role documentation
- [ ] **Effective Access display** → Show user → role → permissions
- [ ] **Audit logging** → Log all authorization decisions (not just creates)

#### P2 (Medium priority, 2-3 months)
- [ ] **Ownership-based authorization** → Enforce spec.owner for resource conditions
- [ ] **Specialized responsibilities** → VALIDATION_REVIEWER, GOLDEN_PATH_MAINTAINER (if needed)
- [ ] **Group synchronization** → Backstage organization provider for LDAP/Okta

---

### 19. Exact Files Needing Changes

#### P0: HARDENING (Critical)

| File | Type | Changes Needed | Effort |
|------|------|----------------|--------|
| `plugins/validation-manager-backend/src/router.ts` | Backend | Add `authorize()` calls to /requirements POST, /approve, /sign endpoints | 2 days |
| `packages/platform-common/src/permissions.ts` | Definitions | Validate no new permissions needed (likely OK as-is) | 2 hours |
| `packages/backend/src/permission/policy.ts` | Policy | Review logic for validation.review enforcement | 4 hours |

#### P1: ADMIN UX (Priority)

| File | Type | Changes Needed | Effort |
|------|------|----------------|--------|
| `packages/app/src/modules/admin/AdminAccessPage.tsx` | NEW | Create users/groups/role admin UI | 2 weeks |
| `packages/app/src/modules/admin/UserDetailPage.tsx` | NEW | Create user detail + effective access view | 1 week |
| `packages/app/src/modules/admin/GroupManagementPage.tsx` | NEW | Create group + member management UI | 1 week |
| `packages/app/src/modules/nav/Sidebar.tsx` | Routing | Add /admin/access navigation | 2 hours |
| `packages/platform-common/src/permissions.ts` | Data | Export permission metadata for UI | 1 day |

#### P2: RESOURCE OWNERSHIP (Future)

| File | Type | Changes Needed | Effort |
|------|------|----------------|--------|
| `packages/backend/src/permission/policy.ts` | Policy | Add resource condition evaluation (Backstage conditional) | 1 week |
| `packages/platform-common/src/permissions.ts` | Definitions | Add resource-specific permission variants (optional) | 2 days |

---

### 20. Tests Required

#### Authorization Tests (P0)

```typescript
describe('Authorization: Validation Manager', () => {
  describe('POST /requirements/:id/approve', () => {
    it('denies VIEWER', async () => { /* 403 */ });
    it('denies DEVELOPER', async () => { /* 403 */ });
    it('allows DATA_PRODUCT_OWNER', async () => { /* 200 */ });
    it('allows PLATFORM_ADMIN', async () => { /* 200 */ });
  });
});

describe('Authorization: Data Products', () => {
  describe('POST /data-products', () => {
    it('denies VIEWER', async () => { /* 403 */ });
    it('allows DEVELOPER', async () => { /* 201 */ });
    it('allows OWNER', async () => { /* 201 */ });
    it('allows ADMIN', async () => { /* 201 */ });
    it('denies unauthenticated', async () => { /* 401 */ });
  });
});
```

#### Identity Tests (Backstage Integration)

```typescript
describe('Identity Resolution', () => {
  it('resolves GitHub user to Catalog User', async () => {
    const credentials = await githubOAuth(...);
    const user = await catalog.getUser(credentials);
    expect(user).toBeDefined();
  });

  it('resolves group memberships from Backstage', async () => {
    const groups = await catalog.getGroups(user);
    expect(groups).toContain('group:default/data-product-developers');
  });

  it('resolves role from groups', async () => {
    const role = resolvePlatformRole(groups);
    expect(role).toBe('DEVELOPER');
  });
});
```

#### Admin Effective Access Tests (P1)

```typescript
describe('Effective Access', () => {
  it('derives permissions from role', async () => {
    const user = { role: 'DEVELOPER' };
    const access = deriveEffectiveAccess(user);
    expect(access).toContain('data-product.create');
    expect(access).not.toContain('platform.admin');
  });

  it('includes ownership-based access (future)', async () => {
    const user = { role: 'DEVELOPER', teams: ['packaging-team'] };
    const product = { owner: 'packaging-team' };
    const access = deriveEffectiveAccess(user, product);
    expect(access).toContain('data-product.update');
  });
});
```

---

### 21. Explicit "DO NOT BUILD" List

```
DO NOT BUILD:

❌ Custom OAuth server
❌ Custom Identity Provider
❌ Custom LDAP server
❌ Custom OIDC implementation
❌ Custom policy engine (use Backstage + thin layer)
❌ Custom IAM database
❌ Custom user database
❌ Custom group database
❌ Per-user ACL database
❌ Second RBAC engine
❌ Duplicate Catalog ownership system
❌ Duplicate Scaffolder authorization
❌ Authorization inside frontend only (NO!)
❌ New identity model (use Backstage identity)
❌ Custom group sync (use Backstage organization provider later)

✅ DO BUILD (if needed):

✓ Thin Pharma Admin UX (visibility only)
✓ Entitlement gate (already doing correctly)
✓ Golden Path release gating (already doing correctly)
✓ Validation-specific permission checks (backend enforcement only)
✓ Audit logging (optional, non-security-critical)
```

---

### 22. Source of Truth Mapping

```
IDENTITY
→ Enterprise IdP (GitHub, Entra, Okta, LDAP)
  └─ One source, no caching needed

USERS / GROUPS
→ Backstage Catalog (org.yaml initially, organization provider later)
  └─ Derived from IdP, authoritative in Backstage

OWNERSHIP
→ Catalog entities (spec.owner property)
  └─ Set at entity creation, metadata only (not enforcement yet)

PERMISSIONS
→ Backstage Permission Framework (@backstage/plugin-permission-backend)
  └─ Defined in platform-common, enforced via PermissionPolicy

POLICY
→ Pharma PlatformPermissionPolicy class
  └─ Implements Backstage interface, contains domain logic

COMMERCIAL ACCESS (ENTITLEMENTS)
→ Entitlements Service (AWS Marketplace or MANUAL)
  └─ Independent from RBAC, checked as additional gate

EFFECTIVE ACCESS
→ Derived view only (computed at request time)
  └─ NOT stored, NOT a second source of truth
```

---

### 23. Summary: Current vs. Needed State

| Dimension | Current | Needed | Gap |
|-----------|---------|--------|-----|
| **RBAC Foundation** | ✅ Works | ✅ Works | None |
| **Identity Model** | ✅ Provider-neutral | ✅ Provider-neutral | None |
| **Permission Definitions** | ✅ 31 permissions defined | ✅ Sufficient | None |
| **Backend Enforcement** | ⚠️ PARTIAL (data-products ✓, model-company ✓, validation-manager ❌) | ✅ ALL routes protected | **CRITICAL** |
| **Admin UI** | ❌ None | ✅ Users/groups/roles | **HIGH PRIORITY** |
| **Effective Access Visibility** | ❌ Zero | ✅ User detail page | **HIGH PRIORITY** |
| **Audit Logging** | ⚠️ Create-authorization only | ✅ All decisions | **MEDIUM** |
| **Resource Ownership** | ✅ Metadata exists | ❌ Not enforced | **FUTURE (P3)** |
| **Conditional Permissions** | ❌ Not used | ⚠️ Optional | **FUTURE (P3)** |

---

## FINAL VERDICT

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           BACKSTAGE_ACCESS_MODEL_NEEDS_HARDENING               ║
║                                                                   ║
║  Executive Finding:                                              ║
║                                                                   ║
║  The authorization architecture is FUNDAMENTALLY SOUND and uses  ║
║  Backstage standard APIs correctly. NO architectural redesign    ║
║  is required.                                                    ║
║                                                                   ║
║  However, ENFORCEMENT is INCOMPLETE and VISIBILITY is ZERO:      ║
║                                                                   ║
║  CRITICAL FINDINGS:                                              ║
║  • Validation-manager backend routes are completely unprotected  ║
║  • Admin has zero visibility into permission assignments         ║
║  • No way to inspect user effective access                       ║
║  • Audit logging is minimal                                      ║
║                                                                   ║
║  RECOMMENDED PATH FORWARD:                                       ║
║  • Option C: Backstage Core + Thin Admin UX                      ║
║  • Phase 1: Harden enforcement (validation-manager, audit)       ║
║  • Phase 2: Build Admin Access UI                                ║
║  • Phase 3: Add resource-level conditions (if needed)            ║
║                                                                   ║
║  Effort: 4-6 weeks (Medium)                                      ║
║  Risk: LOW (using Backstage standard, minimal changes)           ║
║  Enterprise-readiness: HIGH (meets expectations post-hardening)  ║
║                                                                   ║
║  DO NOT build custom policy engine or identity system.           ║
║  DO NOT fork Backstage.                                          ║
║  DO extend Backstage appropriately for domain needs.             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## NEXT STEP (EXACT)

**Do NOT implement yet.**

**Next:** User reviews this audit and decides:

1. **Proceed with P0 hardening** (fix validation-manager backend)
2. **Proceed with P0 + P1** (hardening + Admin UI)
3. **Request deeper dive** on specific area
4. **Approve Option C formally** and set timeline

**Await user guidance.**

