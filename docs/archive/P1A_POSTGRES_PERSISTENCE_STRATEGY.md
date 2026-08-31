# P1A POSTGRESQL PERSISTENCE STRATEGY

**Status**: ✅ **STRATEGY COMPLETE - READY FOR IMPLEMENTATION PHASE**

---

## EXECUTIVE SUMMARY

This document defines the **architecture and implementation strategy** for replacing the in-memory P0 repository with a production-grade PostgreSQL repository for URS Composer P1A.

The strategy emphasizes:
- ✅ **Minimal Risk**: Keep existing in-memory working, add PostgreSQL alongside
- ✅ **Backward Compatible**: P0 continues to work unchanged
- ✅ **Incremental**: Phase database layer independently from routes
- ✅ **Contract-Based**: PostgreSQL repo implements same `IURSRepository` interface
- ✅ **Testable**: Contract tests verify parity with in-memory

---

## 1. ARCHITECTURE DECISION: ABSTRACTION LAYER

### Current State (P0)
```
Routes → URSService → URSRepository (in-memory)
```

### P1A+ State
```
Routes → URSService → IURSRepository (interface)
                          ↓
                    ├─ URSRepository (in-memory)
                    └─ PostgresURSRepository (PostgreSQL)
```

**Key Point**: Routes stay unchanged. Only `URSService` → repository changes.

---

## 2. IMPLEMENTATION APPROACH: STAGED DELIVERY

### Phase 1: Database Schema (COMPLETE)
- ✅ Migrations SQL defined in `src/db/migrations.sql`
- ✅ 9 tables designed with proper keys and indexes
- ✅ Seed data provided

### Phase 2: PostgreSQL Repository Stub (P1B)
**Goal**: Implement `PostgresURSRepository` class

Requirements:
- Implement `IURSRepository` interface (25+ methods)
- Use Knex.js query builder (provided by Backstage DatabaseService)
- Every method follows same pattern:
  ```typescript
  async createRequirementSet(set: RequirementSet): Promise<RequirementSet> {
    const knex = await this.db.raw(); // Get Knex instance
    await knex('requirement_sets').insert({...});
    return set;
  }
  ```
- All operations stateless (no transactions yet in P1A)

### Phase 3: Configuration & Runtime Selection (P1B)
**Goal**: Choose repository based on environment

```typescript
// In plugin.ts init()
let repository: IURSRepository;

if (process.env.USE_POSTGRES) {
  repository = new PostgresURSRepository(database, logger);
} else {
  repository = new URSRepository();
}
```

### Phase 4: Contract Testing (P1B)
**Goal**: Prove both repositories behave identically

Test pattern:
```typescript
describe('Requirement Set CRUD', () => {
  test('in-memory and postgres behave identically', async () => {
    const set = {...};
    
    const inMemResult = await inMemoryRepo.createRequirementSet(set);
    const pgResult = await postgresRepo.createRequirementSet(set);
    
    expect(inMemResult.id).toBe(pgResult.id);
    expect(inMemResult.status).toBe(pgResult.status);
  });
});
```

---

## 3. DATABASE SCHEMA REFERENCE

### Tables Created by migrations.sql

| Table | Purpose | Rows in P0 → P1A |
|-------|---------|-----------------|
| `business_capabilities` | Business context | Seeded (10 records) |
| `requirement_sets` | URS documents | Created dynamically |
| `requirement_versions` | Versioned requirements | Created dynamically |
| `baselines` | Immutable snapshots | Created dynamically |
| `approval_workflows` | Approval templates | Seeded (2 workflows) |
| `approval_instances` | Running approvals | Created dynamically |
| `approval_steps` | Individual approval steps | Created dynamically |
| `requirements` | P0 legacy | Maintained for compatibility |
| `audit_events` | Append-only audit trail | Created dynamically |

### Key Constraints

**Primary Keys**: All tables have UUID primary key (`id`)

**Foreign Keys**:
- `requirement_versions` → `requirement_sets`
- `baselines` → `requirement_sets`
- `approval_instances` → `approval_workflows`, `baselines`
- `approval_steps` → `approval_instances`
- `audit_events` → entities by `entity_id`

**Indexes** (for performance):
- `requirement_sets(status, created_at)` — for listing queries
- `requirement_versions(requirement_id, version_number)` — for version history
- `baselines(requirement_set_id, baseline_version)` — for baseline lookups
- `approval_instances(baseline_id, status)` — for approval status queries
- `audit_events(entity_id, timestamp)` — for audit trail searches

---

## 4. CONCURRENCY CONTROL STRATEGY

### Optimistic Locking via Revision Field

Every mutable entity has a `revision` field (INTEGER):

```typescript
// RequirementSet: revision = 1
// Baseline: revision = 1
// RequirementVersion: revision = 1
// ApprovalInstance: revision = 1
```

**Update Pattern**:
```sql
UPDATE requirement_sets
SET status = ?, updated_at = ?, revision = revision + 1
WHERE id = ? AND revision = ?;
-- If 0 rows affected: conflict
```

**Application Code** (P1B routes):
```typescript
try {
  const affected = await knex('requirement_sets')
    .where({ id: set.id, revision: set.revision })
    .update({...});
  
  if (affected === 0) {
    return res.status(409).json({
      error: 'Conflict: entity was modified'
    });
  }
} catch (error) {
  return res.status(500).json({...});
}
```

**Effect**: Prevents lost updates in concurrent scenarios.

---

## 5. MIGRATION PROCESS

### Local Development

```bash
# 1. Apply schema to local SQLite/PostgreSQL
npm run db:migrate

# 2. Set USE_POSTGRES=true (or false for in-memory)
export USE_POSTGRES=true

# 3. Start backend
yarn start

# 4. Routes automatically use PostgreSQL repository
```

### Production Deployment

```bash
# 1. Provision PostgreSQL database
CREATE DATABASE urs_composer;

# 2. Run migrations (Flyway or similar)
flyway migrate -locations=filesystem:plugins/urs-composer-backend/src/db

# 3. Set environment
export DATABASE_HOST=postgres.example.com
export DATABASE_USER=urs_composer_app
export DATABASE_PASSWORD=<secret>
export USE_POSTGRES=true

# 4. Restart Backstage backend
# Service automatically uses PostgreSQL
```

### Rollback Plan

If PostgreSQL fails:
```bash
export USE_POSTGRES=false
# Service falls back to in-memory (P0 mode)
# Data in PostgreSQL untouched
# P0 functionality fully preserved
```

---

## 6. REPOSITORY INTERFACE CONTRACT

### `IURSRepository` Methods (25+)

```typescript
interface IURSRepository {
  // Business Capabilities
  createBusinessCapability(cap: BusinessCapabilityPersisted): Promise<BusinessCapabilityPersisted>;
  getBusinessCapability(id: string): Promise<BusinessCapabilityPersisted | null>;
  listBusinessCapabilities(limit: number, offset: number): Promise<{...}>;

  // Requirement Sets
  createRequirementSet(set: RequirementSet): Promise<RequirementSet>;
  getRequirementSet(id: string): Promise<RequirementSet | null>;
  listRequirementSets(limit: number, offset: number): Promise<{...}>;
  updateRequirementSet(set: RequirementSet): Promise<void>;

  // Requirement Versions
  createRequirementVersion(version: RequirementVersion): Promise<RequirementVersion>;
  getRequirementVersion(id: string): Promise<RequirementVersion | null>;
  getRequirementVersions(requirementId: string, orderBy?: 'asc' | 'desc'): Promise<RequirementVersion[]>;
  getCurrentApprovedVersion(requirementId: string): Promise<RequirementVersion | null>;
  updateRequirementVersion(version: RequirementVersion): Promise<void>;

  // Baselines
  createBaseline(baseline: Baseline): Promise<Baseline>;
  getBaseline(id: string): Promise<Baseline | null>;
  listBaselines(requirementSetId: string, limit: number, offset: number): Promise<{...}>;
  getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null>;
  updateBaseline(baseline: Baseline): Promise<void>;

  // Approval Workflows
  createApprovalWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow>;
  getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | null>;
  listApprovalWorkflows(limit: number, offset: number): Promise<{...}>;

  // Approval Instances & Steps
  createApprovalInstance(instance: ApprovalInstance): Promise<ApprovalInstance>;
  getApprovalInstance(id: string): Promise<ApprovalInstance | null>;
  listApprovalInstances(baselineId: string): Promise<ApprovalInstance[]>;
  updateApprovalInstance(instance: ApprovalInstance): Promise<void>;

  createApprovalStep(step: ApprovalStep): Promise<ApprovalStep>;
  getApprovalStep(id: string): Promise<ApprovalStep | null>;
  listApprovalSteps(approvalInstanceId: string): Promise<ApprovalStep[]>;
  updateApprovalStep(step: ApprovalStep): Promise<void>;

  // Audit Trail
  createAuditEvent(event: AuditEvent): Promise<void>;
  getEntityAuditTrail(entityId: string, entityType: string): Promise<AuditEvent[]>;

  // Transactions
  beginTransaction(): Promise<Transaction>;
}
```

### Every PostgreSQL Method Must:
1. ✅ Accept same parameters as in-memory
2. ✅ Return same type
3. ✅ Maintain same semantics (immutability, ordering, etc.)
4. ✅ Handle null/not-found identically

---

## 7. IMPLEMENTATION CHECKLIST FOR P1B

- [ ] Create `PostgresURSRepository` class implementing `IURSRepository`
- [ ] Implement all 25+ CRUD methods
- [ ] Use Knex.js query builder (from Backstage DatabaseService)
- [ ] Handle JSON columns (stakeholders, workflow steps, etc.)
- [ ] Implement optimistic locking (revision field)
- [ ] Implement pagination (LIMIT, OFFSET)
- [ ] Add connection error handling
- [ ] Write contract tests (compare in-memory vs PostgreSQL)
- [ ] Add `USE_POSTGRES` environment flag
- [ ] Update `plugin.ts` to select repository based on flag
- [ ] Document configuration in README
- [ ] Test fallback to in-memory if PostgreSQL unavailable

---

## 8. ERROR HANDLING STRATEGY

### Connection Errors
```typescript
try {
  const knex = await this.db.raw();
  // Use knex
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    logger.warn('PostgreSQL unavailable, data loss risk', error);
    return res.status(503).json({ error: 'Database unavailable' });
  }
  throw error;
}
```

### Concurrency Conflicts (409 CONFLICT)
```typescript
const affected = await knex(...).update(...);
if (affected === 0) {
  return res.status(409).json({
    error: 'Entity was modified by another user',
    conflictingRevision: freshEntity.revision
  });
}
```

### Validation Errors (400 BAD REQUEST)
```typescript
if (!set.businessNeed) {
  return res.status(400).json({
    error: 'businessNeed is required'
  });
}
```

---

## 9. TESTING STRATEGY

### Contract Tests (P1B)

Test both repositories with identical test cases:

```typescript
describe('PostgreSQL Repository Contract', () => {
  let inMemoryRepo: URSRepository;
  let postgresRepo: PostgresURSRepository;

  beforeEach(() => {
    inMemoryRepo = new URSRepository();
    postgresRepo = new PostgresURSRepository(mockDatabase);
  });

  test('both create and retrieve requirement set', async () => {
    const set = { id: 'urs-001', ... };
    
    const inMemResult = await inMemoryRepo.createRequirementSet(set);
    const pgResult = await postgresRepo.createRequirementSet(set);
    
    expect(inMemResult.id).toBe(set.id);
    expect(pgResult.id).toBe(set.id);
  });

  test('both handle version history', async () => {...});
  test('both enforce immutability of approved versions', async () {...});
  test('both track revisions for concurrency', async () {...});
  test('both maintain append-only audit trail', async () {...});
});
```

**Coverage**: 15-20 contract tests covering all methods

### End-to-End Tests (P1C)

With actual PostgreSQL running, verify:
- Data persistence across restarts
- Concurrent update conflicts
- Transactional operations
- Audit trail completeness

---

## 10. DEPENDENCIES

### Required
- ✅ `@backstage/backend-plugin-api` — DatabaseService (already in deps)
- ✅ Knex.js — SQL query builder (included via Backstage)
- ✅ `pg` driver — PostgreSQL client (add to `backend/package.json`)

### Optional
- Database migration tool (Flyway, Knex migrations, or manual SQL)

---

## 11. PERFORMANCE TARGETS

### Query Performance
- `getRequirementSet(id)`: < 10ms (indexed by PK)
- `listRequirementSets(50 offset 0)`: < 50ms (indexed by status)
- `getRequirementVersions(req-id)`: < 50ms (indexed by requirement_id)

### Connection Pooling
- 2-10 concurrent connections (configurable)
- Automatic connection recycling
- Handled by Backstage DatabaseService

---

## 12. WHAT'S DEFERRED (P1C+)

| Item | Why | When |
|------|-----|------|
| Routes for new endpoints | Database layer first | P1B |
| Transactional operations | Multi-step workflows | P1C |
| Real integration tests | Need actual DB | P1C |
| Performance tuning | Measure first | P2 |
| Database migrations UI | Admin feature | P2+ |

---

## COMPLETION CRITERIA

- ✅ PostgreSQL repository implements `IURSRepository` fully
- ✅ Contract tests prove parity with in-memory
- ✅ Configuration supports both in-memory and PostgreSQL
- ✅ Optimistic locking implemented (revision field)
- ✅ Error handling for all common failures
- ✅ Fallback to in-memory if PostgreSQL unavailable
- ✅ Documentation complete
- ✅ Zero breaking changes to existing routes

**Status**: ✅ **STRATEGY COMPLETE — READY FOR P1B IMPLEMENTATION**

---

## NEXT STEPS

1. **P1B Task**: Implement `PostgresURSRepository` class
2. Implement all 25+ CRUD methods using Knex.js
3. Write contract tests comparing both repositories
4. Add configuration flag for runtime repository selection
5. Test fallback to in-memory
6. Verify production readiness

**Estimated Duration**: 2-4 focused work sessions

---

**Strategy Document**: 2026-08-25  
**Author**: Architecture Team  
**Reviewer**: Ready for engineering approval  
