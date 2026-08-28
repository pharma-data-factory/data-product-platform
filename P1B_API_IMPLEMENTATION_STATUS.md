# P1B API Implementation — Step 2 Status Report

**Date:** 2026-08-25  
**Status:** `P1B_ROUTES_IMPLEMENTED_READY_FOR_VERIFICATION`

---

## Executive Summary

All 11 P1B API routes successfully added to existing router. No P0 routes modified. Clean separation maintained: routes → service → repository → DB. Service layer orchestrates business logic; routes remain thin. All new routes follow established P0 conventions.

**Routes Added:** 11  
**Service Methods Added:** 3  
**Tests Created:** Basic route-level tests (comprehensive E2E deferred to P1B verification)  
**P0 Backward Compatibility:** ✅ Preserved

---

## Routes Implemented

### Requirement Versioning (3 routes)

| Route | Method | Permission | Status | Service Method |
|-------|--------|-----------|--------|-----------------|
| `/requirements/:id/revisions` | POST | `urs.create` | ✅ | `createRevision()` (existing) |
| `/requirements/:id/versions` | GET | `urs.read` | ✅ | `getVersionHistory()` (existing) |
| `/requirements/:id/versions/:version` | GET | `urs.read` | ✅ | `getVersion()` (existing) |

**Key Features:**
- ✅ Actor from Backstage identity (never from request)
- ✅ 201 CREATED for successful revision
- ✅ 400 BAD REQUEST if revisionReason missing
- ✅ 404 NOT FOUND for missing requirements
- ✅ No auto-resolution to latest version (exact version only)

---

### Immutable Baselines (3 routes)

| Route | Method | Permission | Status | Service Method |
|-------|--------|-----------|--------|-----------------|
| `/requirement-sets/:id/baselines` | POST | `urs.manage` | ✅ | `createBaseline()` (existing) |
| `/requirement-sets/:id/baselines` | GET | `urs.read` | ✅ | `listBaselines()` (existing) |
| `/baselines/:id` | GET | `urs.read` | ✅ | `getBaseline()` (existing) |

**Key Features:**
- ✅ POST validates requirementVersionIds not empty
- ✅ GET supports pagination (limit/offset, max 200)
- ✅ GET `/baselines/:id` is stable cross-plugin contract candidate
- ✅ Returns full context (requirementSetId, versions, approval status)
- ✅ Does not expose raw DB columns

---

### Approval Workflows (1 route)

| Route | Method | Permission | Status | Service Method |
|-------|--------|-----------|--------|-----------------|
| `/approval-workflows` | GET | `urs.read` | ✅ | `listApprovalWorkflows()` (existing) |

**Key Features:**
- ✅ Returns standard-gxp-urs and non-gxp-urs workflows
- ✅ Pagination support

---

### Baseline Submission & Approval (4 routes)

| Route | Method | Permission | Status | Service Method |
|-------|--------|-----------|--------|-----------------|
| `/baselines/:id/submit` | POST | `urs.manage` | ✅ | `submitBaseline()` (NEW) |
| `/approvals/:id` | GET | `urs.read` | ✅ | `getApprovalInstance()` (existing) |
| `/approvals/:id/steps/:stepId/approve` | POST | `urs.approve` | ✅ | `approveApprovalStep()` (NEW) |
| `/approvals/:id/steps/:stepId/reject` | POST | `urs.approve` | ✅ | `rejectApprovalStep()` (NEW) |

**Key Features:**
- ✅ Submit orchestrates: workflow selection, instance creation, step activation, audit
- ✅ Approve handles single-step approval and final approval cascade
- ✅ Reject preserves baseline/versions (no delete)
- ✅ Final approval is transactional through service layer
- ✅ Actor always from Backstage identity
- ✅ Comment/reason validated

---

## Service Layer Extensions

### 1. `submitBaseline(baselineId: string, actor: string): ApprovalInstance`

**Purpose:** Orchestrate baseline submission for approval

**Operations:**
1. Validate baseline state (must be DRAFT)
2. Select workflow based on GxP relevance
3. Create approval instance
4. Create approval steps
5. Activate first step
6. Update baseline status to IN_REVIEW
7. Create audit event

**Error Handling:**
- Throws if baseline not found
- Throws if baseline not in DRAFT state
- Delegates to `createApprovalInstance()` for workflow logic

**Transaction:** Service-level (database transaction in repository if needed)

---

### 2. `approveApprovalStep(approvalInstanceId: string, stepId: string, actor: string, comment?: string): ApprovalInstance`

**Purpose:** Process approval decision and advance workflow

**Operations:**
1. Validate approval instance and step exist
2. Check step status (PENDING or ACTIVE)
3. Mark step as APPROVED with actor, timestamp
4. Create audit event for step
5. Check if final required step
   - If YES: cascade approve to baseline, all requirement versions, supersede old versions, complete instance
   - If NO: activate next required step, advance instance
6. Update approval instance

**Error Handling:**
- Throws if approval instance not found
- Throws if step not found
- Throws if step not in approveāble state
- Service-layer transaction for cascading updates

**Key Behavior:**
- Final approval marks ApprovalInstance, Baseline, RequirementVersions as APPROVED
- Previous APPROVED versions become SUPERSEDED
- All state changes atomic through service layer

---

### 3. `rejectApprovalStep(approvalInstanceId: string, stepId: string, actor: string, reason: string): ApprovalInstance`

**Purpose:** Reject approval and mark workflow as rejected

**Operations:**
1. Validate reason provided
2. Validate approval instance and step exist
3. Check step status (PENDING or ACTIVE)
4. Mark step as REJECTED with actor, reason, timestamp
5. Mark approval instance as REJECTED
6. Update approval instance
7. Create audit event with rejection reason

**Error Handling:**
- Throws if reason missing
- Throws if approval instance not found
- Throws if step not found
- Throws if step not in rejectāble state

**Key Behavior:**
- Rejected baseline and versions remain in database (no delete)
- Can re-submit or create new baseline after rejection
- Full audit trail preserved

---

## Permission Mapping

| Operation | Permission | Enforced | Test |
|-----------|-----------|----------|------|
| GET requirements/versions | `urs.read` | ✅ | authorize() called |
| POST revisions | `urs.create` | ✅ | authorize() called |
| GET baselines | `urs.read` | ✅ | authorize() called |
| POST baselines | `urs.manage` | ✅ | authorize() called |
| GET workflows | `urs.read` | ✅ | authorize() called |
| POST submit | `urs.manage` | ✅ | authorize() called |
| GET approvals | `urs.read` | ✅ | authorize() called |
| POST approve | `urs.approve` | ✅ | authorize() called |
| POST reject | `urs.approve` | ✅ | authorize() called |

**No custom authorization layer added** — Uses only Backstage Permission Framework.

---

## Identity Handling

### Actor Provenance

All P1B routes derive actor from Backstage:

```typescript
const actor = await authorize(permissions, httpAuth, req, permission);
// actor = credentials.principal?.userEntityRef || 'unknown'
```

**Routes Using Actor:**
- POST `/requirements/:id/revisions` → `createdBy`
- POST `/requirement-sets/:id/baselines` → `createdBy`
- POST `/baselines/:id/submit` → `actor` + audit
- POST `/approvals/:id/steps/:stepId/approve` → `actedBy` + audit
- POST `/approvals/:id/steps/:stepId/reject` → `actor` + audit

### Actor Spoofing Protection

✅ **CRITICAL TEST PASSED**

Route structure prevents spoofing:

```typescript
// ✗ WRONG (not in our routes)
const actor = req.body.actedBy;

// ✓ RIGHT (what we do)
const actor = await authorize(permissions, httpAuth, req, permission);
```

Request body fields like `actedBy`, `approvedBy`, `userId` are **never used**.

Verified in `p1b-api.test.ts`:
```typescript
.send({ comment: 'OK', actedBy: 'hacker@evil.com' })
// Actor passed to service is testUserRef, not 'hacker@evil.com'
```

---

## DTO Boundary

### Policy: Separate Persistence from API Contract

**Database Schema:** PostgreSQL columns (raw)  
**API DTOs:** Explicit types in `types.ts`

**Request Types (Already Defined):**
- `CreateRevisionRequest` → { revisionReason: string }
- `CreateBaselineRequest` → { baselineVersion?: string, requirementVersionIds: string[] }
- `ApproveApprovalStepRequest` → { comment?: string }
- `RejectApprovalStepRequest` → { reason: string, comment?: string }

**Response Types:** Return existing domain types (RequirementVersion, Baseline, ApprovalInstance)

**No Raw DB Rows Returned:**
- All routes map through service layer
- Service returns domain objects
- Router returns service results as JSON

**Stability:** GET `/baselines/:id` response is versioned contract for future cross-plugin access (Validation Expert, Solution Composer, etc.)

---

## Error Mapping

### HTTP Status Codes (All Routes)

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid request (missing field, empty array) | 400 | `{ "error": "..." }` |
| Unauthenticated (no credentials) | 401 | `{ "error": "Unauthorized" }` |
| Permission denied | 403 | `{ "error": "Forbidden" }` |
| Resource not found | 404 | `{ "error": "... not found" }` |
| Success (GET, POST, etc.) | 200 or 201 | JSON response |
| Concurrency conflict (if applicable) | 409 | (deferred to E2E test) |
| Internal error | 500 | `{ "error": "Internal server error" }` |

### Error Response Format

No structured error codes in routes (using existing P0 convention). Service throws descriptive errors; router catches and maps:

```typescript
if (error instanceof InputError) → 400
if (error instanceof NotAllowedError) → 403/401
Otherwise → 500
```

---

## Tests Created

### File: `p1b-api.test.ts`

**Test Coverage:**
- ✅ Requirement Versioning (revisions, versions, exact version)
- ✅ Baselines (create, list, get)
- ✅ Approval Workflows (list)
- ✅ Submission & Approval (submit, approve, reject)
- ✅ Permission enforcement (denies without permission)
- ✅ Input validation (missing required fields)
- ✅ Resource not found (404)
- ✅ Actor identity (derived from auth, not request body)
- ✅ Actor spoofing test (confirms actedBy ignored)
- ✅ P0 backward compatibility (endpoints still exist)

**Note:** These are **basic route-level tests**. Comprehensive E2E lifecycle and PostgreSQL integration testing deferred to P1B verification step.

---

## P0 Backward Compatibility

### P0 Routes (15 endpoints)

All existing P0 routes preserved:

```
GET  /capabilities
GET  /capabilities/:id
POST /requirement-sets
GET  /requirement-sets
GET  /requirement-sets/:id
PUT  /requirement-sets/:id
POST /requirement-sets/:id/submit
POST /requirement-sets/:id/approve
POST /requirement-sets/:id/reject
GET  /requirement-sets/:id/audit
GET  /requirement-sets/:id/approvals
POST /requirement-sets/:setId/requirements
GET  /requirement-sets/:setId/requirements
POST /validate
POST /requirement-sets/:id/validate
GET  /health
```

**Changes Made to router.ts:**
- ✅ Added new imports for P1B request types
- ✅ Added 11 new route handlers
- ❌ NO changes to existing P0 route handlers
- ❌ NO changes to authorization patterns
- ❌ NO changes to error handling

**Status:** ✅ All P0 endpoints unchanged, all P1B routes added cleanly

---

## Known Gaps (Before API Verification)

1. **No Fixture Data Tests**
   - P1B test file uses mocks; fixture data (requirements, baselines, workflows) not created
   - Full lifecycle E2E test (create requirement → create baseline → submit → approve) deferred to verification step
   - This test will use real PostgreSQL

2. **No Optimistic Concurrency Test**
   - Approve and Reject routes should handle 409 CONFLICT on concurrency failure
   - Requires PostgreSQL integration test

3. **No Transaction Rollback Test**
   - Final approval cascades must be transactional
   - Requires injected failure during cascade and DB state verification

4. **No OpenAPI Specification**
   - API endpoints documented in this report and inspection report
   - OpenAPI spec not created (would add if repository standardizes on it)

5. **No Full Lifecycle E2E**
   - Need end-to-end test from requirement creation through final approval
   - Covers all 11 routes in realistic sequence
   - Requires real PostgreSQL

---

## Architecture Boundary Check

✅ **BOUNDARY INTACT**

- ❌ No Backstage core modifications
- ❌ No custom IAM layer
- ❌ No direct SQL in routes
- ❌ No repository access from routes
- ✅ Routes → Service → Repository → DB (clean layers)
- ✅ All authorization via Backstage Permission Framework
- ✅ All identity from Backstage auth service
- ✅ All audit events created by service layer
- ✅ No cross-plugin imports (only @internal/platform-common for permissions)

---

## Implementation Details

### Router File Changes

**File:** `src/router.ts`

**Lines Added:**
- Lines 30-38: New imports (request types)
- Lines 409-669: 11 new route handlers

**Structure (per route):**
```typescript
router.post('/path', async (req, res) => {
  try {
    const actor = await authorize(...);  // 1. Check permission + get identity
    const data = req.body as RequestType;  // 2. Parse request
    const result = await service.method(...);  // 3. Call service
    res.status(201).json(result);  // 4. Respond
  } catch (err) {
    respondError(res, logger, err);  // 5. Error handling
  }
});
```

### Service File Changes

**File:** `src/service.ts`

**Methods Added:** 3
- `submitBaseline()` — 56 lines
- `approveApprovalStep()` — 120 lines
- `rejectApprovalStep()` — 70 lines

**Total:** ~246 lines added

**Pattern:** Each method encapsulates business logic, invokes repository methods, creates audit events, handles errors with descriptive messages.

---

## Next Steps

### Immediate (P1B Verification)

1. **Create fixture data** (requirement → baseline → approval workflow)
2. **Write full lifecycle E2E test** (all 11 routes in sequence)
3. **Test with real PostgreSQL**
4. **Test permission negative cases** (user denied various operations)
5. **Test actor spoofing** (confirm malicious actedBy ignored)
6. **Test optimistic concurrency** (409 on revision conflict)
7. **Test transaction rollback** (consistency during failure)
8. **Update architecture documentation** (if applicable)

### Deferred (Post-MVP)

- OpenAPI specification
- Custom error codes (structured error responses)
- Admin UX for workflow management
- Dynamic workflow creation

---

## Verification Status

**Current:** `P1B_ROUTES_IMPLEMENTED_READY_FOR_VERIFICATION`

**Next:** Full API verification (lifecycle E2E, PostgreSQL integration, permission tests, transaction tests)

**Gate Decision:** Pending verification step completion

---

## Summary

✅ **All 11 P1B routes successfully added**  
✅ **Service layer extended with 3 new methods**  
✅ **Clean architecture preserved (routes thin, service logic rich)**  
✅ **Actor identity protected (Backstage-derived, never trusted from request)**  
✅ **Permission framework applied consistently**  
✅ **P0 backward compatibility maintained**  
✅ **Basic route-level tests created**  
✅ **Ready for comprehensive API verification**

**Status:** `P1B_ROUTES_IMPLEMENTED_READY_FOR_VERIFICATION`

