# ADR-004: Central Platform RBAC via Backstage Community Plugin

**Date:** August 26, 2026  
**Status:** Accepted  
**Decision:** Implement centralized role-based access control using Backstage Community RBAC plugin

---

## CONTEXT

The Pharma Data Platform consists of multiple domain plugins (URS Composer, Validation Expert, Data Products, Marketplace, etc.), each with its own permission requirements. Previously, permissions were defined but administered separately in each plugin.

As the platform grows, a centralized authorization administration capability is needed to:
1. **Manage roles** consistently across domains
2. **Assign permissions** to groups centrally
3. **Audit** authorization decisions
4. **Scale** new domains without reimplementing RBAC

The installed Backstage Community RBAC plugin provides this capability natively.

---

## DECISION

The platform uses:

1. **Backstage Identity Provider** (Guest, GitHub, future providers)
   - Resolves authenticated user identity
   
2. **Backstage Catalog Users & Groups** (`catalog/org.yaml`)
   - Source of truth for group membership
   - No separate user/group database
   
3. **Backstage Permission Framework** (`@backstage/plugin-permission-backend`)
   - Standard authorization API all plugins use
   - Resolves permissions for authenticated requests
   
4. **Backstage Community RBAC Plugin** (`@backstage-community/plugin-rbac-backend`)
   - Central role administration (roles, group assignments)
   - Policy engine that wraps existing `PlatformPermissionPolicy`
   - Admin UI for self-service role management
   
5. **Domain Plugin Permissions**
   - Each plugin defines and enforces its own permissions
   - `packages/platform-common/src/permissions/*.ts` aggregates them
   - Plugins implement authorization checks in routers/services

---

## ARCHITECTURE

```
Request (HTTP)
  ↓
Router (express) — Plugin domain layer
  ↓
Permissions.authorize([{permission}], credentials)
  ↓
RBAC Policy Engine
  ├─ Check RBAC role assignments (group → role → permissions)
  └─ Delegate to PlatformPermissionPolicy if no RBAC rule
       ├─ Entitlement checks
       ├─ Release gate validation
       └─ Return ALLOW/DENY
  ↓
Authorized Operation
  ├─ URS: create/read/manage/approve
  ├─ Validation: read/review/run
  ├─ Data Products: view/create/govern
  └─ etc.
```

---

## KEY DESIGN PRINCIPLES

### 1. Domain Ownership

- **Domain plugins own their permissions**
  - URS Composer defines `urs.*`
  - Validation Expert defines `validation.*`
  - Data Products define `data-product.*`
  
- **Central aggregation only**
  - `packages/platform-common/src/permissions/` exports all permissions
  - Single source of truth, no duplication

### 2. RBAC as Policy Overlay

- **RBAC does NOT replace existing policy**
  - Wraps `PlatformPermissionPolicy`
  - Preserves entitlements and release gates
  - Backward compatible

- **Coexistence**
  - If RBAC rule exists → use it
  - Else → delegate to `PlatformPermissionPolicy`
  - Both layers active simultaneously

### 3. Group-Based Assignment

- **Catalog groups are the identity container**
  - No hardcoded users in application code
  - `catalog/org.yaml` is authoritative
  - RBAC assigns roles to groups

- **Example flow:**
  ```
  User schmeckm
    → member of group:default/urs-business-reviewers
    → group assigned role "URS Business Reviewer"
    → role grants urs.read + urs.approve
    → user can call /approve-step
  ```

### 4. Approval Role vs Workflow Eligibility

- **RBAC Gate**
  ```
  Does user have urs.approve permission?
  → Check RBAC role assignment
  → return ALLOW/DENY
  ```

- **Workflow Gate**
  ```
  Is user eligible for this SPECIFIC approval step?
  → Check URS approval workflow configuration
  → return eligible/ineligible
  ```

- **Both must pass:**
  ```
  RBAC: ✓ User has urs.approve
  Workflow: ✓ User eligible for QUALITY_REVIEWER step
  → Approval succeeds
  
  RBAC: ✓ User has urs.approve
  Workflow: ✗ User NOT eligible for BUSINESS_REVIEWER step
  → 403 Forbidden
  ```

---

## IMPLEMENTATION

### Phases

1. **Backend Registration** ✅
   - Add RBAC backend plugin to `packages/backend/src/index.ts`
   - Configure in `app-config.yaml`

2. **Frontend Integration** ✅
   - Add RBAC frontend plugin to `packages/app/src/App.tsx`
   - RBAC admin UI auto-available

3. **Catalog Groups** ✅
   - Define platform groups (`platform-admins`, etc.)
   - Define domain groups (`urs-authors`, `validation-reviewers`, etc.)
   - Update `catalog/org.yaml`

4. **Role Configuration** (via RBAC Admin UI)
   - Create roles (Platform Viewer, Platform Developer, etc.)
   - Create domain roles (URS Author, Quality Reviewer, etc.)
   - Assign roles to groups

5. **Permission Discovery**
   - RBAC UI discovers all custom permissions
   - Organized by domain

6. **Enforcement**
   - Domain plugins enforce permissions as before
   - RBAC policy wraps enforcement
   - Combined decision returned to plugin

---

## CONSEQUENCES

### ✅ Positive

- **Centralized administration**
  - Single place to manage roles and assignments
  - No per-plugin RBAC implementation needed

- **Consistent permission naming**
  - `<domain>.<action>` standard across all plugins
  - `urs.read`, `validation.review`, `data-product.create`

- **Audit trail**
  - All authorization decisions logged
  - Traceable to user, role, permission

- **Backward compatible**
  - Existing plugins work unchanged
  - Entitlements and release gates preserved
  - Gradual migration possible

- **Scalable**
  - New domains register permissions once
  - RBAC automatically makes available
  - No central config changes needed per domain

### ⚠️ Negative

- **RBAC configuration required**
  - Administrators must create roles and assignments
  - Not automatic with plugin installation

- **Dual-gate workflow**
  - RBAC role + Workflow eligibility both required
  - Developers must understand distinction

- **Plugin dependency**
  - Community RBAC plugin is external dependency
  - Version upgrades must be managed

---

## ALTERNATIVES CONSIDERED

### A1: No Central RBAC
- ❌ Each plugin implements own role system
- ❌ Inconsistent permission models
- ❌ Hard to assign cross-domain roles

### A2: Custom RBAC Engine
- ❌ Reimplements what Backstage Community RBAC provides
- ❌ Maintenance burden
- ❌ Duplicate permission definitions

### A3: Replace PlatformPermissionPolicy Entirely
- ❌ Breaks entitlements and release gates
- ❌ All permissions must be RBAC-configured
- ❌ No fallback for new plugins

---

## DECISION OUTCOME

**Chosen:** Option implemented above (RBAC wraps existing policy)

**Rationale:**
- ✅ Lowest risk (coexistence, no replacement)
- ✅ Preserves existing functionality
- ✅ Incremental adoption possible
- ✅ Supports future Golden Paths

---

## FUTURE EXTENSIONS

### Golden Path Authorization Profiles

Future Golden Paths (OEE, MQTT, Equipment Connectivity, etc.) may define **Authorization Profiles**:

```yaml
Kind: AuthorizationProfile
Domain: ods-oee
Permissions:
  - oee.read
  - oee.create
  - oee.manage
SuggestedRoles:
  - name: OEE Reader
    permissions: [oee.read]
  - name: OEE Author
    permissions: [oee.read, oee.create, oee.manage]
SuggestedGroups:
  - name: oee-authors
  - name: oee-reviewers
```

RBAC administrators will:
1. Review suggested permissions
2. Create roles based on suggestions
3. Assign users to groups
4. Activate the path

No changes to central RBAC architecture needed.

---

## REFERENCES

- **Backstage Permission Framework:** https://backstage.io/docs/permissions/
- **Backstage Community RBAC:** https://github.com/backstage-community/rbac
- **Installed Version:** `@backstage-community/plugin-rbac-backend@7.17.0`
- **Permissions:** `packages/platform-common/src/permissions.ts`
- **Configuration:** `docs/rbac/platform-roles.md`

---

**Decided By:** Architecture Review  
**Approved:** August 26, 2026  
**Implementation Status:** Phases 1-5 Complete | Phases 6+ Pending Verification
