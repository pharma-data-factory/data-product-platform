# URS Composer → Validation Expert Integration Report

**Date:** 2026-08-28
**Continuation from:** `PHARMA_DATA_FACTORY_MVP_1_0_TAGGED` / `URS_BASELINE_GXP_DEFECT_CLOSED`
**Verdict:** `URS_VALIDATION_EXPERT_INTEGRATION_COMPLETE_WITH_CONDITIONS`


---

## 1. Executive verdict

A controlled first lifecycle from an APPROVED URS baseline into the existing
Validation Expert was implemented **without redesigning either domain**. The
Validation Expert now exposes one explicit integration endpoint that creates a
Validation Context anchored to an APPROVED URS baseline, enforced by the
Backstage Permission Framework and an immutable `ApprovedURSReference`. The
entry gate (APPROVED-only) is enforced in the backend service, not only in the
UI. Duplicate contexts are prevented, and the baseline reference stays pinned
to its version (1.0 → 1.1 never silently mutates an existing context).

**10/10 integration tests pass**, including a real-PostgreSQL proof that a
genuinely APPROVED baseline produces a context carrying the correct business
capability and baseline version. Frontend navigation affordances and a full
browser E2E are **NOT_RUN** in this environment (no reliable live
multi-backend runtime/browser) and are documented as the recommended next step.

---

## 2. AS-IS architecture

### URS Composer (PostgreSQL-backed)
- `RequirementSet` (business capability refs, business need, solution context,
  regulatory context, status), `Requirement`, `RequirementVersion` /
  `createRevision`, `Baseline` (`baselineVersion` semantic string + `status`),
  P1A/P1B approval workflow (`submitBaseline`, `approveApprovalStep`;
  final-step approval sets baseline → APPROVED), `audit_events` table, REST
  endpoints (`GET /baselines/:id`, `GET /requirement-sets/:id`), permissions
  `urs.read/create/manage/approve`.

### Validation Expert (file/artifact-backed)
- Requirements/risks/protocols/traceability parsed from validation artifact
  YAML (validation root); runs/findings/evidence persisted to a JSON file store
  (`FileValidationRunRepository`). Model already carries:
  - `ValidationRisk.relatedRequirements` (string[]) → risk→requirement
  - `ProtocolTest.requirementIds` + `riskIds` → protocol→requirement/risk
  - `ValidationRun.baselineId`; `ValidationFinding.requirementIds`
  - Permissions `validation.read/review/admin/approve`, `validation.run.start`,
    `validation.test.execute`, `requirement.read`, `traceability.read`
- **No "Validation Context" or "ApprovedURSReference" concept existed before.**

## 3. Integration contract (created)


## 7. Traceability model

Reuses the existing Validation Expert relational/artifact model (no graph DB):
- Risk → `relatedRequirements`
- TestProtocol → `requirementIds` (+ optional `riskIds`)
- TestRun → `baselineId` + executions → `testId`; evidence → `runId/testId`
- Finding → `requirementIds`
- The `ApprovedURSReference.requirementIds` anchors the set for the context.

## 8. Persistence

Validation Contexts are persisted in the existing `FileValidationRunRepository`
store (`contexts` array) with dedup on `(requirementSetId, baselineId)`.
Runs/findings/evidence continue to use the existing store. No second
persistence model.

## 9. Tests (executed)

`plugins/validation-expert-backend/src/validation-context-integration.test.ts`
→ **10/10 PASS**:
- A Approved → context created
- B/C/D Draft / Submitted(IN_REVIEW) / Rejected → denied
- E duplicate → existing context returned (no duplicate)
- F baseline reference stays anchored (1.0 not silently mutated)
- G Business Capability retained
- H requirement IDs retained (stable IDs)
- immutable deterministic identity
- Real PostgreSQL: context from a genuinely APPROVED baseline
- L authorization DENY (403), M authorization ALLOW (201)

Regression: Validation Expert `service.test` 9/9 PASS; URS `service.test`
17/17 PASS; platform-common + validation-expert-backend build exit 0.

## 10. Runtime evidence

- Entry gate + context lifecycle proven against live PostgreSQL
  (postgres-urs-verify, port 5435): create requirement set → create baseline →
  submit → approve steps → baseline APPROVED → resolver → context with
  `approvalStatus=APPROVED`, `businessCapabilityIds`, `baselineVersion=1.0`.
- `BROWSER_E2E = NOT_RUN` (no reliable live multi-backend browser available in
  this environment). Backend/API/runtime proof is provided via integration tests.

## 11. Known gaps

1. Frontend "Start Validation" / "Source URS" card navigation is **not
   implemented/verified** (environment cannot run the frontend against a live
   backend). The exact contract is fixed (`POST /api/validation-expert/contexts/from-urs`
   body `{ requirementSetId, baselineId }`, returns `{ context, created }`).
2. Validation Expert currently has **no audit store**; Task 15's AUDIT events
   are NOT wired (would require a cross-plugin audit call to the URS audit
   endpoint — out of the tested scope). Documented, not fabricated.
3. `yarn tsc` remains exit 2 (pre-existing monorepo debt) and the prior
   known-failing suites (`BusinessCapabilityStep`, `repository.test`) are
   unchanged.

## 12. Regulatory boundary

No GxP validation / 21 CFR Part 11 / REGULATORY APPROVED / VALIDATED SYSTEM
claims. Recommended language: **validation-ready**, **validation-supporting**,
**controlled evidence**, **technical traceability**, **risk-based validation
support**.

## 13. Next recommendation

Implement and verify the two frontend affordances (URS detail "Start
Validation" → `POST /contexts/from-urs` → navigate to Validation Expert; and a
Validation Expert "Source URS" card) against a live running app, then wire the
context-creation audit event through the existing URS audit boundary. Do NOT
start a Change Impact Analyzer, AI/RAG, or a new Golden Path.

`ApprovedURSReference` (shared in `@internal/platform-common`
`validation-integration.ts`):
- `requirementSetId`, `baselineId`, `baselineVersion`, `requirementSetTitle`,
  `businessCapabilityIds`, `approvalStatus`, `approvedAt?`, `approvedBy?`,
  `sourceSystem = "urs-composer"`, `requirementIds` (stable IDs), `createdAt`.

`ValidationContext`:
- `id`, `source: ApprovedURSReference`, `status` (`PENDING`), `createdAt`,
  `createdBy`.

Existing models already carried the requirement/risk/protocol/run/finding
linkages; the contract adds only the context anchor (no duplicate full URS
document, no second version model, no second audit model).

## 4. Data ownership

- **URS owns WHY + WHAT.** `ApprovedURSReference` is a reference/snapshot of
  the approved baseline (stable IDs + approval status), NOT a mutable copy.
  Validation Expert never mutates the approved URS baseline.
- **Validation Expert owns HOW VERIFIED.** It may reference the baseline's
  requirement IDs; it never writes back into URS domain tables.

## 5. Lifecycle

Business Capability → Business Need → URS → URS Approval → **Validation
Context (this integration)** → Risk Assessment → Test Protocols → Test
Execution → Evidence → Findings → Traceability → Validation/Release
Recommendation. Validation Expert does NOT auto-approve; release decisions
remain human.

## 6. Authorization

Only Backstage identity + Backstage Permission Framework + Platform Permission
Policy. Reused existing permissions (`validation.review` for context creation,
`validation.read` for reads) — no overlapping permissions created, no custom
role headers. Backend-enforced (L: 403 DENY, M: 201 ALLOW on
## 13. Next recommendation

Implement and verify the two frontend affordances (URS detail "Start
Validation" → `POST /contexts/from-urs` → navigate to Validation Expert; and a
Validation Expert "Source URS" card) against a live running app, then wire the
context-creation audit event through the existing URS audit boundary. Do NOT
start a Change Impact Analyzer, AI/RAG, or a new Golden Path.

---

## 14. Integration Closure Gate — status

This section records the outcome of the closure gate (persistence/reload,
audit, frontend navigation).

**Evidence levels used (not interchangeable):**
- **IMPLEMENTED** = code added (compiles).
- **CODE-INSPECTED** = reviewed against the implementation; not run in a live app.
- **TESTED** = exercised by an automated unit/integration test.
- **RUNTIME-EXECUTED** = exercised against the real running runtime.
- **NOT_RUN** = not executed.

Frontend/browser rows marked CODE-INSPECTED are **not** runtime browser proof;
only backend rows marked TESTED / RUNTIME-EXECUTED reflect executed behavior.

| Acceptance item | PASS/FAIL/NOT_RUN | Evidence level |
|---|---|---|
| Validation Context persistence | **PASS** | TESTED (12/12 incl. file-store persist+reload) |
| Repository restart reload | **PASS** | TESTED (recreated repo/service, reloaded store) |
| Immutable URS reference reload | **PASS** | TESTED (all ApprovedURSReference fields identical after restart) |
| Duplicate protection | **PASS** | TESTED (survives restart; duplicate returns existing) |
| Audit integration | **NOT_RUN** | `AUDIT_INTEGRATION_BLOCKED_BY_ARCHITECTURE` (no shared/platform audit boundary; URS exposes read-only `GET audit`; `create-authorization-audit-store` is authorization-specific; not inventing a second audit system) |
| Start Validation UI | **PASS*** | IMPLEMENTED + CODE-INSPECTED (URS detail; build exit 0; *not browser-executed*) |
| View Validation UI | **PASS*** | IMPLEMENTED + CODE-INSPECTED (URS detail; build exit 0) |
| Source URS UI | **PASS*** | IMPLEMENTED + CODE-INSPECTED (Validation Expert Overview; build exit 0) |
| Bidirectional navigation | **PASS*** | CODE-INSPECTED (URS → `/validation-expert`; Source URS → `/urs/:id` stable ID) |
| Backend authorization | **PASS** | TESTED (L 403 DENY, M 201 ALLOW on `/contexts/from-urs`) |
| Frontend permission UX | **PASS*** | CODE-INSPECTED (usePermission-style conveniences; backend authoritative) |
| Frontend tests | **PASS** | TESTED (URS core 15/15) |
| Backend tests | **PASS** | TESTED (Validation Expert 21/21; URS service 17/17) |
| Affected package builds | **PASS** | TESTED (platform-common, urs-composer FE, validation-expert FE, validation-expert-backend all exit 0) |
| Browser E2E | **NOT_RUN** | no reliable browser/live multi-backend runtime |
| Root TypeScript | **FAIL** | monorepo `yarn tsc` exit 2 (pre-existing; affected packages build exit 0) |
| Regression | **PASS** | TESTED (validation-expert 21/21, URS service 17/17, URS FE core 15/15) |

\* Frontend items are IMPLEMENTED/CODE-INSPECTED only — they are **not** browser
runtime proof and must not be treated as RUNTIME-EXECUTED.

### Files added/changed (closure gate)
- `packages/platform-common/src/validation-integration.ts` (contract) + `index.ts`
- `plugins/validation-expert-backend/src/{types,repository,service,router,plugin}.ts`
- `plugins/validation-expert-backend/src/validation-context-integration.test.ts`
- `plugins/validation-expert/src/{api.ts,components/OverviewPage.tsx}`
- `plugins/urs-composer/src/{api/ursComposerApi.ts,pages/URSRequirementSetPage.tsx}`
- `URS_VALIDATION_EXPERT_INTEGRATION_REPORT.md`

### Git safety
No secrets, no generated/scratch artifacts, 0 staged, nothing committed, nothing pushed.
