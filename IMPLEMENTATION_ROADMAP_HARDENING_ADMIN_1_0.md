# Pharma Data Factory — Access Hardening & Admin UX Implementation Roadmap 1.0

**Status**: Ready for Implementation  
**Mode**: Execution (from BACKSTAGE_ACCESS_AUDIT_1_0.md)  
**Target**: P0 + P1 completion in 4-6 weeks  

---

## CRITICAL FINDING: validation-manager-backend

### Current State (UNACCEPTABLE)

The validation-manager-backend uses **custom authorization**:
```typescript
const userRole = req.headers['x-user-role'] as string || 'DEVELOPER';
const userId = req.headers['x-user-id'] as string || 'system-user';
```

**Problems**:
- ❌ Ignores Backstage Permission Framework entirely
- ❌ Uses client-supplied headers (security risk)
- ❌ Hardcoded role check: `if (!['QA_LEAD', 'PLATFORM_ADMIN'].includes(userRole))`
- ❌ No Backstage credentials validation
- ❌ Approval endpoints (/approve, /sign, /admin/dashboard) completely unprotected
- ❌ Cannot support identity provider switching

**This is the P0 blocker that must be fixed first.**

---

## IMPLEMENTATION PHASES

### PHASE 1: P0 BACKEND HARDENING (Weeks 1-2)

**Goal**: Close all authorization gaps using Backstage Permission Framework

#### 1.1 validation-manager Backend Refactoring

**Files to modify**:
```
plugins/validation-manager/backend/src/router.ts (210 lines)
plugins/validation-manager/backend/src/middleware.ts (NEW)
packages/platform-common/src/permissions.ts (may add validation-specific if needed)
packages/backend/src/permission/policy.ts (may extend logic)
```

**Changes required**:

1. **Remove custom auth middleware** (lines 19-28):
   - Delete `authenticateUser` middleware
   - Delete `req.body._user` pattern
   - Replace with Backstage HttpAuthService

2. **Add Backstage permission checks** to all privileged routes:
   ```typescript
   // OLD (BROKEN):
   router.post('/requirements/:id/approve', (req: Request, res: Response) => {
     const userRole = req.body._user.role;
     if (!['QA_LEAD', 'PLATFORM_ADMIN'].includes(userRole)) {
       return res.status(403).json({ error: '...' });
     }
   });

   // NEW (BACKSTAGE):
   router.post('/requirements/:id/approve', async (req: Request, res: Response) => {
     try {
       const credentials = await httpAuth.credentials(req, { allow: ['user'] });
       const [decision] = await permissions.authorize(
         [{ permission: validationReviewPermission }],
         { credentials },
       );
       if (decision.result !== AuthorizeResult.ALLOW) {
         throw new NotAllowedError('validation.review required');
       }
       // Proceed with approval logic
     } catch (error) {
       res.status(403).json({ error: 'Insufficient permissions' });
     }
   });
   ```

3. **Use existing permissions** where appropriate:
   - `validationReadPermission` — read requirements
   - `validationRunStartPermission` — start validation
   - `validationReviewPermission` — review/approve findings

4. **Define new minimal permission set** if needed:
   ```typescript
   // In packages/platform-common/src/permissions.ts
   
   export const validationRequirementManagePermission = createPermission({
     name: 'validation.requirement.manage',
     attributes: { action: 'update' },
   });
   
   // Assign to: OWNER, ADMIN (not DEVELOPER alone)
   // In packages/platform-common/src/permissions.ts permission sets
   ```

#### 1.2 Plugin-Directory Backend Audit

**File**: `plugins/plugin-directory-backend/src/router.ts`

**Status**: Unknown from audit. Need to verify:
- Are all privileged routes protected?
- Do they use Backstage Permission Framework?

**Action**:
- [ ] Read router.ts
- [ ] Identify unprotected routes
- [ ] Add Backstage permission checks

#### 1.3 Marketplace Backend Audit

**File**: `plugins/marketplace-backend/src/router.ts` (if exists)

**Action**:
- [ ] Locate marketplace backend
- [ ] Verify marketplace admin routes are protected
- [ ] Ensure consistent pattern

#### 1.4 Complete Route Protection Matrix

| Plugin | Route | Method | Permission | Status | P0 Action |
|--------|-------|--------|-----------|--------|-----------|
| validation-manager | /requirements | GET | validationRead | ❌ CUSTOM | Add Backstage check |
| validation-manager | /requirements | POST | validation.requirement.manage | ❌ CUSTOM | Add Backstage check |
| validation-manager | /requirements/:id/approve | POST | validationReview | ❌ NONE | **ADD** Backstage check |
| validation-manager | /requirements/:id/sign | POST | validationReview | ❌ NONE | **ADD** Backstage check |
| validation-manager | /admin/dashboard | GET | validationAdmin | ❌ NONE | **ADD** Backstage check |
| validation-expert | /requirements | GET | validationRead | ✅ PROTECTED | Verify |
| validation-expert | /runs | POST | validationRunStart | ✅ PROTECTED | Verify |
| data-products | /ci-status | GET | data-product.view | ✅ PROTECTED | Verify |
| data-products | /certification | POST | data-product.certification.manage | ✅ PROTECTED | Verify |
| model-company | /overview | GET | modelCompanyRead | ✅ PROTECTED | Verify |
| model-company | /simulation/* | POST | modelCompanyControl | ✅ PROTECTED | Verify |
| entitlements | /entitlements | GET | entitlementView | ✅ PROTECTED | Verify |
| entitlements | /admin/* | POST | entitlementAdmin | ✅ PROTECTED | Verify |

---

### PHASE 2: ADMIN ACCESS UX (Weeks 3-4)

**Goal**: Build thin Admin visibility layer (no new auth engine)

#### 2.1 Admin Access Page Structure

```
/admin/access

├─ Navigation (reuse existing admin nav)
│  └─ Access & Identities
│
├─ Main page: /admin/access/
│  ├─ Hero section
│  │  └─ "Manage and understand platform access using Backstage identity,
│  │     Catalog groups and the Permission Framework."
│  ├─ Architecture visual (identity → Backstage → policy → access)
│  └─ Quick stats
│     ├─ Active users
│     ├─ Groups
│     └─ Roles
│
├─ Users: /admin/access/users
│  ├─ List view (table/cards)
│  │  └─ Name | Identity | Groups | Role | Last Active
│  └─ Detail page: /admin/access/users/:userId
│     ├─ Identity section
│     ├─ Groups section
│     ├─ Role section
│     └─ Effective Access section
│
├─ Groups: /admin/access/groups
│  ├─ List view
│  │  └─ Name | Members | Assigned Role | Purpose
│  └─ Detail page: /admin/access/groups/:groupId
│     ├─ Members list
│     └─ Capabilities
│
└─ Roles: /admin/access/roles
   ├─ Viewer
   ├─ Developer
   ├─ Data Product Owner
   └─ Platform Admin
```

#### 2.2 Users Page (admin/access/users)

**Frontend Component**: `packages/app/src/modules/admin/AccessUsersPage.tsx`

```typescript
// Pseudocode structure
export function AccessUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch from Catalog API
    catalogApi.getUsers().then(users => {
      // Enrich with role + effective access info
      const enriched = users.map(user => ({
        ...user,
        role: deriveRoleFromGroups(user.memberOf),
        effectiveCapabilities: deriveEffectiveAccess(user),
      }));
      setUsers(enriched);
      setLoading(false);
    });
  }, []);
  
  return (
    <AdminPage>
      <Hero title="Users & Access" />
      <UserTable users={users} />
    </AdminPage>
  );
}
```

**Data source**: Backstage Catalog API (read-only, no new database)

**Columns**:
- Name (from catalog metadata)
- Backstage Identity (user:default/...)
- Groups (memberOf)
- Platform Role (derived from groups)
- Effective Capabilities (count of allowed actions)

#### 2.3 User Detail Page (admin/access/users/:userId)

**Component**: `packages/app/src/modules/admin/AccessUserDetailPage.tsx`

**Sections**:

1. **Identity**
   - Backstage user entity ref
   - Identity provider (GitHub / Entra / etc., if known)
   - Last active

2. **Groups**
   - List of Backstage groups
   - Mapped roles for each

3. **Platform Role**
   - Derived role (VIEWER / DEVELOPER / OWNER / ADMIN)
   - Source (e.g., "from group: data-product-developers")

4. **Effective Access**
   - Derived, not stored
   - Show allowed capabilities:
     ```
     Browse Platform                ✅ ALLOWED
     Create Data Product            ✅ ALLOWED
     Manage Golden Paths            ❌ DENIED
     ```
   - Click capability → show why

#### 2.4 Groups Page (admin/access/groups)

**Component**: `packages/app/src/modules/admin/AccessGroupsPage.tsx`

**Data source**: Backstage Catalog Groups (read-only)

**Columns**:
- Group name (metadata.name)
- Members count
- Mapped role(s)
- Purpose (from description)

#### 2.5 Roles Page (admin/access/roles)

**Component**: `packages/app/src/modules/admin/AccessRolesPage.tsx`

**Display for each role**:

```
DEVELOPER

Capabilities (10 permissions):
├─ Browse Catalog ✓
├─ Create Data Product ✓
├─ Use Composer ✓
├─ Run Validation ✓
├─ ...
└─ Manage Platform ✗

Users in this role: 7

Groups that provide this role:
├─ data-product-developers
└─ (future: custom groups)
```

---

### PHASE 3: SUPPORTING INFRASTRUCTURE (Week 5)

#### 3.1 Effective Access Derivation Service

**File**: `packages/platform-common/src/effective-access.ts` (NEW)

```typescript
export interface EffectiveAccess {
  capability: string;
  allowed: boolean;
  reason?: string;
}

export function deriveEffectiveAccess(
  user: CatalogUser,
  resourceRef?: string,
): EffectiveAccess[] {
  const groups = user.memberOf || [];
  const role = resolvePlatformRole(
    groups.map(g => `group:default/${g}`),
  );
  
  const permissions = permissionsForRole(role);
  
  return CAPABILITIES.map(cap => ({
    capability: cap.name,
    allowed: permissions.has(cap.permission),
    reason: cap.reason,
  }));
}
```

**Key principle**: Derived at request time, NOT persisted. NO second permission model.

#### 3.2 Architecture Visual Component

**File**: `packages/app/src/modules/admin/ArchitectureVisual.tsx` (NEW)

Use SVG/CSS (no new graphics library):

```
 GitHub    Entra    Okta
    \       |       /
     └─────┬─────┘
           ↓
  ┌────────────────────┐
  │ BACKSTAGE          │
  │ • Identity         │
  │ • Catalog Users    │
  │ • Catalog Groups   │
  │ • Permission FW    │
  └────────┬───────────┘
           ↓
  ┌────────────────────┐
  │ PHARMA POLICY      │
  │ • Roles            │
  │ • Responsibilities │
  │ • Entitlements     │
  └────────┬───────────┘
           ↓
     EFFECTIVE ACCESS
           ↓
    PLATFORM ACTIONS
```

Reuse:
- Navy/teal colors
- Space Grotesk font
- Existing icon set
- Card styling

#### 3.3 Audit Logging (Optional P2)

**File**: `packages/backend/src/permission/audit.ts` (NEW)

```typescript
export interface AuthorizationEvent {
  timestamp: Date;
  actor: string;
  action: string;
  resource?: string;
  permission: string;
  decision: 'ALLOW' | 'DENY';
  reason?: string;
}

export function logAuthorizationDecision(event: AuthorizationEvent) {
  // Log to console/database
  // NEVER log passwords, tokens, secrets
}
```

Usage:
```typescript
// In PlatformPermissionPolicy.handle()
logAuthorizationDecision({
  timestamp: new Date(),
  actor: user?.info.userEntityRef || 'unauthenticated',
  action: request.permission.name,
  decision: allowed ? 'ALLOW' : 'DENY',
  reason: decisionReason,
});
```

---

### PHASE 4: TESTS (Week 5-6)

#### 4.1 Authorization Tests

```typescript
describe('Authorization: Validation Manager (Backstage-native)', () => {
  describe('POST /requirements/:id/approve', () => {
    it('VIEWER denied', async () => {
      const res = await app
        .post('/validation-manager/requirements/req-1/approve')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ comment: 'approved' });
      expect(res.status).toBe(403);
    });
    
    it('OWNER allowed', async () => {
      const res = await app
        .post('/validation-manager/requirements/req-1/approve')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ comment: 'approved' });
      expect(res.status).toBe(200);
    });
  });
});
```

#### 4.2 Admin UI Tests

```typescript
describe('Admin Access Pages', () => {
  it('DEVELOPER cannot access', async () => {
    render(<AccessUsersPage />, { role: 'DEVELOPER' });
    expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
  });
  
  it('ADMIN can view users', async () => {
    render(<AccessUsersPage />, { role: 'PLATFORM_ADMIN' });
    expect(screen.getByText(/users/i)).toBeInTheDocument();
  });
});
```

#### 4.3 Effective Access Tests

```typescript
describe('Effective Access Derivation', () => {
  it('DEVELOPER has create permission', () => {
    const access = deriveEffectiveAccess(devUser);
    expect(access).toContain({
      capability: 'Create Data Product',
      allowed: true,
    });
  });
  
  it('VIEWER does not have create', () => {
    const access = deriveEffectiveAccess(viewerUser);
    expect(access).toContain({
      capability: 'Create Data Product',
      allowed: false,
    });
  });
});
```

---

## FILES TO CREATE/MODIFY

### CREATE (New Files)

```
packages/app/src/modules/admin/AccessPage.tsx
packages/app/src/modules/admin/AccessUsersPage.tsx
packages/app/src/modules/admin/AccessUserDetailPage.tsx
packages/app/src/modules/admin/AccessGroupsPage.tsx
packages/app/src/modules/admin/AccessRolesPage.tsx
packages/app/src/modules/admin/ArchitectureVisual.tsx
packages/app/src/modules/admin/index.tsx (module entry)

packages/platform-common/src/effective-access.ts
packages/platform-common/src/capabilities.ts (if needed)

packages/backend/src/permission/audit.ts (optional)

plugins/validation-manager/backend/src/middleware.ts (new auth)
```

### MODIFY (Existing Files)

```
plugins/validation-manager/backend/src/router.ts
  - Remove custom auth (lines 19-28)
  - Add Backstage permission checks to all routes

packages/platform-common/src/permissions.ts
  - Add validation-specific permissions if needed

packages/platform-common/src/policy.ts
  - Extend permission logic if validation needs special handling

packages/backend/src/permission/policy.ts
  - Add audit logging (optional)

packages/app/src/modules/nav/Sidebar.tsx or AdminNav
  - Add /admin/access navigation link

packages/app/src/App.tsx (if new module)
  - Import admin module

packages/app/package.json (if new dependencies)
  - Unlikely; reuse existing material-ui, icons, etc.
```

---

## VALIDATION-MANAGER PERMISSION MODEL

### Proposed

Use minimal, coherent set. Integrate with existing permissions where possible.

```
validationRead                 [existing] ← can view findings, evidence
validationRunStart             [existing] ← can start validation run  
validationTestExecute          [existing] ← can execute tests
validationReview               [existing] ← can review findings + APPROVE

Needed:
validationRequirementManage    [NEW]      ← can create/edit requirements
```

### Role Assignment

| Permission | VIEWER | DEVELOPER | OWNER | ADMIN |
|-----------|--------|-----------|-------|-------|
| validationRead | ✅ | ✅ | ✅ | ✅ |
| validationRunStart | ❌ | ✅ | ✅ | ✅ |
| validationTestExecute | ❌ | ✅ | ✅ | ✅ |
| validationReview | ❌ | ❌ | ✅ | ✅ |
| validationRequirementManage | ❌ | ❌ | ✅ | ✅ |

---

## REGRESSION PROTECTION

**MUST NOT CHANGE**:
- Wave 1 component APIs
- OEE runtime behavior
- MQTT Temperature contracts
- REST Equipment runtime
- Golden Path certification semantics
- Validation status meanings (NOT_VALIDATED, CERTIFIED, etc.)
- Entitlement commercial semantics
- Backstage core integration patterns

**VERIFY**:
- `yarn tsc` (no new TypeScript errors)
- `yarn test` (all existing tests pass)
- Wave 1 Golden Paths still generate/work
- Scaffolder can execute templates
- Model Company simulation still runs
- Marketplace still lists products

---

## DELIVERABLES CHECKLIST

- [ ] P0 validation-manager backend refactored to Backstage
- [ ] All backend routes audit complete
- [ ] Route protection matrix generated
- [ ] Admin Access /users page
- [ ] Admin Access /users/:id detail page
- [ ] Admin Access /groups page
- [ ] Admin Access /roles page
- [ ] Architecture visual
- [ ] Effective access derivation service
- [ ] Authorization tests
- [ ] Admin UI tests
- [ ] Regression tests pass
- [ ] No TypeScript errors
- [ ] No new dependencies added (reuse existing)
- [ ] Documentation updated

---

## NEXT STEP

**User confirms**:
1. ✅ Implementation approach is correct
2. ✅ Priority order (validation-manager first)
3. ✅ Admin UX location and structure

**Then**: Begin Phase 1 implementation

---

## ESTIMATES

| Phase | Effort | Timeline |
|-------|--------|----------|
| P1: Backend Hardening | 1-2 weeks | Week 1-2 |
| P2: Admin UX | 2-3 weeks | Week 3-4 |
| P3: Supporting Code | 1 week | Week 5 |
| P4: Tests + Regression | 1 week | Week 5-6 |
| **TOTAL** | **5-7 weeks** | **~6 weeks** |

---

**Status**: Ready for implementation

**Awaiting**: User confirmation to proceed with Phase 1

