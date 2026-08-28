# P0 AUTHORIZATION HARDENING — EXECUTION PLAN

**Status**: Ready to Execute  
**Scope**: Replace custom auth with Backstage Permission Framework  
**Timeline**: Focused P0 work only (no P1 Admin UX)  

---

## CRITICAL FINDINGS: validation-manager-backend

### Custom Auth Mechanism (MUST REMOVE)

**Location**: Lines 19-28 of router.ts

```typescript
// ❌ CURRENT (INSECURE)
const authenticateUser = (req: Request, res: Response, next: Function) => {
  const userRole = req.headers['x-user-role'] as string || 'DEVELOPER';
  const userId = req.headers['x-user-id'] as string || 'system-user';
  req.body._user = { id: userId, role: userRole };
  next();
};
```

**Problems**:
- ❌ Client-supplied headers (frontend can spoof any role)
- ❌ Ignores Backstage Identity entirely
- ❌ No credential validation
- ❌ Hardcoded fallback role ('DEVELOPER')
- ❌ 'system-user' default allows unauthenticated access

### Unprotected Endpoints (CRITICAL)

| Route | Method | Current Auth | Issue | P0 Fix |
|-------|--------|--------------|-------|--------|
| /requirements/:id/approve | POST | None | Can approve as anyone | Add validationReview |
| /requirements/:id/sign | POST | Hardcoded role check | Not Backstage native | Add validationReview |
| /documents/generate | POST | Hardcoded roles | Not Backstage native | Add validationReview |
| /admin/dashboard | GET | Hardcoded role check | Not Backstage native | Add validationAdmin |
| /admin/approvals/pending | GET | Hardcoded role check | Not Backstage native | Add validationRead |

---

## SOLUTION ARCHITECTURE

### Replace Custom Auth with Backstage

```
CURRENT (BROKEN):
req.headers['x-user-role']
  ↓
custom middleware
  ↓
hardcoded role check
  ↓
403 if mismatch

FIXED (BACKSTAGE-NATIVE):
Backstage Identity (credentials)
  ↓
HttpAuthService.credentials(req)
  ↓
PermissionsService.authorize([permission])
  ↓
PlatformPermissionPolicy decision
  ↓
403 if DENY
```

---

## PERMISSIONS TO USE/ADD

### Existing (Reuse)

```typescript
validationRead                  // Can view requirements, evidence
validationRunStart              // Can start validation run
validationTestExecute           // Can execute tests
validationReview                // Can review findings + approve (REUSE FOR APPROVAL)
validationAdmin                 // Can administer validation system
```

### New (if necessary)

```typescript
// Only if current set is insufficient:
validationRequirementManage     // Can create/edit requirements
```

**Decision**: Reuse `validationReview` for approval endpoints. Add `validationRequirementManage` only if needed.

---

## IMPLEMENTATION SEQUENCE

### Step 1: Update packages/platform-common/src/permissions.ts

**Add new permission** (if not already present):

```typescript
export const validationRequirementManagePermission = createPermission({
  name: 'validation.requirement.manage',
  attributes: { action: 'update' },
});
```

**Ensure exports are in `platformPermissions` array**.

### Step 2: Update packages/platform-common/src/permissions.ts permission sets

**Add to OWNER and ADMIN**:

```typescript
export const OWNER_PERMISSION_NAMES = new Set([
  ...DEVELOPER_PERMISSION_NAMES,
  // ... existing ...
  'validation.requirement.manage',  // ADD THIS
  // ... rest ...
]);

export const ADMIN_PERMISSION_NAMES = new Set([
  ...OWNER_PERMISSION_NAMES,
  // ... will inherit validation.requirement.manage ...
]);
```

### Step 3: Create validation-manager middleware.ts

**New file**: `plugins/validation-manager/backend/src/middleware.ts`

```typescript
import { HttpAuthService, PermissionsService, LoggerService } from '@backstage/backend-plugin-api';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import { NotAllowedError } from '@backstage/errors';
import { Request, Response, NextFunction } from 'express';

/**
 * Backstage-native authorization middleware for validation-manager.
 * Replaces custom header-based auth.
 */
export async function requireValidationPermission(
  logger: LoggerService,
  httpAuth: HttpAuthService,
  permissions: PermissionsService | undefined,
  permission: BasicPermission,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!permissions) {
        logger.error('Permission service not configured');
        return res.status(500).json({ error: 'Authorization service unavailable' });
      }

      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const [decision] = await permissions.authorize([{ permission }], { credentials });

      if (decision.result !== AuthorizeResult.ALLOW) {
        logger.debug(
          `Validation permission denied: ${permission.name} for ${credentials.principal?.userEntityRef || 'unknown'}`,
        );
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permission.name,
        });
      }

      // Store credentials on request for downstream use
      (req as any)._backstageCredentials = credentials;
      next();
    } catch (error) {
      logger.error(`Authorization check failed: ${error}`);
      res.status(401).json({ error: 'Authentication required' });
    }
  };
}
```

### Step 4: Refactor validation-manager/backend/src/router.ts

**Remove**:
- Lines 19-28: Custom authenticateUser middleware
- All hardcoded role checks

**Add**:
- Import Backstage services
- Apply permission middleware to each privileged endpoint
- Use Backstage credentials instead of custom headers

**Routes to protect** (with permissions):

```typescript
GET /requirements                    validationRead
GET /requirements/:id                validationRead
POST /requirements                   validationRequirementManage (OWNER+)
POST /requirements/:id/approve       validationReview (OWNER+)
POST /requirements/:id/reject        validationReview (OWNER+)
POST /requirements/:id/sign          validationReview (OWNER+)
POST /documents/generate             validationReview (OWNER+)
GET /documents/exports               validationRead (VIEWER+)
GET /documents/exports/stats         validationRead (VIEWER+)
GET /admin/dashboard                 validationAdmin (ADMIN)
GET /admin/approvals/pending         validationReview (OWNER+)
GET /requirements/:id/history        validationRead (VIEWER+)
GET /requirements/:id/audit          validationRead (VIEWER+)
GET /health                          public (no auth needed)
```

---

## BACKEND ROUTE AUDIT MATRIX

### validation-manager (CRITICAL)

| Route | Method | Permission | Current | P0 Action |
|-------|--------|-----------|---------|-----------|
| /requirements | GET | validationRead | ❌ NONE | ✅ ADD |
| /requirements/:id | GET | validationRead | ❌ NONE | ✅ ADD |
| /requirements | POST | validationRequirementManage | ❌ HARDCODED | ✅ FIX |
| /requirements/:id/approve | POST | validationReview | ❌ NONE | ✅ ADD |
| /requirements/:id/reject | POST | validationReview | ❌ NONE | ✅ ADD |
| /requirements/:id/sign | POST | validationReview | ❌ HARDCODED | ✅ FIX |
| /documents/generate | POST | validationReview | ❌ HARDCODED | ✅ FIX |
| /documents/exports | GET | validationRead | ❌ NONE | ✅ ADD |
| /documents/exports/stats | GET | validationRead | ❌ NONE | ✅ ADD |
| /admin/dashboard | GET | validationAdmin | ❌ HARDCODED | ✅ FIX |
| /admin/approvals/pending | GET | validationReview | ❌ HARDCODED | ✅ FIX |
| /requirements/:id/history | GET | validationRead | ❌ NONE | ✅ ADD |
| /requirements/:id/audit | GET | validationRead | ❌ NONE | ✅ ADD |
| /health | GET | public | ✅ OK | - |

### validation-expert

**Status**: Need to audit (likely already protected based on earlier grep)

### data-products-backend

**Status**: Partially protected (ci-status, certification ✅; others unknown)

### model-company-backend

**Status**: Fully protected ✅

### entitlements-backend

**Status**: Partially protected (need to verify)

### marketplace, platform-components, composer, plugin-directory, admin routes

**Status**: Need to audit

---

## TESTS TO ADD

### 1. Direct Backend Call — Unauthorized

```typescript
describe('Authorization: validation-manager (Backstage-native)', () => {
  it('unauthorized user cannot approve requirement', async () => {
    const res = await request(app)
      .post('/validation-manager/requirements/URS-001/approve')
      .send({ comment: 'approved' });
      
    expect(res.status).toBe(401); // No credentials
    expect(res.body.error).toMatch(/auth|permission/i);
  });

  it('VIEWER cannot approve requirement', async () => {
    const res = await request(app)
      .post('/validation-manager/requirements/URS-001/approve')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ comment: 'approved' });
      
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient/i);
  });
});
```

### 2. Authorized Access

```typescript
it('DATA_PRODUCT_OWNER can approve requirement', async () => {
  const res = await request(app)
    .post('/validation-manager/requirements/URS-001/approve')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ comment: 'approved' });
    
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

it('PLATFORM_ADMIN can access admin dashboard', async () => {
  const res = await request(app)
    .get('/validation-manager/admin/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);
    
  expect(res.status).toBe(200);
});
```

### 3. Frontend Bypass Attempt

```typescript
it('spoofed header does not bypass backend enforcement', async () => {
  // Send request with fake x-user-role header
  // Should be ignored by Backstage auth
  const res = await request(app)
    .post('/validation-manager/requirements/URS-001/approve')
    .set('x-user-role', 'PLATFORM_ADMIN')  // Fake header
    .send({ comment: 'approved' });
    
  expect(res.status).toBe(401); // Still denied (no real credentials)
});
```

---

## REGRESSION CHECKLIST

- [ ] yarn tsc (no new TypeScript errors in validation-manager)
- [ ] Permission policy tests pass
- [ ] validation-manager unit tests pass (if any exist)
- [ ] validation-expert routes still work
- [ ] data-products routes still work
- [ ] model-company routes still work
- [ ] OEE Golden Path generation works
- [ ] MQTT Temperature generation works
- [ ] REST Equipment generation works
- [ ] Marketplace still serves products
- [ ] Scaffolder still executes templates
- [ ] GitHub integration still works

---

## CRITICAL CONSTRAINTS (P0 ONLY)

✅ **DO THIS**:
- Remove custom auth headers
- Use Backstage Permission Framework exclusively
- Replace hardcoded role checks with Backstage permissions
- Add tests for unauthorized access denial
- Run regressions
- Document what was fixed

❌ **DO NOT DO THIS**:
- Build Admin UI (/admin/access/*)
- Create second IAM system
- Modify Catalog model
- Change Wave 1 Golden Paths
- Change OEE, MQTT, REST Equipment
- Modify Scaffolder
- Modify Marketplace
- Add new IAM database
- Create policy database

---

## EXPECTED OUTCOME

After P0:

```
✅ validation-manager uses Backstage Permission Framework exclusively
✅ Custom header-based auth completely removed
✅ All privileged endpoints server-side protected
✅ Direct unauthorized backend calls denied (401/403)
✅ Backend route audit complete
✅ Authorization gap closed
✅ Tests added
✅ Regressions pass
```

**Then**: STOP and report before proceeding to P1 Admin UX.

---

## FILES TO CHANGE (P0)

### New
```
plugins/validation-manager/backend/src/middleware.ts
```

### Modify
```
plugins/validation-manager/backend/src/router.ts
packages/platform-common/src/permissions.ts
packages/platform-common/src/permissions.ts (permission sets)
plugins/validation-manager/backend/src/router.test.ts (add tests)
```

### Verify (no changes needed, but audit)
```
plugins/validation-expert-backend/src/router.ts
plugins/data-products-backend/src/router.ts
plugins/model-company-backend/src/router.ts
plugins/entitlements-backend/src/router.ts
(and others)
```

---

**READY TO EXECUTE**

Awaiting confirmation to proceed with Step 1.

