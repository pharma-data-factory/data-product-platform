# URS COMPOSER P1A PERSISTENCE — VERIFICATION CHECKLIST

**Date**: 2026-08-25  
**Phase**: Evidence-Based Verification  
**Status**: Checklist + Execution Instructions

---

## COMPLETED CHANGES

### ✅ Step 1: Explicit Persistence Configuration

**File**: `plugins/urs-composer-backend/src/plugin.ts`

**Changes**:
- Added `Config` import from @backstage/config
- Added `getPersistenceMode()` function to read configuration
- Removed silent fallback to in-memory
- New behavior:
  - Mode: `postgres` (default) → Must succeed or FAIL startup
  - Mode: `memory` (explicit config) → Allowed for testing
  - Warns clearly when using in-memory
  - Throws error with helpful message if PostgreSQL fails

**Configuration**:
```yaml
# In app-config.yaml
ursComposer:
  persistence:
    mode: postgres  # 'postgres' (default) or 'memory'
```

**Verification**: ✅ Code change complete

---

### ✅ Step 2: Contract Test Suite Created

**File**: `plugins/urs-composer-backend/src/repository.test.ts`

**Implementation**:
- 8 test suites (13 test scenarios)
- Identical tests for both URSRepository and PostgresURSRepository
- Tests cover:
  - Business Capability CRUD
  - Requirement Set CRUD
  - Requirement Versioning
  - Baseline Persistence
  - Approval Workflows
  - Approval Instances and Steps
  - Audit Trail
  - Transactions

**Verification**: ✅ Code change complete, ready for execution

---

## REQUIRED VERIFICATION TESTS

### TEST MATRIX

All tests must be executed against REAL PostgreSQL database. Use actual results only.

Allowed values: **PASS**, **FAIL**, **NOT_IMPLEMENTED**, **NOT_APPLICABLE**

| # | Test | Method | Result | Evidence |
|---|------|--------|--------|----------|
| 1 | PostgreSQL migrations | Run: `migrations.up()` on empty DB | ? | [Run test] |
| 2 | Migration idempotency | Run migrations twice | ? | [Run test] |
| 3 | Seed idempotency | Run seeds twice, check duplicates | ? | [Run test] |
| 4 | Contract: Memory | Execute `repository.test.ts` against in-memory | ? | [Run test] |
| 5 | Contract: PostgreSQL | Execute `repository.test.ts` against PostgreSQL | ? | [Run test] |
| 6 | Restart durability | Create data → Close → Recreate → Read | ? | [Run test] |
| 7 | Optimistic concurrency | Two clients update same entity | ? | [Run test] |
| 8 | Approved immutability | Attempt to modify approved version | ? | [Run test] |
| 9 | Baseline immutability | Baseline refs remain unchanged | ? | [Run test] |
| 10 | Supersession | Mark v1.0 as SUPERSEDED, create v1.1 | ? | [Run test] |
| 11 | Transaction rollback | Begin TX → Fail → Rollback | ? | [Run test] |
| 12 | Audit immutability | No updateAuditEvent/deleteAuditEvent | ? | [Run test] |
| 13 | FK behavior | Historical data protected | ? | [Run test] |
| 14 | Production fail-fast | PostgreSQL unavailable → startup fails | ? | [Run test] |
| 15 | Architecture boundary | No violations detected | ? | [Run test] |

---

## TEST EXECUTION INSTRUCTIONS

### PREREQUISITE: PostgreSQL Setup

1. **Option A: Docker**
```bash
docker run -d \
  --name postgres-urs-test \
  -e POSTGRES_DB=urs_composer \
  -e POSTGRES_USER=urs_test \
  -e POSTGRES_PASSWORD=test_password \
  -p 5432:5432 \
  postgres:15-alpine
```

2. **Option B: Local PostgreSQL**
```bash
# Ensure PostgreSQL running locally
psql -U postgres -c "CREATE DATABASE urs_composer;"
```

3. **Configure app-config.yaml**
```yaml
database:
  client: pg
  connection:
    host: localhost
    port: 5432
    user: urs_test
    password: test_password
    database: urs_composer

ursComposer:
  persistence:
    mode: postgres
```

---

### TEST 1: PostgreSQL Migrations

**Execution**:
```bash
# Clean database
dropdb urs_composer
createdb urs_composer

# Run migration
cd plugins/urs-composer-backend
npm test -- --testNamePattern="migrations"
```

**Expected**: ✅ PASS
- 9 tables created
- All indexes in place
- Foreign keys configured

**Result**: [ Run and record ]

---

### TEST 2: Migration Idempotency

**Execution**:
```bash
# Run migration again on same database
npm test -- --testNamePattern="idempotency"
```

**Expected**: ✅ PASS
- No errors
- Same 9 tables (unchanged)
- All data preserved

**Result**: [ Run and record ]

---

### TEST 3: Seed Idempotency

**Execution**:
```bash
npm test -- --testNamePattern="seed"
```

**Expected**: ✅ PASS
- 10 Business Capabilities (no duplicates)
- 2 Approval Workflows (no duplicates)
- Stable IDs on repeated runs

**Result**: [ Run and record ]

---

### TEST 4: Contract Tests — In-Memory

**Execution**:
```bash
# Run with in-memory repository
PERSISTENCE_MODE=memory npm test -- --testNamePattern="Repository Contract"
```

**Expected**: ✅ PASS (all 13 scenarios)
- Business Capability CRUD: PASS
- Requirement Set CRUD: PASS
- Version History: PASS
- Baselines: PASS
- Workflows: PASS
- Instances/Steps: PASS
- Audit: PASS
- Transactions: PASS

**Result**: [ Run and record ]

---

### TEST 5: Contract Tests — PostgreSQL

**Execution**:
```bash
# Run with PostgreSQL repository
PERSISTENCE_MODE=postgres npm test -- --testNamePattern="Repository Contract"
```

**Expected**: ✅ PASS (all 13 scenarios)
- Same results as in-memory
- Proves behavioral equivalence

**Result**: [ Run and record ]

---

### TEST 6: Restart Durability

**Execution**:
```typescript
// pseudo-code test
test('restart durability', async () => {
  // Initialize repo
  const repo = new PostgresURSRepository(db);
  
  // Create test data
  const set = await repo.createRequirementSet({...});
  const version = await repo.createRequirementVersion({...});
  const baseline = await repo.createBaseline({...});
  const event = createAuditEvent({...});
  
  // Close repository (simulates shutdown)
  // ... simulate process shutdown ...
  
  // Recreate repository
  const repo2 = new PostgresURSRepository(db);
  
  // Verify all data persists
  const retrieved = await repo2.getRequirementSet(set.id);
  expect(retrieved).toBeDefined();
  expect(retrieved.id).toBe(set.id);
  
  // Similar for version, baseline, audit
});
```

**Expected**: ✅ PASS
- All data survives restart
- No data loss

**Result**: [ Run and record ]

---

### TEST 7: Optimistic Concurrency

**Execution**:
```typescript
test('optimistic concurrency', async () => {
  // Create version
  const version = await repo.createRequirementVersion({
    id: 'v1',
    requirementId: 'req-1',
    version: '1.0',
    versionNumber: 100,
    status: URSStatus.DRAFT,
    title: 'Test',
    statement: 'Test',
    revision: 1,
  });

  // Client A reads version (revision = 1)
  const clientA = await repo.getRequirementVersion('v1');
  expect(clientA.revision).toBe(1);

  // Client B reads version (revision = 1)
  const clientB = await repo.getRequirementVersion('v1');
  expect(clientB.revision).toBe(1);

  // Client A updates
  clientA.status = URSStatus.APPROVED;
  await repo.updateRequirementVersion(clientA);
  
  // Verify revision incremented
  const afterA = await repo.getRequirementVersion('v1');
  expect(afterA.revision).toBe(2);

  // Client B attempts update with old revision
  clientB.status = URSStatus.IN_REVIEW;
  try {
    await repo.updateRequirementVersion(clientB);
    // Should fail or return 0 rows affected
    fail('Should have detected conflict');
  } catch (error) {
    expect(error.message).toContain('conflict');
  }
});
```

**Expected**: ✅ PASS
- Concurrent update detected
- Old revision rejected
- No silent overwrite

**Result**: [ Run and record ]

---

### TEST 8: Approved Immutability

**Execution**:
```typescript
test('approved version immutability', async () => {
  // Create approved version
  const version = await repo.createRequirementVersion({
    id: 'v1',
    status: URSStatus.APPROVED,
    // ... other fields
  });

  // Attempt to modify
  const updated = { ...version, statement: 'Modified' };
  
  // Application should prevent update
  try {
    await repo.updateRequirementVersion(updated);
    fail('Should not allow update of approved version');
  } catch (error) {
    expect(error.message).toContain('APPROVED');
  }

  // Verify unchanged
  const retrieved = await repo.getRequirementVersion('v1');
  expect(retrieved.statement).toBe(version.statement);
});
```

**Expected**: ✅ PASS
- Update blocked
- Approved version unchanged
- Must create new revision instead

**Result**: [ Run and record ]

---

### TEST 9: Baseline Immutability

**Execution**:
```typescript
test('baseline immutability', async () => {
  // Create baseline with refs
  const baseline = await repo.createBaseline({
    id: 'bl-1',
    requirementVersionIds: ['uuid-a', 'uuid-b'],
    status: URSStatus.APPROVED,
  });

  // Create new version
  await repo.createRequirementVersion({
    id: 'uuid-c',
    status: URSStatus.APPROVED,
  });

  // Read baseline again
  const retrieved = await repo.getBaseline('bl-1');
  
  // Must still reference original UUIDs
  expect(retrieved.requirementVersionIds).toEqual(['uuid-a', 'uuid-b']);
  expect(retrieved.requirementVersionIds).not.toContain('uuid-c');
});
```

**Expected**: ✅ PASS
- Baseline refs stable
- No dynamic resolution to latest versions

**Result**: [ Run and record ]

---

### TEST 10: Supersession

**Execution**:
```typescript
test('supersession', async () => {
  // Create v1.0 approved
  const v1 = await repo.createRequirementVersion({
    id: 'req-v-001',
    requirementId: 'req-1',
    version: '1.0',
    status: URSStatus.APPROVED,
  });

  // Create v1.1 draft
  const v11 = await repo.createRequirementVersion({
    id: 'req-v-002',
    requirementId: 'req-1',
    version: '1.1',
    status: URSStatus.DRAFT,
  });

  // Approve v1.1
  v11.status = URSStatus.APPROVED;
  await repo.updateRequirementVersion(v11);

  // Mark v1.0 as superseded
  v1.status = URSStatus.SUPERSEDED;
  await repo.updateRequirementVersion(v1);

  // Verify both still queryable
  const retrieved1 = await repo.getRequirementVersion('req-v-001');
  const retrieved11 = await repo.getRequirementVersion('req-v-002');

  expect(retrieved1.status).toBe(URSStatus.SUPERSEDED);
  expect(retrieved11.status).toBe(URSStatus.APPROVED);
});
```

**Expected**: ✅ PASS
- Both versions remain
- No data deletion
- Status correctly updated

**Result**: [ Run and record ]

---

### TEST 11: Transaction Rollback

**Execution**:
```typescript
test('transaction rollback', async () => {
  const tx = await repo.beginTransaction();

  try {
    await tx.execute(async () => {
      // Update approval instance
      const instance = {...};
      // Create baseline
      const baseline = {...};
      // Create audit event
      // ... simulate failure before commit
      throw new Error('Simulated failure');
    });
  } catch (error) {
    await tx.rollback();
  }

  // Query database directly
  // Expected: No changes persisted
  const instances = await repo.listApprovalInstances('baseline-id');
  expect(instances.length).toBe(0); // Not created
});
```

**Expected**: ✅ PASS
- Transaction rolled back
- No partial state
- All-or-nothing

**Result**: [ Run and record ]

---

### TEST 12: Audit Immutability

**Execution**:
```typescript
test('audit immutability - no update/delete', async () => {
  // Create audit event
  const event = await repo.createAuditEvent({...});

  // Attempt update
  try {
    // This method should not exist or be no-op
    await (repo as any).updateAuditEvent(event);
    fail('updateAuditEvent should not exist');
  } catch (error) {
    // Expected
  }

  // Attempt delete
  try {
    await (repo as any).deleteAuditEvent(event.id);
    fail('deleteAuditEvent should not exist');
  } catch (error) {
    // Expected
  }

  // Verify event unchanged
  const trail = await repo.getAuditTrail(event.entityId);
  expect(trail.find(e => e.id === event.id)).toBeDefined();
});
```

**Expected**: ✅ PASS
- No update API
- No delete API
- Append-only guaranteed

**Result**: [ Run and record ]

---

### TEST 13: Foreign Key Protection

**Execution**:
```typescript
test('foreign key constraints', async () => {
  // Create requirement set
  const set = await repo.createRequirementSet({...});

  // Create baseline referencing set
  const baseline = await repo.createBaseline({
    requirementSetId: set.id,
  });

  // Attempt to delete requirement set
  try {
    // Direct DB operation (should fail with FK constraint)
    await db.raw('DELETE FROM requirement_sets WHERE id = ?', [set.id]);
    fail('FK constraint should prevent deletion');
  } catch (error) {
    expect(error.message).toContain('foreign key');
  }

  // Verify baseline still intact
  const retrieved = await repo.getBaseline(baseline.id);
  expect(retrieved).toBeDefined();
});
```

**Expected**: ✅ PASS
- FK constraints enforced
- Historical data protected

**Result**: [ Run and record ]

---

### TEST 14: Production Fail-Fast

**Execution**:
```bash
# Set invalid PostgreSQL configuration
export DATABASE_HOST=localhost:9999  # Invalid
export PERSISTENCE_MODE=postgres

# Start backend
npm start

# Expected: Startup fails with clear error
# NOT: Fallback to in-memory silently
```

**Expected**: ✅ PASS
- Startup FAILS (exit code != 0)
- Error message mentions PostgreSQL unavailable
- No fallback to memory

**Result**: [ Run and record ]

---

### TEST 15: Architecture Boundary

**Execution**:
```typescript
test('architecture boundary - no violations', () => {
  // Verify no cross-plugin access
  const repoCode = require('./postgres-repository');
  const pluginCode = require('./plugin');

  // Check: No validation-expert imports
  expect(repoCode.toString()).not.toContain('validation-expert');
  
  // Check: No Catalog direct table access
  expect(repoCode.toString()).not.toContain('catalog_entities');
  
  // Check: No custom IAM
  expect(repoCode.toString()).not.toContain('custom_auth');
  expect(repoCode.toString()).not.toContain('IAM');

  // Check: IURSRepository interface preserved
  expect(repoCode.PostgresURSRepository.prototype.createRequirementSet).toBeDefined();
  expect(repoCode.PostgresURSRepository.prototype.getRequirementSet).toBeDefined();
  // ... all methods
});
```

**Expected**: ✅ PASS
- No Backstage fork
- No custom IAM
- No cross-plugin access
- Interface preserved

**Result**: [ Run and record ]

---

## GATE RULE

Gate passes if and ONLY if:

✅ TEST 1: PostgreSQL migrations: **PASS**
✅ TEST 5: Contract PostgreSQL: **PASS**
✅ TEST 6: Restart durability: **PASS**
✅ TEST 7: Optimistic concurrency: **PASS**
✅ TEST 8: Approved immutability: **PASS**
✅ TEST 9: Baseline immutability: **PASS**
✅ TEST 11: Transaction rollback: **PASS**
✅ TEST 3: Seed idempotency: **PASS**
✅ TEST 14: Production fail-fast: **PASS**
✅ TEST 15: Architecture boundary: **PASS**

**All 10 tests must be PASS. No exceptions.**

---

## EXECUTION RECORD

When tests are run, fill in this matrix:

| Test | Status | Notes | Evidence |
|------|--------|-------|----------|
| PostgreSQL migrations | [ ] PASS [ ] FAIL | | |
| Migration idempotency | [ ] PASS [ ] FAIL | | |
| Seed idempotency | [ ] PASS [ ] FAIL | | |
| Contract: Memory | [ ] PASS [ ] FAIL | | |
| Contract: PostgreSQL | [ ] PASS [ ] FAIL | | |
| Restart durability | [ ] PASS [ ] FAIL | | |
| Optimistic concurrency | [ ] PASS [ ] FAIL | | |
| Approved immutability | [ ] PASS [ ] FAIL | | |
| Baseline immutability | [ ] PASS [ ] FAIL | | |
| Supersession | [ ] PASS [ ] FAIL | | |
| Transaction rollback | [ ] PASS [ ] FAIL | | |
| Audit immutability | [ ] PASS [ ] FAIL | | |
| FK protection | [ ] PASS [ ] FAIL | | |
| Production fail-fast | [ ] PASS [ ] FAIL | | |
| Architecture boundary | [ ] PASS [ ] FAIL | | |

---

## NEXT STEPS

1. **Set up PostgreSQL** (Docker or local)
2. **Configure app-config.yaml** with PostgreSQL connection
3. **Run each test** in sequence
4. **Record results** in matrix
5. **Fix failures** or escalate
6. **Document findings** in final report
7. **Gate decision**: PASS or FAIL

---

**This checklist ensures evidence-based verification.**
