# PLATFORM RBAC IMPLEMENTATION ROADMAP

**Status:** Analysis Complete — Ready for Phase 1 Implementation  
**Timeline:** 6-8 hours for full integration (next sprint)

---

## ARCHITECTURE VISION

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backstage Identity                           │
│              (Guest / GitHub / External Providers)              │
└────────────────────────────────────────┬────────────────────────┘
                                         │
                ┌────────────────────────▼────────────────────────┐
                │        Catalog Users & Groups                   │
                │  (user:default/*, group:default/*)             │
                │  - platform-admins                              │
                │  - urs-authors                                  │
                │  - urs-business-reviewers (NEW)                 │
                │  - validation-reviewers (NEW)                   │
                │  - etc.                                         │
                └────────────────────────┬────────────────────────┘
                                         │
        ┌────────────────────────────────▼────────────────────────┐
        │      Backstage Permission Framework                     │
        │  - Identity service                                     │
        │  - Permission resolution                                │
        │  - Decision engine                                      │
        └────────────────────────────────┬────────────────────────┘
                                         │
        ┌────────────────────────────────▼────────────────────────┐
        │   Central RBAC Policy (NEW)                             │
        │  - RBAC rule engine                                     │
        │  - Group → Role → Permission mapping                    │
        │  - Delegates to PlatformPermissionPolicy (fallback)     │
        └────────────────────────────────┬────────────────────────┘
                                         │
        ┌────────────────────────────────▼────────────────────────┐
        │    PlatformPermissionPolicy (Existing)                  │
        │  - Catalog group resolution                             │
        │  - Entitlement checks                                   │
        │  - Release gate validation                              │
        └────────────────────────────────┬────────────────────────┘
                                         │
        ┌────────────────────────────────▼────────────────────────┐
        │   Domain Plugin Enforcement                             │
        │  ├─ URS: urs.read, urs.create, urs.manage, etc.        │
        │  ├─ Validation: validation.read, validation.review, etc│
        │  ├─ Data Products: data-product.create, etc.           │
        │  └─ Marketplace: marketplace.admin, etc.               │
        └────────────────────────────────┬────────────────────────┘
                                         │
        ┌────────────────────────────────▼────────────────────────┐
        │   Authorized Operations                                 │
        │  - Create/read/modify resources                         │
        │  - Approve workflows                                    │
        │  - Admin functions                                      │
        └─────────────────────────────────────────────────────────┘
```

---

## PHASE 1: BACKEND REGISTRATION (2 hours)

### 1.1 Create RBAC Module

**File:** `packages/backend/src/rbac/module.ts` (NEW)

```typescript
import { createBackendModule } from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { rbacPlugin } from '@backstage-community/plugin-rbac-backend';

/**
 * RBAC Backend Module
 *
 * Registers the Community RBAC plugin as a policy extension.
 * RBAC rules override PlatformPermissionPolicy when configured.
 * Falls back to existing policy if no RBAC rule matches.
 */
export const rbacModule = createBackendModule({
  pluginId: 'permission',
  moduleId: 'rbac',
  register(reg) {
    // RBAC backend plugin auto-registers its policy
    reg.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, database }) {
        logger.info('RBAC policy module initialized');
      },
    });
  },
});
```

### 1.2 Update Backend Index

**File:** `packages/backend/src/index.ts`

```typescript
// Add after permission-backend registration
backend.add(import('@backstage-community/plugin-rbac-backend'));

// Option: Add custom RBAC module if delegation needed
// backend.add(rbacModule);
```

### 1.3 Verify Backend Startup

```bash
cd packages/backend
yarn build
yarn start
# Expected: No errors, RBAC module logs appear
```

---

## PHASE 2: CATALOG GROUPS (30 minutes)

### 2.1 Update Catalog

**File:** `catalog/org.yaml`

**Add new groups:**

```yaml
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: urs-authors
  title: URS Authors
  description: Can create and edit URS requirement sets
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: urs-owners
  title: URS Owners
  description: Own URS requirement sets
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: urs-business-reviewers
  title: URS Business Reviewers
  description: Review and approve URS for business fit
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: urs-product-managers
  title: URS Product Managers
  description: Review and approve URS for product perspective
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: urs-quality-reviewers
  title: URS Quality Reviewers
  description: Review and approve URS for quality/compliance
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: validation-reviewers
  title: Validation Reviewers
  description: Review validation evidence and findings
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: validation-managers
  title: Validation Managers
  description: Manage validation runs and protocols
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: solution-authors
  title: Solution Authors
  description: Create and manage solution designs
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: solution-owners
  title: Solution Owners
  description: Own solution designs
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: marketplace-publishers
  title: Marketplace Publishers
  description: Publish and manage marketplace offerings
spec:
  type: team
  children: []
```

### 2.2 Assign Users to Groups (Optional for Development)

```yaml
---
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: schmeckm
  title: Markus Schmeckenbecher
  annotations:
    github.com/user-login: schmeckm
spec:
  profile:
    displayName: Markus Schmeckenbecher
  memberOf: [platform-admins, urs-authors, validation-reviewers]  # Extended groups
```

### 2.3 Reload Catalog

```bash
# Backstage will auto-reload, or manually trigger via admin UI
```

---

## PHASE 3: FRONTEND INTEGRATION (30 minutes)

### 3.1 Add RBAC Plugin to App

**File:** `packages/app/src/App.tsx`

```typescript
import rbacPlugin from '@backstage-community/plugin-rbac';

export default createApp({
  features: [
    catalogPlugin,
    rbacPlugin,  // NEW: Add RBAC frontend
    // ... rest of plugins
  ],
});
```

### 3.2 Build & Verify

```bash
cd packages/app
yarn build
# Verify no build errors
```

---

## PHASE 4: RBAC CONFIGURATION (1-2 hours)

### 4.1 Access RBAC Admin UI

**URL:** `http://localhost:3000/admin/rbac`

### 4.2 Create Roles

**Example: URS Author Role**

1. Navigate: Admin → Access Control → Roles
2. Create: "URS Author"
3. Add permissions:
   - urs.read
   - urs.create
   - urs.manage
4. Save

**Example: Business Reviewer Role**

1. Create: "Business Reviewer"
2. Add permissions:
   - urs.read
   - urs.approve
3. Save

**Repeat for all roles** (or use API)

### 4.3 Assign Roles to Groups

**Example: Assign URS Author to group:default/urs-authors**

1. Navigate: Admin → Access Control → Group Assignments
2. Select group: "urs-authors"
3. Add role: "URS Author"
4. Save

**Repeat for all groups**

---

## PHASE 5: TESTING (2-3 hours)

### 5.1 Permission Discovery Test

```bash
# Navigate to RBAC admin UI
# Verify URS permissions appear:
# ✅ urs.read
# ✅ urs.create
# ✅ urs.manage
# ✅ urs.approve
# ✅ urs.admin
# (Plus all other platform permissions)
```

### 5.2 URS Permission Regression Test

```bash
yarn test -- urs-composer-backend
# Expected: All P1B permission tests pass
# Expected: No new authorization errors
```

### 5.3 User Journey Test

**Test Case: URS Author cannot approve**

```
1. Login as user in group:default/urs-authors
2. Navigate to URS Composer
3. Create URS (draft)
4. Save draft
5. Expected: ✅ Can save
6. Attempt: POST /approve-step
7. Expected: ❌ 403 Forbidden (no urs.approve)
```

**Test Case: Business Reviewer cannot create**

```
1. Login as user in group:default/urs-business-reviewers
2. Attempt: POST /requirement-sets
3. Expected: ❌ 403 Forbidden (no urs.create)
4. Navigate to existing URS
5. Attempt: POST /approve-step
6. Expected: ✅ 200 OK (has urs.approve)
```

### 5.4 Approval Workflow Integration Test

```
1. User with urs.approve permission attempts to approve
2. RBAC check: ✅ Has urs.approve
3. URS Service: Check eligibility for this step
4. If eligible: ✅ Approval succeeds
5. If not eligible: ⚠️ 403 (approved by RBAC, ineligible for step)
```

### 5.5 End-to-End Test Suite

```bash
yarn test
# All tests pass
# No regressions
# Permission enforcement verified
```

---

## PHASE 6: DOCUMENTATION (1-2 hours)

### 6.1 Create ADR

**File:** `docs/architecture/adrs/ADR-003-central-platform-rbac.md`

```markdown
# ADR-003: Central Platform RBAC via Backstage Permission Framework

## Status
Accepted

## Context
The platform requires centralized authorization control across multiple plugins
(URS Composer, Validation Expert, Data Products, Marketplace, etc.).

## Decision
Implement a shared authorization control plane using:
1. Backstage Identity (user/group resolution)
2. Backstage Permission Framework (standard authorization API)
3. Backstage Community RBAC Plugin (role/group administration)

All custom permissions are defined in `@internal/platform-common`.
Individual plugins define and enforce their own permissions.
RBAC provides centralized role administration and policy override capability.

## Consequences
✅ Single source of authorization truth
✅ Consistent permission naming across plugins
✅ Centralized role administration
✅ Audit trail of permission decisions
❌ RBAC configuration required during deployment
❌ Backward compatibility break if policies not migrated correctly
```

### 6.2 Update Architecture Documentation

**File:** `docs/architecture/authorization.md` (NEW)

Include:
- Identity flow diagram
- Permission resolution flow
- RBAC architecture
- Role model
- Permission matrix

### 6.3 Update Plugin Architecture

**File:** `docs/architecture/plugin-architecture.md`

Add section:
- Each plugin defines its own permissions
- Permissions registered in `@internal/platform-common`
- RBAC provides policy layer on top

---

## PHASE 7: DEPLOYMENT PREPARATION (1 hour)

### 7.1 Create Migration Guide

**File:** `docs/migration/rbac-migration.md`

Include:
- Pre-migration checklist
- Group creation steps
- Role configuration steps
- Testing checklist
- Rollback plan

### 7.2 Create Runbook

**File:** `docs/operations/rbac-admin-runbook.md`

Include:
- How to add a new role
- How to assign role to group
- How to debug permission issues
- How to audit permission decisions
- Common issues + fixes

---

## IMPLEMENTATION TIMELINE

| Phase | Task | Hours | Status |
|-------|------|-------|--------|
| 1 | Backend registration | 2 | ⏳ Deferred |
| 2 | Catalog groups | 0.5 | ⏳ Deferred |
| 3 | Frontend integration | 0.5 | ⏳ Deferred |
| 4 | RBAC configuration | 1-2 | ⏳ Deferred |
| 5 | Testing | 2-3 | ⏳ Deferred |
| 6 | Documentation | 1-2 | ⏳ Deferred |
| 7 | Deployment prep | 1 | ⏳ Deferred |
| | **TOTAL** | **~10** | — |

**Recommended:** Schedule for next sprint (1 full day for one engineer)

---

## SUCCESS CRITERIA

✅ **Backend**
- RBAC module registers without errors
- Permission Framework calls RBAC policy
- RBAC policy resolves permissions correctly

✅ **Frontend**
- RBAC admin UI loads
- Permission discovery works
- Permissions organized by domain

✅ **Configuration**
- Roles created
- Groups assigned
- No user lockout

✅ **Testing**
- URS permission tests pass
- Validation permission tests pass
- Cross-plugin permission tests pass
- User journey tests pass

✅ **Documentation**
- ADR created
- Architecture docs updated
- Migration guide written
- Runbooks created

---

## ROLLBACK PLAN

If issues arise:

1. **RBAC policy fails:** Disable RBAC module, revert to PlatformPermissionPolicy
2. **User lockout:** Add user back to group with sufficient permissions
3. **Permission denied:** Check group membership and role assignment

**No data loss risk** — RBAC is policy layer only

---

## NOTES

- No migration needed from existing policy (RBAC is additive overlay)
- Existing permission tests continue to pass
- Gradual role adoption possible (not all-or-nothing)
- RBAC configuration can be updated without code changes
- Easy to audit (all decisions in RBAC audit log)

---

**Next Step:** Begin Phase 1 (Backend Registration) when scheduled

**Duration:** 1 full sprint day (~8 hours)

**Recommended:** Allocate 2 engineers if parallel phases (backend + docs)
