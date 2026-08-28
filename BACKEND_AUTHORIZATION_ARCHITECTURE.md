# Backend Authorization & Role Architecture Plan
**Status**: Design Phase  
**Objective**: Define how roles & permissions are enforced at the backend level

---

## Current State (Frontend Only)

### Existing Role System
```typescript
// roles.ts
PlatformRole = 'VIEWER' | 'DEVELOPER' | 'DATA_PRODUCT_OWNER' | 'PLATFORM_ADMIN'
PlatformGroup = 'platform-viewers' | 'data-product-developers' | 'data-product-owners' | 'platform-admins'

// Resolution Flow
GitHub User → Backstage Identity (ownershipEntityRefs) 
  → Platform Groups (group:default/platform-viewers, etc.)
  → PlatformRole (VIEWER, DEVELOPER, etc.)
```

### Current Usage
- **Frontend only**: `resolvePlatformRole()` used in React components
- **No backend enforcement**: Permissions are advisory, not enforced
- **Group mapping**: GitHub team membership → Backstage group entity → Platform role

### Existing Permission System
- 31+ fine-grained permissions defined (`permissions.ts`)
- 4 permission sets: VIEWER, DEVELOPER, OWNER, ADMIN
- Backstage Permission Framework ready but not fully enforced

---

## Question: Authorization Methods

### Option A: GitHub Teams (Current Foundation)
**How it works**:
1. User logs into Backstage with GitHub OAuth
2. Backstage fetches user's GitHub team memberships
3. Teams are mapped to Backstage groups (e.g., `data-product-developers`)
4. Backend services read user's Backstage identity + groups
5. Backend enforces permissions based on group membership

**Pros**:
- ✅ Already integrated (GitHub OAuth)
- ✅ Centralized user management (GitHub organization)
- ✅ No additional IdP needed
- ✅ Team changes auto-sync (if Backstage integration is live)

**Cons**:
- ❌ Tight coupling to GitHub
- ❌ Team name → Role mapping is rigid
- ❌ No fine-grained per-resource permissions
- ❌ Requires GitHub org membership

**Implementation Effort**: **LOW** (existing, just add backend checks)

---

### Option B: OIDC/OAuth2 with Claims (Flexible IdP)
**How it works**:
1. User authenticates via OIDC provider (Azure AD, Keycloak, Okta, Auth0, etc.)
2. OIDC tokens include role claims (JWT payload)
3. Backend extracts roles from token claims
4. Backend enforces based on claims

**Example JWT Token**:
```json
{
  "sub": "user123",
  "email": "alice@company.com",
  "groups": ["platform-developers", "team-ops"],
  "roles": ["DEVELOPER", "DATA_PRODUCT_OWNER"],
  "iat": 1692864000,
  "exp": 1692950400
}
```

**Pros**:
- ✅ Works with any OIDC provider (not GitHub-specific)
- ✅ Role claims portable across systems
- ✅ Can be source-of-truth for roles
- ✅ Flexible group structure (claims → roles mapping)
- ✅ Token-based (stateless on backend)

**Cons**:
- ⚠️ Requires OIDC provider setup/integration
- ⚠️ Token refresh management needed
- ⚠️ Role changes only visible after token refresh (max latency = token TTL)
- ⚠️ More complex setup than GitHub-only

**Implementation Effort**: **MEDIUM**

---

### Option C: Backend Authorization Service (Fine-Grained)
**How it works**:
1. Requests include user identity (from OAuth token)
2. Backend service calls Authorization Service with: `(user, resource, action)`
3. Authorization Service queries permission database:
   - User roles
   - Resource ownership
   - Custom policies
   - Audit log
4. Returns decision: ALLOW / DENY

**Example Policy Engine**:
```yaml
policies:
  - resource: "data-product:*"
    action: "view"
    principal: "role:VIEWER"
    effect: "allow"
  
  - resource: "data-product:*"
    action: "create"
    principal: "role:DEVELOPER"
    effect: "allow"
  
  - resource: "data-product:${owner}"
    action: "certify"
    principal: "role:DATA_PRODUCT_OWNER"
    effect: "allow"
    condition: "owner == user.id"  # Owner of product can certify
```

**Pros**:
- ✅ Fine-grained per-resource permissions
- ✅ Dynamic policies (can change without redeploying)
- ✅ Audit trail built-in
- ✅ Resource ownership awareness
- ✅ Conditional logic (if user == owner → allow)

**Cons**:
- ❌ Most complex (requires policy service)
- ❌ Additional service to maintain
- ❌ Performance: every request needs policy check
- ❌ Policy language learning curve

**Implementation Effort**: **HIGH**

---

### Option D: Hybrid (Recommended for Phase 2+)
**GitHub Teams** (current) + **OIDC** (fallback) + **Policy Service** (future)

**Phase 1 (Now)**:
- Use GitHub Teams → Platform Groups mapping (simple)
- Add backend permission checks (medium effort)
- All decisions based on role hierarchy (VIEWER < DEVELOPER < OWNER < ADMIN)

**Phase 2 (Future)**:
- Add OIDC option for enterprise customers
- Map OIDC claims to Platform Groups
- Keep GitHub Teams as default for pilot

**Phase 3+ (Later)**:
- Add fine-grained Authorization Service
- Support resource-level permissions
- Custom policy expressions

---

## Recommended Implementation Approach

### Scope: **Backend Role Enforcement (GitHub-based)**

**Start with**: Use existing GitHub team → role mapping, add backend checks.

---

## Architecture Design: Backend Authorization Layer

### Layer 1: Identity Propagation
```
┌─────────────────────────────────────────────────────┐
│ Frontend (React)                                    │
│ - User logs in with GitHub OAuth                    │
│ - Backstage Identity API resolves role              │
│ - Include role in API request headers               │
└────────────────────┬────────────────────────────────┘
                     │
                  Headers:
                  X-User-Id: alice@github
                  X-User-Groups: data-product-developers,data-product-owners
                  Authorization: Bearer {backstage-token}
                     │
┌────────────────────▼────────────────────────────────┐
│ Backend (Node.js / FastAPI services)                │
│ - Extract user identity from header/JWT             │
│ - Extract platform groups from identity             │
│ - Resolve PlatformRole locally                      │
└─────────────────────────────────────────────────────┘
```

### Layer 2: Permission Checking

```typescript
// middleware.ts
async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  const groups = req.headers['x-user-groups']?.split(',') || [];
  
  const role = resolvePlatformRole(
    groups.map(g => `group:default/${g}`)
  );
  
  req.user = { userId, role, groups };
  next();
}

// route handler
async function createDataProduct(req, res) {
  // Check permission
  if (!hasPermission(req.user.role, 'data-product.create')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Proceed with business logic
  const product = await dataProductService.create(req.body);
  res.json(product);
}
```

### Layer 3: Fine-Grained Checks (Phase 2+)

```typescript
// Future: Resource ownership checks
async function certifyDataProduct(req, res) {
  const productId = req.params.id;
  const product = await dataProductService.get(productId);
  
  // Only DATA_PRODUCT_OWNER of THIS product can certify
  if (req.user.role !== 'DATA_PRODUCT_OWNER') {
    return res.status(403).json({ error: 'Must be Data Product Owner' });
  }
  
  // Check if user is owner of this specific product
  if (!product.owners.includes(req.user.userId)) {
    return res.status(403).json({ error: 'Must be owner of this product' });
  }
  
  // Proceed
  await product.certify();
  res.json(product);
}
```

---

## Implementation Plan

### Phase 1: Basic Backend Role Enforcement
**Timeline**: 2-4 weeks  
**Effort**: Medium

#### 1.1 Backstage → Backend Identity Flow
- [ ] Define identity propagation (headers vs. JWT)
- [ ] Backend extracts user info from request
- [ ] Backend resolves PlatformRole locally
- [ ] Create middleware/decorator pattern

#### 1.2 Permission Middleware
- [ ] Create `@RequirePermission()` decorator
- [ ] Create permission check middleware
- [ ] Define permission enforcement rules
- [ ] Add error handling (403 Forbidden)

#### 1.3 Role-Based Access Control (RBAC)
- [ ] Marketplace: Enforce `marketplace.view`, `marketplace.admin`
- [ ] Data Products: Enforce `data-product.create`, `data-product.view`, etc.
- [ ] Validation Expert: Enforce `validation.read`, `validation.admin`, etc.
- [ ] Component Library: Enforce component management permissions

#### 1.4 Audit Logging
- [ ] Log authorization decisions (success + failures)
- [ ] Include: user, role, resource, action, result
- [ ] Create audit dashboard

**Files to Create/Modify**:
```
packages/
├── authorization-middleware/
│   ├── src/
│   │   ├── index.ts
│   │   ├── decorators.ts           # @RequirePermission(), @RequireRole()
│   │   ├── middleware.ts           # Express/FastAPI middleware
│   │   ├── policy-engine.ts        # Decision logic
│   │   └── audit.ts               # Audit logging
│   └── __tests__/
│       ├── decorators.test.ts
│       ├── middleware.test.ts
│       └── policy-engine.test.ts
├── data-products-backend/
│   ├── src/
│   │   ├── middleware.ts           # Apply auth middleware
│   │   └── routes/
│   │       ├── create.ts           # POST /data-products (requires DEVELOPER)
│   │       ├── read.ts             # GET /data-products (requires VIEWER)
│   │       └── certify.ts          # POST /data-products/:id/certify (requires OWNER)
│   └── __tests__/
│       └── authorization.test.ts
└── [other-services-backend]/
    └── Apply same pattern
```

---

### Phase 2: Alternative AuthN/AuthZ Methods
**Timeline**: 4-8 weeks (if needed)  
**Effort**: High

#### 2.1 OIDC Support
- [ ] Add OIDC provider integration
- [ ] Support multiple OIDC providers (Azure AD, Keycloak, etc.)
- [ ] Map OIDC claims to Platform groups
- [ ] Token validation & caching

#### 2.2 Service-to-Service Auth
- [ ] mTLS or API keys for backend services
- [ ] Service account roles (e.g., `service:data-product-processor`)
- [ ] System-level permissions

---

### Phase 3: Fine-Grained Authorization
**Timeline**: 6-10 weeks (future)  
**Effort**: High

#### 3.1 Policy Service
- [ ] Deploy dedicated policy service
- [ ] Policy language (OPA / Cedar / custom)
- [ ] Policy versioning & audit trail
- [ ] Policy testing framework

#### 3.2 Resource-Level Permissions
- [ ] Per-resource ownership
- [ ] Data Product owners can manage their products
- [ ] Component creators can release components
- [ ] Team-based access control

---

## Backend Authorization Decision Tree

```
Request arrives at backend
  │
  ├─→ Extract user identity
  │   ├─ From Authorization header (JWT)
  │   └─ From X-User-* headers
  │
  ├─→ Resolve PlatformRole
  │   ├─ GitHub teams → Backstage groups
  │   └─ Backstage groups → PlatformRole
  │
  ├─→ Check Route Permissions
  │   ├─ POST /data-products → requires data-product.create
  │   ├─ GET /data-products → requires data-product.view
  │   └─ POST /data-products/:id/certify → requires data-product.certification.manage
  │
  ├─→ Check Resource Ownership (Phase 2+)
  │   ├─ Is user owner of this resource?
  │   └─ Is user member of allowed team?
  │
  ├─→ Decision
  │   ├─ ✅ ALLOW → Execute business logic
  │   └─ ❌ DENY → Return 403 Forbidden + audit log
```

---

## GitHub Team Mapping (Phase 1)

### Current Groups in Backstage

```yaml
Groups:
  - name: platform-viewers
    members:
      - github-team: @company/pharma-factory-viewers
    platform-role: VIEWER
  
  - name: data-product-developers
    members:
      - github-team: @company/pharma-factory-developers
    platform-role: DEVELOPER
  
  - name: data-product-owners
    members:
      - github-team: @company/data-product-owners
    platform-role: DATA_PRODUCT_OWNER
  
  - name: platform-admins
    members:
      - github-team: @company/platform-admins
    platform-role: PLATFORM_ADMIN
```

### Backend Enforcement (Phase 1)

```typescript
// Role-based permissions
const ROLE_PERMISSIONS: Record<PlatformRole, Set<string>> = {
  VIEWER: new Set([
    'data-product.view',
    'marketplace.view',
    'validation.read',
    'aas.read',
  ]),
  DEVELOPER: new Set([
    ...VIEWER_PERMISSIONS,
    'data-product.create',
    'scaffolder.task.create',
    'validation.run.start',
  ]),
  DATA_PRODUCT_OWNER: new Set([
    ...DEVELOPER_PERMISSIONS,
    'data-product.governance',
    'data-product.certification.manage',
    'validation.review',
  ]),
  PLATFORM_ADMIN: new Set([
    ...OWNER_PERMISSIONS,
    'platform.admin',
    'template.admin',
    'marketplace.admin',
    'validation.admin',
  ]),
};

// Middleware
function requirePermission(permission: string) {
  return async (req, res, next) => {
    const role = req.user.role;
    const permissions = ROLE_PERMISSIONS[role];
    
    if (!permissions.has(permission)) {
      return res.status(403).json({
        error: `User with role ${role} does not have permission: ${permission}`,
      });
    }
    
    next();
  };
}
```

---

## OIDC Option (Phase 2)

### If Switching to Enterprise OIDC Provider

```typescript
// OIDC Token Claims
{
  "sub": "alice@company.com",
  "groups": ["pharma-factory-developers", "team-analytics"],
  "roles": ["DEVELOPER", "DATA_PRODUCT_OWNER"],
  "permissions": ["data-product.create", "data-product.governance"],
}

// Backend can validate:
// 1. Token signature (verify with OIDC provider's public key)
// 2. Token expiration (exp claim)
// 3. Extract groups/roles from claims
// 4. Map to backend permissions
```

### OIDC + GitHub Hybrid

```typescript
// Support both
if (req.token.issuer === 'github.com') {
  // GitHub OAuth flow
  role = await resolveGitHubTeamsRole(req.user);
} else if (req.token.issuer === 'oidc.company.com') {
  // OIDC flow
  role = req.token.claims.roles[0];  // From OIDC token
}
```

---

## Security Considerations

### 1. Token Handling
- ✅ Always validate token signature
- ✅ Check token expiration
- ✅ Use HTTPS for all requests
- ✅ Cache token validation results (short TTL)

### 2. Audit Trail
- ✅ Log all authorization decisions
- ✅ Include: timestamp, user, role, resource, action, decision, reason
- ✅ Protect audit logs from tampering
- ✅ Never log sensitive data (passwords, keys)

### 3. Default Deny
- ✅ Deny by default (whitelist approach)
- ✅ Explicitly grant permissions
- ✅ Avoid role escalation

### 4. Service-to-Service
- ✅ Use mTLS or API keys
- ✅ Separate service credentials from user credentials
- ✅ Short-lived tokens for services

---

## Testing Strategy

### Unit Tests
```typescript
// Permission checks
test('VIEWER cannot create data products', async () => {
  const viewer = { role: 'VIEWER' };
  expect(hasPermission(viewer, 'data-product.create')).toBe(false);
});

test('DEVELOPER can create data products', async () => {
  const dev = { role: 'DEVELOPER' };
  expect(hasPermission(dev, 'data-product.create')).toBe(true);
});
```

### Integration Tests
```typescript
// Full flow: GitHub OAuth → Role Resolution → API Call
test('GitHub developer can create data product', async () => {
  const response = await app
    .post('/data-products')
    .set('Authorization', `Bearer ${devToken}`)
    .send({ name: 'MyProduct' });
  
  expect(response.status).toBe(201);
});

test('GitHub viewer cannot create data product', async () => {
  const response = await app
    .post('/data-products')
    .set('Authorization', `Bearer ${viewerToken}`)
    .send({ name: 'MyProduct' });
  
  expect(response.status).toBe(403);
});
```

### Security Tests
```typescript
// Token tampering
test('Rejects forged tokens', async () => {
  const forgedToken = jwt.sign({ role: 'ADMIN' }, 'wrong-secret');
  const response = await app
    .get('/admin/settings')
    .set('Authorization', `Bearer ${forgedToken}`);
  
  expect(response.status).toBe(401);
});
```

---

## Recommendation

### For MVP (Now)
**Use GitHub Teams + Backend Role Checks**
- Leverage existing GitHub OAuth
- Add simple middleware to enforce permissions
- Platform role resolved on every request
- ~2-4 weeks implementation

### For Enterprise (Phase 2)
**Add OIDC Support**
- Support multiple OIDC providers
- Optional — GitHub remains default
- Enables Azure AD, Okta, etc.
- ~4-8 weeks implementation

### For Advanced Features (Phase 3+)
**Fine-Grained Authorization Service**
- Resource-level permissions
- Dynamic policies
- Per-product ownership
- ~6-10 weeks implementation

---

## Summary Table

| Method | Setup | Per-Request Overhead | Flexibility | Recommended |
|--------|-------|----------------------|-------------|------------|
| **GitHub Teams** | Low (existing) | Low | Low | ✅ **Phase 1** |
| **OIDC** | Medium | Low-Medium | Medium | 🔲 Phase 2 |
| **Policy Service** | High | Medium-High | High | 🔲 Phase 3+ |
| **Hybrid** | Medium | Low-Medium | High | ✅ **Recommended** |

---

**Next Steps**:
1. Review this plan with team
2. Confirm Phase 1 scope
3. Create implementation tickets
4. Start with middleware + basic role checks
5. Iterate based on feedback

