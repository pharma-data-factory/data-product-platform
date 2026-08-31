# Backend Authorization via Backstage Permission Framework
**Status**: Design (leveraging existing Backstage integration)  
**Principle**: Use Backstage standard APIs, not custom solutions

---

## Current State: Backstage Permission Framework Already Integrated ✅

### What's Already In Place

```
✅ @backstage/plugin-permission-backend — Already deployed
✅ @backstage/plugin-permission-common — Permission definitions
✅ PermissionsService — Injected into backend plugins
✅ 31+ Platform Permissions defined — permissions.ts
✅ Role-based permission sets — VIEWER, DEVELOPER, OWNER, ADMIN
✅ Express middleware pattern — data-products-backend/router.ts
```

### Existing Code Example (data-products-backend/router.ts)

```typescript
// Get user credentials from request
const credentials = await httpAuth.credentials(req);

// Ask Backstage Permission Backend for decision
const [decision] = await permissions.authorize(
  [{ permission: dataProductViewPermission }],
  { credentials },
);

// Enforce decision
if (decision.result !== AuthorizeResult.ALLOW) {
  throw new NotAllowedError();
}
```

---

## Backstage Permission Framework Architecture

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│ User logs in (GitHub OAuth → Backstage Identity)         │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend API call with Authorization header              │
│ (Bearer token)                                            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────┐
│ Backend receives request                                 │
│ 1. Extract credentials from request                      │
│    const credentials = await httpAuth.credentials(req);  │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Query Permission Backend (Backstage)                  │
│    const [decision] = await permissions.authorize(       │
│      [{ permission: dataProductViewPermission }],        │
│      { credentials }                                     │
│    );                                                     │
└──────────────────┬───────────────────────────────────────┘
                   │
          ┌────────┴─────────┐
          ↓                  ↓
    ┌──────────────┐  ┌──────────────────┐
    │ ALLOW        │  │ DENY             │
    │ Proceed      │  │ 403 Forbidden    │
    └──────────────┘  └──────────────────┘
```

### Permission Backend Decision Logic

```typescript
// Simplified: How Backstage Permission Backend decides

function authorize(permissions, credentials) {
  const user = credentials.principal;  // GitHub user
  const groups = getGroupMemberships(user);  // From Backstage Catalog
  
  const role = resolvePlatformRole(groups);  // VIEWER | DEVELOPER | OWNER | ADMIN
  
  const userPermissions = ROLE_PERMISSIONS[role];
  
  return permissions.map(p => ({
    result: userPermissions.has(p.name) ? ALLOW : DENY,
  }));
}
```

---

## Current Implementation Status

### ✅ Already Done

| Component | Status | File | Notes |
|-----------|--------|------|-------|
| Permission definitions | ✅ Implemented | `packages/platform-common/src/permissions.ts` | 31+ permissions defined |
| Role hierarchy | ✅ Implemented | `packages/platform-common/src/roles.ts` | VIEWER < DEVELOPER < OWNER < ADMIN |
| Permission sets | ✅ Implemented | `packages/platform-common/src/permissions.ts` | VIEWER_PERMISSION_NAMES, DEVELOPER_PERMISSION_NAMES, etc. |
| Backstage backend integration | ✅ Deployed | `packages/backend/src/index.ts` | Permission-backend plugin added |
| Permission checks in data-products | ✅ Partial | `plugins/data-products-backend/src/router.ts` | Some routes protected (ci-status, certification) |
| Permission checks in model-company | ✅ Partial | `plugins/model-company-backend/src/router.ts` | Some routes protected |

### 🔲 Still Needed

| Task | Scope | Effort | Notes |
|------|-------|--------|-------|
| **Audit Logging** | Add logging of all authorization decisions | Medium | Currently only decision made, not logged |
| **Policy Backend** | Extend beyond role-based to fine-grained | Medium | Optional; role-based covers MVP |
| **Consistent Coverage** | Protect ALL backend routes with permissions | Medium-High | Some routes have checks, some don't |
| **Testing** | Unit + integration tests for authorization | Medium | New tests for permission scenarios |
| **Documentation** | "How to add permissions to a new route" | Low | Developer guide |

---

## How Backstage Permission Framework Works

### Three Components

#### 1. **Permission Definitions** (`permissions.ts`)
```typescript
export const dataProductCreatePermission = createPermission({
  name: 'data-product.create',
  attributes: { action: 'create' },  // Standardized: read, create, update, delete
});
```

#### 2. **Permission Backend** (`@backstage/plugin-permission-backend`)
- Central service that makes authorization decisions
- Consults policy file (or policy engine)
- Returns ALLOW / DENY for each permission

#### 3. **Backend Plugins** (Data Products, Model Company, etc.)
- Call `permissions.authorize([permission], credentials)`
- Enforce result before executing business logic

---

## Backstage Standard Approach: Role-Based Policy

### How Permissions Are Granted

Backstage uses a **policy file** (YAML) to define which roles get which permissions:

```yaml
# permissions-policy.yaml (conceptual)
apiVersion: backstage.io/v1beta1
kind: PermissionPolicy
metadata:
  name: platform-policy
rules:
  # VIEWER role
  - principal: role:default/VIEWER
    permissions:
      - data-product.view
      - marketplace.view
      - validation.read
      - aas.read
  
  # DEVELOPER role (inherits VIEWER)
  - principal: role:default/DEVELOPER
    permissions:
      - data-product.view
      - data-product.create
      - scaffolder.task.create
      - validation.run.start
  
  # OWNER role
  - principal: role:default/DATA_PRODUCT_OWNER
    permissions:
      - data-product.governance
      - data-product.certification.manage
      - validation.review
  
  # ADMIN role
  - principal: role:default/PLATFORM_ADMIN
    permissions:
      - platform.admin
      - template.admin
      - marketplace.admin
```

### Role Resolution (Already Working)

```typescript
// User logs in with GitHub
// Backstage reads their GitHub team memberships:
// @company/data-product-developers

// Maps to Backstage groups
// group:default/data-product-developers

// Backend resolves to PlatformRole
// role = DEVELOPER

// Permission Backend checks policy
// DEVELOPER has: data-product.create, data-product.view, etc.
```

---

## Phase 1: Extend Backstage Permission Framework (Recommended)

**Goal**: Use Backstage standard, no custom solutions

### 1.1 Audit Logging (New)
```typescript
// Add to router.ts middleware pattern

async function permissionCheck(req, res, next) {
  const credentials = await httpAuth.credentials(req);
  const [decision] = await permissions.authorize(
    [{ permission: somePermission }],
    { credentials },
  );
  
  // NEW: Log the decision
  auditLog.record({
    timestamp: new Date(),
    user: credentials.principal,
    permission: somePermission.name,
    resource: req.path,
    decision: decision.result,
    ipAddress: req.ip,
  });
  
  if (decision.result !== AuthorizeResult.ALLOW) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  
  next();
}
```

### 1.2 Comprehensive Route Coverage
```typescript
// Current: Some routes protected
router.post('/certification', protect(dataProductCertificationManagePermission));
router.get('/ci-status', protect(dataProductViewPermission));

// TODO: All routes should be protected
router.get('/products', protect(dataProductViewPermission));
router.post('/products', protect(dataProductCreatePermission));
router.get('/products/:id', protect(dataProductViewPermission));
router.delete('/products/:id', protect(dataProductAdminPermission));
// ... etc
```

### 1.3 Reusable Middleware
```typescript
// Create helper function (backstage standard pattern)

interface ProtectOptions {
  permissions: BasicPermission[];
  fallback?: (req, res) => void;
}

function backstagePermissionMiddleware(options: ProtectOptions) {
  return async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req);
      const decisions = await permissions.authorize(
        options.permissions.map(p => ({ permission: p })),
        { credentials },
      );
      
      const allowed = decisions.every(d => d.result === AuthorizeResult.ALLOW);
      
      if (!allowed) {
        if (options.fallback) {
          options.fallback(req, res);
        } else {
          res.status(403).json({ error: 'Insufficient permissions' });
        }
        return;
      }
      
      next();
    } catch (error) {
      logger.warn(`Permission check failed: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Usage
router.post(
  '/products',
  backstagePermissionMiddleware({ permissions: [dataProductCreatePermission] }),
  createProductHandler
);
```

### 1.4 Enhanced Role Definition
```typescript
// Extend roles.ts with Backstage standard references

export const BACKSTAGE_POLICY_ROLES = {
  VIEWER: 'role:default/VIEWER',
  DEVELOPER: 'role:default/DEVELOPER', 
  DATA_PRODUCT_OWNER: 'role:default/DATA_PRODUCT_OWNER',
  PLATFORM_ADMIN: 'role:default/PLATFORM_ADMIN',
};

// Map to Backstage principal format
export function toPrincipal(role: PlatformRole): string {
  return BACKSTAGE_POLICY_ROLES[role];
}
```

---

## Phase 2: Backstage Permission Policies (Optional)

If role-based isn't enough, Backstage supports **policy files**:

```yaml
# catalog-info.yaml for a Data Product

apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: temperature-data-product
  namespace: default
spec:
  type: data-product
  owner: group:default/data-product-owners
  
---
apiVersion: backstage.io/v1beta1
kind: PermissionPolicy
metadata:
  name: data-product-policy
  owner: group:default/platform-admins
spec:
  rules:
    # Only the owner can certify this product
    - principal: group:default/data-product-owners
      resource: component:default/temperature-data-product
      permission: data-product.certification.manage
      effect: allow
      
    # Only admins can delete
    - principal: role:default/PLATFORM_ADMIN
      resource: component:default/temperature-data-product
      permission: data-product.admin
      effect: allow
```

---

## Best Practices: Staying With Backstage Standard

### ✅ DO

- ✅ Use `PermissionsService` from Backstage
- ✅ Define permissions using `createPermission()`
- ✅ Leverage Backstage Policy Framework
- ✅ Use `HttpAuthService` for credential extraction
- ✅ Keep role definitions simple (RBAC)
- ✅ Follow Backstage middleware patterns
- ✅ Test with Backstage test utilities
- ✅ Document using Backstage conventions

### ❌ DON'T

- ❌ Create custom permission service
- ❌ Hardcode roles/permissions in code
- ❌ Bypass PermissionsService
- ❌ Store permissions in database (use policy files)
- ❌ Create custom authentication (use Backstage identity)
- ❌ Modify Backstage core code
- ❌ Create custom policy language (use Backstage's)

---

## Implementation Checklist for Phase 1

### Step 1: Create Permission Middleware Helper
- [ ] File: `packages/authorization-middleware/src/permission-middleware.ts`
- [ ] Export: `backstagePermissionMiddleware(options)`
- [ ] Include: Logging, error handling

### Step 2: Audit Logging
- [ ] Create audit logger service
- [ ] Log all authorization decisions
- [ ] Store in PostgreSQL or file-based
- [ ] Create audit dashboard endpoint

### Step 3: Protect All Routes
- [ ] Data Products backend (`plugins/data-products-backend`)
  - [ ] GET /products
  - [ ] POST /products
  - [ ] GET /products/:id
  - [ ] PATCH /products/:id
  - [ ] DELETE /products/:id
- [ ] Model Company backend (`plugins/model-company-backend`)
  - [ ] Protect all scenario endpoints
- [ ] Other backends as applicable

### Step 4: Testing
- [ ] Unit tests for permission middleware
- [ ] Integration tests: VIEWER cannot create
- [ ] Integration tests: DEVELOPER can create
- [ ] Integration tests: OWNER can certify
- [ ] Integration tests: ADMIN can delete

### Step 5: Documentation
- [ ] "How to add a new permission"
- [ ] "How to protect a new route"
- [ ] "How permissions are resolved"
- [ ] "Troubleshooting permission errors"

---

## Timeline & Effort

| Phase | Task | Timeline | Effort |
|-------|------|----------|--------|
| **1a** | Create permission middleware | 1 week | Low |
| **1b** | Add audit logging | 1 week | Low |
| **1c** | Protect all routes | 2 weeks | Medium |
| **1d** | Testing + documentation | 1 week | Low |
| **TOTAL PHASE 1** | Extend Backstage standard | **5 weeks** | **Medium** |

---

## Reference: Backstage Documentation

- Permission Framework: https://backstage.io/docs/permissions/overview
- Backend Plugins: https://backstage.io/docs/backend-system
- Policy Files: https://backstage.io/docs/permissions/custom-rules
- HttpAuthService: https://backstage.io/docs/backend-system/core-services/http-auth

---

## Why This Approach

### ✅ Stays With Backstage Standard
- No custom authorization logic
- Uses official Backstage APIs
- Easier to upgrade Backstage
- Community support available

### ✅ Simple & Maintainable
- Role-based (RBAC) covers MVP needs
- No additional infrastructure (policy engine)
- Leverages existing permission definitions
- Clear patterns for future developers

### ✅ Extensible
- Can add fine-grained rules later (via policy files)
- Can support multiple role sources (OIDC, SAML)
- Audit trail built in
- No breaking changes

### ✅ Production-Ready
- Backstage Permission Backend battle-tested
- Used by hundreds of Backstage deployments
- Regular updates & security patches
- Community contributes features

---

## Recommendation

**Use Backstage Permission Framework as-is** (Phase 1 approach):

1. ✅ Extend existing middleware pattern
2. ✅ Add audit logging (currently missing)
3. ✅ Protect all backend routes
4. ✅ Add tests + documentation

**This is:**
- ✅ Backstage standard
- ✅ Simple to implement (~5 weeks)
- ✅ Maintainable
- ✅ Production-ready
- ✅ Extensible for future needs

**Do NOT:**
- ❌ Build custom permission service
- ❌ Implement custom policy engine (yet)
- ❌ Deviate from Backstage patterns

---

## Next Steps

1. **Review** this plan with team
2. **Confirm** Phase 1 scope (5 weeks, Medium effort)
3. **Create** implementation tickets
4. **Start** with middleware helper (1 week)
5. **Iterate** on route protection
6. **Deploy** with confidence (using Backstage standard)

