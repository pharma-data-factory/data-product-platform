# P1B API Implementation — Inspection Report

**Date:** 2026-08-25  
**Status:** Starting from `URS_COMPOSER_P1A_PERSISTENCE_GATE_PASSED`

---

## Executive Summary

P0 API foundation is well-structured. Most P1B service methods already exist in `URSService`. P1B routes need to be added to the existing router to expose:

- Requirement versioning (revisions)
- Immutable baselines
- Approval workflows
- Approval instances & steps
- Approval decisions (approve/reject)

**Key Finding:** Router follows clean separation: routes → service → repository. Domain logic properly isolated.

---

## Part A: Existing P0 API Discovery

### Base Path
```
/api/urs-composer
```

### Existing Endpoints

#### Business Capabilities
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/capabilities` | `urs.read` | List all business capabilities |
| GET | `/capabilities/:id` | `urs.read` | Get capability detail |

#### Requirement Sets
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/requirement-sets` | `urs.create` | Create new URS |
| GET | `/requirement-sets` | `urs.read` | List URS (paginated, limit 50-200, offset) |
| GET | `/requirement-sets/:id` | `urs.read` | Get URS detail |
| PUT | `/requirement-sets/:id` | `urs.manage` | Update URS (draft only) — **NOT IMPLEMENTED** |
| POST | `/requirement-sets/:id/submit` | `urs.create` | Submit for review |
| POST | `/requirement-sets/:id/approve` | `urs.approve` | Approve URS |
| POST | `/requirement-sets/:id/reject` | `urs.approve` | Reject URS (reason required) |
| GET | `/requirement-sets/:id/audit` | `urs.read` | Get audit trail |
| GET | `/requirement-sets/:id/approvals` | `urs.read` | Get approval status |

#### Requirements
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/requirement-sets/:setId/requirements` | `urs.create` | Create requirement |
| GET | `/requirement-sets/:setId/requirements` | `urs.read` | List requirements |

#### Quality Checks
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/validate` | `urs.read` | Check single requirement quality |
| POST | `/requirement-sets/:id/validate` | `urs.read` | Check all requirements — **NOT IMPLEMENTED** |

#### Health
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/health` | None | Service health check |

**Total P0 Endpoints:** 15 (13 functional, 2 TODO)

---

**UPDATE (P1B IMPLEMENTATION):**

**Total P1B Endpoints Added:** 11

| Method | Path | Permission | Purpose | Status |
|--------|------|-----------|---------|--------|
| POST | `/requirements/:id/revisions` | `urs.create` | Create controlled revision | ✅ |
| GET | `/requirements/:id/versions` | `urs.read` | Get version history | ✅ |
| GET | `/requirements/:id/versions/:version` | `urs.read` | Get exact version | ✅ |
| POST | `/requirement-sets/:id/baselines` | `urs.manage` | Create immutable baseline | ✅ |
| GET | `/requirement-sets/:id/baselines` | `urs.read` | List baselines | ✅ |
| GET | `/baselines/:id` | `urs.read` | Get baseline detail (cross-plugin contract) | ✅ |
| GET | `/approval-workflows` | `urs.read` | List approval workflows | ✅ |
| POST | `/baselines/:id/submit` | `urs.manage` | Submit baseline for approval | ✅ |
| GET | `/approvals/:id` | `urs.read` | Get approval instance detail | ✅ |
| POST | `/approvals/:id/steps/:stepId/approve` | `urs.approve` | Approve workflow step | ✅ |
| POST | `/approvals/:id/steps/:stepId/reject` | `urs.approve` | Reject workflow step | ✅ |

**Total Combined:** 26 endpoints (15 P0 + 11 P1B)

---

## Part B: Request/Response Conventions

### All endpoints follow:

1. **JSON Content-Type** (express.json() enabled)
2. **RESTful method semantics:**
   - POST = create/action (201 for creation, 200 for action)
   - GET = retrieve (200)
   - PUT = update (200)

3. **Pagination pattern:**
   ```
   GET /requirement-sets?limit=50&offset=0
   
   Response:
   {
     "items": [...],
     "total": number
   }
   ```

4. **Single resource response:**
   - Success: JSON object (or array for list endpoints)
   - Not found: `{ "error": "Resource not found" }` with 404

5. **Request body validation:**
   - Type-cast `req.body as TypeFromTypes`
   - Manual validation in routes or throw InputError

---

## Part C: Error Handling

### Error Response Pattern

```typescript
if (error instanceof AuthenticationError) → 401
if (error instanceof NotAllowedError) → 403
if (error instanceof InputError) → 400
Otherwise → 500
```

### Response Format
```json
{ "error": "Human-readable message" }
```

**Found Issues:**
- No structured error codes (e.g., `URS_CONFLICT`, `URS_INVALID_STATE`)
- Stack traces may leak internals on 500
- No error correlation ID

---

## Part D: Permission Checks

### Authorization Pattern
```typescript
async authorize(
  permissions: PermissionsService,
  httpAuth: HttpAuthService,
  req: Request,
  permission: BasicPermission
): Promise<string>
```

**Returns:** Authenticated user's `userEntityRef` (or 'unknown')

**Behavior:**
- Throws `NotAllowedError` if permission denied
- Throws `NotAllowedError` if permission service misconfigured
- User principal is extracted and never trusted from request body

### Defined Permissions

From `@internal/platform-common`:
```
ursReadPermission       → 'urs.read'
ursCreatePermission     → 'urs.create'
ursManagePermission     → 'urs.manage'
ursApprovePermission    → 'urs.approve'
```

**Not yet defined:**
- `urs.admin` (needed for workflow administration)

---

## Part E: Identity Handling

### Actor Provenance

Pattern: **Actor is ALWAYS derived from Backstage identity, never from request body**

```typescript
const actor = await authorize(permissions, httpAuth, req, permission);
// actor = credentials.principal?.userEntityRef || 'unknown'
```

**Used for:**
- `createdBy` in RequirementSet
- `actor` in AuditEvent
- `approver` in Approval

**Critical Protection:**
```typescript
// WRONG: Trust actedBy from request
const actor = req.body.actedBy;

// RIGHT: Extract from auth
const actor = await authorize(...);
```

---

## Part F: Validation Approach

### Current Pattern

Routes perform **minimal validation**, delegate to service:

```typescript
// Example: submitForReview
const data = req.body as { reason?: string };
const updated = await service.submitForReview(req.params.id, actor, data.reason);
```

Service throws descriptive errors:
- `InputError` for validation failures
- `Error` for business logic violations

Router catches and responds with 400.

### Missing Structured Validation

No centralized validator. P1B should add:
- UUID validation
- Version format validation
- Enum value validation
- Required field validation

---

## Part G: URSService Invocation Pattern

All routes follow:

```typescript
router.post('/path', async (req, res) => {
  try {
    const actor = await authorize(...);  // 1. Permission check + identity
    const data = req.body as RequestType;  // 2. Parse request
    const result = await service.methodName(...);  // 3. Call service
    res.status(201).json(result);  // 4. Respond
  } catch (err) {
    respondError(res, logger, err);  // 5. Error handler
  }
});
```

**Key:** Route is thin. All business logic in service and repository.

---

## Part H: Existing Service Methods for P1B

The `URSService` already has P1B methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `createRevision` | `(requirementId: string, reason: string, actor: string)` | Create controlled revision |
| `getVersionHistory` | `(requirementSetId: string)` | Get version history |
| `getVersion` | `(versionId: string)` | Get exact version |
| `createBaseline` | `(data: CreateBaselineRequest, actor: string)` | Create baseline snapshot |
| `getBaseline` | `(id: string)` | Get baseline detail |
| `getCurrentApprovedBaseline` | `(requirementSetId: string)` | Get latest approved baseline |
| `approveBaseline` | `(id: string, actor: string, comment?: string)` | Start approval workflow |
| `getApprovalWorkflow` | `(id: string)` | Get workflow definition |
| `createApprovalInstance` | `(baselineId: string, workflowId: string, actor: string)` | Create approval instance |
| `getApprovalInstance` | `(id: string)` | Get approval detail |
| `getBaselineApprovals` | `(baselineId: string)` | Get all approvals for baseline |

**Status:** Methods exist in service. Routes need to be added to router.

---

## Part I: P0 Router Conventions to Preserve

✅ **MUST PRESERVE:**

1. Authorization pattern: always check, always derive actor
2. Error response format: `{ "error": "message" }` with appropriate HTTP status
3. Service delegation: routes invoke service methods
4. Pagination: limit/offset with max 200
5. Permission checks before action
6. Audit events created in service (not route)
7. Express promise router (automatic error handling)
8. JSON content type

✅ **CONSISTENCY RULES:**

- 201 for creation, 200 for read/update/action
- 404 for missing resources
- 400 for validation errors
- 401 for unauthenticated
- 403 for unauthorized
- No direct SQL in routes
- No raw repository calls (use service)

---

## Part J: Architecture Integration

### Existing Clean Layer Stack

```
Express Router (express-promise-router)
        ↓
Route Handler
  - Permission check (authorize)
  - Parse request body
  - Call service method
  - Response formatting
        ↓
URSService
  - Business logic
  - Audit event creation
  - Workflow orchestration
  - Call repository
        ↓
IURSRepository / PostgresURSRepository
  - Persistence
  - Transactions
  - Optimistic concurrency
        ↓
PostgreSQL Database
```

**P1B Routes must NOT:**
- Add domain logic to routes
- Call repository directly
- Create SQL queries
- Manage transactions
- Create audit events (service does)

---

## Part K: Existing Permissions Are Sufficient

From P0 audit:
```
ursReadPermission    → read operations
ursCreatePermission  → create/author operations
ursManagePermission  → manage/edit operations
ursApprovePermission → approve/reject operations
```

Suggested P1B mapping (aligns with P0):

| P1B Operation | Permission |
|---------------|-----------|
| GET requirements/:id/versions | `urs.read` |
| POST requirements/:id/revisions | `urs.create` |
| GET baselines/:id | `urs.read` |
| POST requirement-sets/:id/baselines | `urs.manage` |
| GET /approval-workflows | `urs.read` |
| POST /baselines/:id/submit | `urs.manage` |
| GET /approvals/:id | `urs.read` |
| POST /approvals/:id/steps/:stepId/approve | `urs.approve` |
| POST /approvals/:id/steps/:stepId/reject | `urs.approve` |

**No new permissions needed for MVP.**

---

## Part L: What Router.ts Currently Does NOT Have

Routes **needed** for P1B:

```
❌ POST /requirements/:id/revisions
❌ GET /requirements/:id/versions
❌ GET /requirements/:id/versions/:version
❌ POST /requirement-sets/:id/baselines
❌ GET /requirement-sets/:id/baselines
❌ GET /baselines/:id
❌ GET /approval-workflows
❌ POST /baselines/:id/submit
❌ GET /approvals/:id
❌ POST /approvals/:id/steps/:stepId/approve
❌ POST /approvals/:id/steps/:stepId/reject
```

**Total new routes needed:** 11

---

## Part M: Risk Assessment

**LOW RISK** — P1B implementation:

✅ Existing service methods already built  
✅ Repository layer verified (17/17 tests passing)  
✅ Authorization pattern established  
✅ Error handling pattern established  
✅ DTO types defined  
✅ Permissions defined  
✅ No schema changes needed  
✅ No breaking changes to P0 routes  

**APPROACH:**

1. Add P1B routes to existing router
2. Reuse authorization/error handling patterns
3. Invoke existing service methods
4. Add API tests for each new endpoint
5. Test permission enforcement
6. Test actor spoofing protection
7. Test full lifecycle

---

## Part N: API Documentation

**Current State:** No OpenAPI spec found in repository.

**Recommendation for P1B:** Document new routes in markdown table (similar to this inspection report) and add OpenAPI spec later if repository standardizes on it.

---

## Next Steps

1. ✅ **INSPECTION COMPLETE** — This report
2. ⏳ **ADD P1B ROUTES** — Extend router.ts with 11 new endpoints
3. ⏳ **ADD DTO MAPPERS** — Explicit API/domain DTOs
4. ⏳ **ADD INTEGRATION TESTS** — Full test coverage
5. ⏳ **PERMISSION TESTS** — Negative test cases
6. ⏳ **ACTOR SPOOFING TEST** — Security verification
7. ⏳ **E2E LIFECYCLE TEST** — Full requirement→baseline→approval→approved workflow
8. ⏳ **TRANSACTION FAILURE TEST** — Consistency under error
9. ⏳ **UPDATE DOCUMENTATION** — Architecture docs, ADR if needed
10. ⏳ **GENERATE VERIFICATION REPORT** — Evidence matrix

---

**Status:** Ready to implement P1B routes.
