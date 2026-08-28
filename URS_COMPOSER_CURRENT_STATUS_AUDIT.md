# URS Composer — Current Implementation Status Audit

**Date:** 2026-08-26  
**Mode:** READ-ONLY (no implementation, no refactor)  
**Evidence basis:** Actual repository code + freshly executed tests  
**Old status reports:** Used only as historical claims; not accepted as current PASS unless re-verified

---

## Final Verdict

# URS_COMPOSER_1_0_PARTIAL

Backend P0/P1A/P1B capabilities are substantially present and HTTP-verified (in-memory stack).  
Frontend authoring wizard shells through steps 2–5 are largely coded, but the product is **not end-to-end usable**: app mounting is incomplete, library/detail/approval UIs are placeholders, draft update is stubbed, requirements are not persisted on Save Draft, steps 6–8/submit are incomplete, and frontend tests currently fail to execute.

---

## 1. Plugin / Architecture

| Area | Classification | Evidence |
|------|----------------|----------|
| URS backend plugin | **IMPLEMENTED** | `plugins/urs-composer-backend/src/plugin.ts` registered in `packages/backend/src/index.ts` |
| PostgreSQL / memory mode | **IMPLEMENTED** | Explicit `ursComposer.persistence.mode`; fail-fast on postgres init failure |
| Router → Service → Repository | **IMPLEMENTED** | `router.ts`, `service.ts`, `repository.ts`, `postgres-repository.ts`, `repository-interface.ts` |
| Permission Framework hooks | **IMPLEMENTED** | `authorize()` on routes using `urs.read/create/manage/approve` from `@internal/platform-common` |
| Central permission definitions | **IMPLEMENTED** | `packages/platform-common/src/permissions.ts` (+ `permissions/urs.ts`) |
| Community RBAC discovery of URS perms | **PARTIAL** | Permissions exported; RBAC registry operational discovery not re-verified in this audit |
| Frontend plugin package | **PARTIAL** | `plugins/urs-composer` exists; dependency in `packages/app/package.json` |
| Frontend mount in running app | **NOT_IMPLEMENTED / BLOCKED** | No import in `packages/app/src/App.tsx` features; no new-frontend plugin export; `index.ts` only exports `URSComposerPage` |
| Detail route extension | **SCAFFOLDED** | `URSRequirementSetPage.tsx` exists; **not** registered in `plugin.ts` extensions |
| API client | **IMPLEMENTED** | `src/api/ursComposerApi.ts` covers P0 + P1B methods |
| Architecture docs / prior gate reports | **PARTIAL** | Multiple P0/P1A/P1B/P1C reports exist; some claims exceed current frontend reality |

---

## 2. Database / Persistence

| Entity / Concern | Classification | Evidence |
|------------------|----------------|----------|
| Business Capabilities | **IMPLEMENTED** | Migrations + seeds + service/API |
| Requirement Sets | **IMPLEMENTED** | Schema + create/list/get |
| Requirements (P0 table) | **IMPLEMENTED** | Create/list via API |
| Requirement Versions | **IMPLEMENTED** | Migrations + versioning service + P1B routes |
| Baselines | **IMPLEMENTED** | Create/list/get + immutability tests (historical P1A report; HTTP suite green) |
| Approval Workflows | **IMPLEMENTED** | Seeded templates + list API |
| Approval Instances / Steps | **IMPLEMENTED** | Submit/approve/reject orchestration in service |
| Audit Trail | **IMPLEMENTED** | Append-only events; GET audit |
| PostgreSQL repository | **IMPLEMENTED** | Full `postgres-repository.ts` |
| Migrations | **IMPLEMENTED** | `db/migrations.ts` |
| Seeds | **IMPLEMENTED** | Idempotent capabilities + workflows |
| Optimistic concurrency | **IMPLEMENTED** (code) | Revision checks in postgres repo; **409 via HTTP marked NOT_APPLICABLE** in P1B suite |
| Approved-version immutability | **IMPLEMENTED** (code + prior P1A claim) | Enforced in repository update path |
| Baseline immutability | **IMPLEMENTED** (code + prior P1A claim) | Snapshot semantics |
| Restart durability | **IMPLEMENTED** (code + prior P1A claim) | Postgres path |
| Transaction rollback | **IMPLEMENTED** (code + prior P1A claim) | `beginTransaction` / rollback |
| Current P1A suite re-run | **BLOCKED / FAIL evidence** | `verification-run.log` shows `p1a-verification.test.ts` timeouts (all tests failed in that log). Treat live Postgres gate as **not currently green** without a fresh successful run |

---

## 3. Backend API Inventory

### P0 / Core

| Method | Route | Permission | Implemented | HTTP-tested (executed this audit) | PG-tested (this audit) |
|--------|-------|------------|-------------|-----------------------------------|-------------------------|
| GET | `/health` | none | YES | YES (200) | N/A |
| GET | `/capabilities` | urs.read | YES | YES | NO (this run used in-mem HTTP suite) |
| GET | `/capabilities/:id` | urs.read | YES | partial (suite hits list) | NO |
| POST | `/requirement-sets` | urs.create | YES | YES (201) | NO |
| GET | `/requirement-sets` | urs.read | YES | YES | NO |
| GET | `/requirement-sets/:id` | urs.read | YES | implied by flows | NO |
| PUT | `/requirement-sets/:id` | urs.manage | **STUB** (`Update not yet implemented`) | NO meaningful update | NO |
| POST | `/requirement-sets/:id/submit` | urs.create | YES (set-level) | not in P1B-11 matrix | NO |
| POST | `/requirement-sets/:id/approve` | urs.approve | YES (set-level legacy) | suite focuses step approve | NO |
| POST | `/requirement-sets/:id/reject` | urs.approve | YES | rejection lifecycle YES | NO |
| GET | `/requirement-sets/:id/audit` | urs.read | YES | not in 27-test matrix | NO |
| GET | `/requirement-sets/:id/approvals` | urs.read | YES | partial | NO |
| POST | `/requirement-sets/:setId/requirements` | urs.create | YES | via lifecycle fixtures | NO |
| GET | `/requirement-sets/:setId/requirements` | urs.read | YES | partial | NO |
| POST | `/validate` | urs.read | YES (quality heuristics) | not in matrix | NO |
| POST | `/requirement-sets/:id/validate` | urs.read | PARTIAL (TODO full-set) | NO | NO |

### P1B

| Method | Route | Permission | Implemented | HTTP-tested (27/27 this audit) |
|--------|-------|------------|-------------|--------------------------------|
| POST | `/requirements/:id/revisions` | urs.create | YES | YES |
| GET | `/requirements/:id/versions` | urs.read | YES | YES |
| GET | `/requirements/:id/versions/:version` | urs.read | YES | YES |
| POST | `/requirement-sets/:id/baselines` | urs.manage | YES | YES |
| GET | `/requirement-sets/:id/baselines` | urs.read | YES | YES |
| GET | `/baselines/:id` | urs.read | YES | YES |
| GET | `/approval-workflows` | urs.read | YES | YES |
| POST | `/baselines/:id/submit` | urs.manage | YES | YES |
| GET | `/approvals/:id` | urs.read | YES | YES |
| POST | `/approvals/:id/steps/:stepId/approve` | urs.approve | YES | YES |
| POST | `/approvals/:id/steps/:stepId/reject` | urs.approve | YES | YES |

**Executed this audit:** `yarn test p1b-http-final-verification.test.ts` → **27 passed / 0 failed**.

Also proven via that suite: **401**, **403**, actor spoofing protection, approval + rejection lifecycle (HTTP), P0 regression.

---

## 4. Frontend Landing Page

| Capability | Status | Evidence |
|------------|--------|----------|
| Create URS CTA | **PARTIAL** | Navigates to create route when plugin mounted |
| URS Library / Browse | **SCAFFOLD_ONLY** | Button has **no onClick / no navigation** |
| My Drafts | **MISSING** | Not present |
| Pending Reviews | **MISSING** | Not present |
| Real API data on landing | **MISSING** | Static marketing cards only |
| Loading / empty / error | **MISSING** | N/A (no data fetch) |
| Permission-aware actions | **MISSING** | No `usePermission` / Identity gating |

File: `plugins/urs-composer/src/pages/URSComposerPage.tsx`

---

## 5. 8-Step Create Wizard

| Step | UI | Fields | State | Validation | API | Tests | Production usable |
|------|----|--------|-------|------------|-----|-------|-------------------|
| 1 Capability | YES | YES | YES | YES | YES (`listCapabilities`) | Code present; **suite fails to run** | **PARTIAL** |
| 2 Business Need | YES | YES | YES | YES (title + outcome) | via Save Draft set create | suite fail | **PARTIAL** |
| 3 URS Context | YES | YES | YES | YES (title/scope/GxP) | via Save Draft | suite fail | **PARTIAL** |
| 4 Requirements | YES | YES cards | YES local | YES | **not persisted on Save Draft** | suite fail | **PARTIAL** |
| 5 Acceptance Criteria | YES | linked AC | YES local | warning / step rules | **not persisted** | no dedicated AC tests found | **PARTIAL** |
| 6 Quality Review | YES | mock table | reads state | mock | backend quality API **not wired** | no | **SCAFFOLD_ONLY** |
| 7 Traceability | YES | summary counts | local | light | no graph API | no | **SCAFFOLD_ONLY** |
| 8 Review & Submit | YES | summary + solution fields | local | step validation | **Submit TODO** | no | **SCAFFOLD_ONLY** |

Classifications:
- Steps 1–5: **PARTIAL** (UI functional; persistence incomplete)
- Steps 6–8: **SCAFFOLD_ONLY** / incomplete submit
- Dirty warning / Save Draft UX: present
- Save Draft behavior: creates set once; subsequent update hits **stub**; **does not POST requirements**

---

## 6. Requirements Authoring

| Action | Backend | Frontend | Notes |
|--------|---------|----------|-------|
| Create requirement | YES | Local wizard only | API exists; wizard does not call it on save |
| Edit DRAFT | YES (service/repo) | Local edit | Update set stubbed |
| Delete DRAFT | uncertain/limited | Local remove | No dedicated delete route audited as primary UX |
| Classify / rationale / GxP | YES fields | YES | Local |
| Acceptance criteria | stored as `acceptanceIntent`/text domain | Local AC cards | No separate AC entity API |
| Link Business Capability | YES on set | YES step 1 | |
| Save draft | PARTIAL | YES button | Set create only; update stub |
| Reload draft | API get exists | **MISSING hydrate UX** | |
| Create revision | YES P1B | **MISSING UI** | |
| Version history UI | YES API | **MISSING** | |

---

## 7. URS Library

| Feature | Status |
|---------|--------|
| List sets | Backend YES / Frontend **MISSING** (button inert) |
| Search / filter / status / owner | **MISSING** |
| Open detail | Navigate intended; detail page **not mounted** |
| Drafts / approved / superseded views | **MISSING** |
| Real backend data in UI | **NO** |

---

## 8. Detail View Tabs

File: `URSRequirementSetPage.tsx` — static “URS-OEE (Example)”, status hard-coded DRAFT.

| Tab | Classification | Real API? |
|-----|----------------|-----------|
| Overview | **PLACEHOLDER** | NO |
| Business Context | **PLACEHOLDER** | NO |
| Requirements | **PLACEHOLDER** | NO |
| Solution | **PLACEHOLDER** | NO |
| Traceability | **PLACEHOLDER** | NO |
| Approval | **PLACEHOLDER** | NO |
| Audit | **PLACEHOLDER** | NO |

Also: page **not** provided as routable extension in `plugin.ts`.

---

## 9. Versioning & Baselines

| Capability | Backend | Frontend UI |
|------------|---------|-------------|
| Requirement revision | YES | MISSING |
| Version history | YES | MISSING |
| Exact version GET | YES | MISSING |
| Baseline create/list/get | YES | MISSING |
| Approved baseline | YES (workflow) | MISSING |
| Supersession | YES (service/repo) | MISSING |
| Immutability | YES (repo rules) | N/A |

---

## 10. Approval Workflow

Backend orchestration (baseline → submit → steps → approve/reject → set/version effects): **IMPLEMENTED** and HTTP-exercised in P1B suite.

Browser-executable UI: **MISSING** (detail Approval tab placeholder; wizard submit not implemented).

| Concern | Status |
|---------|--------|
| Backend orchestration | IMPLEMENTED |
| Frontend current step / approve / reject / comments | MISSING |
| Actor from Backstage identity | IMPLEMENTED (HTTP proven) |
| `urs.approve` permission | IMPLEMENTED (HTTP 403 proven) |
| Workflow-role eligibility vs RBAC | **PARTIAL** — RBAC gate exists; step-role eligibility UI/enforcement beyond permission not fully productized in frontend |
| Audit on decisions | IMPLEMENTED (backend) |
| Final APPROVED state | IMPLEMENTED (backend lifecycle) |

---

## 11. RBAC / Permissions

| Permission | Defined | Backend enforced | Frontend UX | Central RBAC |
|------------|---------|------------------|-------------|--------------|
| urs.read | YES | YES | NO | Exported; discovery ops not re-proven here |
| urs.create | YES | YES | NO | same |
| urs.manage | YES | YES | NO | same |
| urs.approve | YES | YES | NO | same |
| urs.admin | YES | limited/no dedicated admin routes audited | NO | same |

**Central RBAC integration:** NOT marked PASS for URS product UX — backend Permission Framework enforcement PASS (HTTP). Community RBAC admin discoverability of `urs.*` not re-executed in this audit.

---

## 12. Quality Review

| Aspect | Status |
|--------|--------|
| Backend heuristics (`checkRequirementQuality`) | IMPLEMENTED (shall/must, empty title/statement, etc.) |
| Frontend Step 6 | **MOCK** hard-coded PASS/WARNING |
| Wired to `/validate` | **NO** |
| Blocking vs advisory product rules | Backend severities exist; wizard does not enforce via API |
| Production usable | **NO** |

---

## 13. Traceability

| Aspect | Status |
|--------|--------|
| Data model links (capability refs, set, requirements) | PARTIAL |
| Backend graph queries | NOT_IMPLEMENTED |
| Frontend Step 7 | Count summary from wizard state only |
| Knowledge Graph | **NOT_IMPLEMENTED** (explicitly “Coming Soon”) |
| Stable IDs | Backend UUIDs / requirement IDs yes; wizard temp IDs until persist |

---

## 14. Audit Trail

| Layer | Status |
|-------|--------|
| Append-only persistence | IMPLEMENTED |
| Actor / timestamp / entity | IMPLEMENTED |
| API retrieval | IMPLEMENTED |
| Frontend Audit tab | PLACEHOLDER |

---

## 15. Validation Expert Contract

| Field / Seam | Classification |
|--------------|----------------|
| Approved baseline as consumable artifact | DESIGNED_ONLY / domain objects exist |
| Explicit Validation Expert consume API / DTO export | **MISSING** |
| Contract fields `requirementId`, `requirementVersionId`, `baselineId`, `businessCapabilityId`, `solutionId` as published contract | **MISSING** / not a dedicated seam module |

**Classification: DESIGNED_ONLY → MISSING as product contract**

---

## 16. Test Inventory

| Suite / File | Layer | Executed this audit | Result | Proves |
|--------------|-------|---------------------|--------|--------|
| `p1b-http-final-verification.test.ts` | HTTP API (in-memory) | YES | **27/27 PASS** | P1B routes, 401/403, lifecycles, P0 regression |
| Frontend `ursComposerApi.test.ts` etc. | Frontend unit | YES | **FAIL to run** (jest-circus `runtime.enterTestCode`) | **0 tests executed** |
| `p1a-verification.test.ts` | Postgres | Via existing log | **FAIL (timeouts)** in `verification-run.log` | Live PG gate currently unreliable |
| `repository.test.ts`, `service.test.ts`, `p1b-api*.test.ts` | unit/integration | NOT all re-run | Prior reports claim pass | Code coverage exists; not all re-proven today |

**Do not count prior “28/28 frontend PASS” as current evidence — current run executed 0 frontend tests.**

---

## 17. Real User Journey (Today)

| Transition | Result |
|------------|--------|
| Open URS in app | **FAIL** / BLOCKED (plugin not mounted in App features) |
| Create URS → Capability | **PARTIAL** (code exists if mounted) |
| Business Need | **PARTIAL** |
| Context | **PARTIAL** |
| Requirements | **PARTIAL** (local only) |
| Acceptance criteria | **PARTIAL** (local only) |
| Quality review | **FAIL** (mock) |
| Traceability | **PARTIAL** (summary only) |
| Save/reload durable draft | **FAIL** (update stub; requirements not saved; no hydrate) |
| Create baseline | **FAIL** (no UI; backend only) |
| Submit | **FAIL** (wizard TODO) |
| Approve all gates in browser | **FAIL** |
| Obtain immutable APPROVED URS via UI | **FAIL** |

Backend-only journey via HTTP/API tests: **PARTIAL → PASS for API lifecycle**, not product UX.

---

## 18. Completion Matrix

| Capability | Backend | Frontend | Tested | Status |
|------------|---------|----------|--------|--------|
| Business Capability | YES | YES (wizard) | API YES; FE suite broken | PARTIAL |
| Business Need | YES (fields on set) | YES | FE suite broken | PARTIAL |
| Requirements | YES | Local wizard | API YES | PARTIAL |
| Acceptance Criteria | PARTIAL (intent/text) | Local | weak | PARTIAL |
| Quality Review | YES heuristics | MOCK | weak | PARTIAL |
| Traceability | weak | scaffold | no | SCAFFOLD |
| Draft persistence | PARTIAL (create only) | button | update stub | PARTIAL |
| Versioning | YES | NO | HTTP YES | BACKEND_ONLY |
| Baselines | YES | NO | HTTP YES | BACKEND_ONLY |
| Approval workflow | YES | NO | HTTP YES | BACKEND_ONLY |
| Audit trail | YES | placeholder | API unproven today | PARTIAL |
| URS Library | YES list API | NO | API YES | BACKEND_ONLY |
| RBAC (backend) | YES | NO UX | HTTP YES | PARTIAL |
| Validation Expert contract | NO | NO | no | MISSING |

---

## 19. Completion Percentage (Evidence-Based)

| Area | Estimate | Derivation |
|------|----------|------------|
| **Backend** | **75%** | P0+P1B routes + service/repo + permissions HTTP-green; minus update stub, full-set validate TODO, weak live PG re-proof |
| **Frontend** | **30%** | Wizard steps 1–5 coded; landing/library/detail/approval/submit incomplete; app mount gap |
| **Authorization** | **55%** | Backend enforcement strong; FE permission UX missing; central RBAC discovery not re-proven |
| **Testing** | **50%** | Strong P1B HTTP suite today; FE tests broken; P1A log failing |
| **Documentation** | **70%** | Many reports; overstate FE readiness vs code |
| **Overall URS Composer 1.0 readiness** | **~45%** | Weighted: backend usable as API (~⅓ of 1.0), FE product journey largely incomplete, E2E browser path fails |

---

## 20. Gap List (Prioritized)

### P0 — Blocks usable URS Composer

1. **Mount URS frontend in the app (new frontend system)**  
   - Affected: `packages/app/src/App.tsx`, `plugins/urs-composer` exports  
   - Both / app integration  
   - Dependency: Backstage new frontend plugin packaging  
   - Complexity: **MEDIUM**

2. **Implement PUT `/requirement-sets/:id` (draft update)**  
   - Affected: `router.ts`, `service.ts`  
   - Backend  
   - Blocks durable Save Draft  
   - Complexity: **MEDIUM**

3. **Persist requirements (+ AC) on Save Draft / reload hydrate**  
   - Affected: `CreateWizard.tsx`, API client, possibly batch endpoints  
   - Both  
   - Dependency: update API  
   - Complexity: **LARGE**

4. **URS Library list UI with real API**  
   - Affected: landing / new library page  
   - Frontend  
   - Complexity: **MEDIUM**

5. **Register & wire detail page + replace placeholders with API data**  
   - Affected: `plugin.ts`, `URSRequirementSetPage.tsx`  
   - Frontend  
   - Complexity: **LARGE**

### P1 — Required for URS Composer 1.0

6. Wizard submit → baseline → approval start  
7. Approval UI (steps, approve/reject, comments, eligibility)  
8. Wire quality step to backend `/validate`  
9. Version history / baseline UI  
10. Permission-aware FE actions  
11. Fix frontend Jest execution; restore FE regression suite  
12. Re-establish green live PostgreSQL P1A verification  
13. Validation Expert consume contract for approved baseline  

### P2 — After 1.0

14. Knowledge Graph / advanced traceability visualization  
15. My Drafts / Pending Reviews dashboards  
16. Rich AC domain model (structured Given/When/Then persistence)  
17. Admin template management (`urs.admin` surfaces)

---

## 21. Recommended NEXT IMPLEMENTATION BLOCK

**Do not execute in this audit.**

**Block name:** `URS_COMPOSER_P1C_PRODUCT_SHELL_COMPLETION`

**Scope (ordered):**
1. Mount frontend plugin in app + export create/detail routes  
2. Implement requirement-set update + wizard draft persistence including requirements  
3. Build URS Library (list/search/open) on real GET `/requirement-sets`  
4. Replace detail placeholders with live Overview + Requirements + Audit (minimum)  
5. Restore FE test runner health  

**Explicitly defer:** full approval UI, Validation Expert contract, KG — until shell is usable.

---

## Evidence Appendix (This Audit)

| Check | Result |
|-------|--------|
| `p1b-http-final-verification.test.ts` | **27 PASS** (executed) |
| Frontend `yarn test` | **3 suites failed to run** (0 tests) |
| `packages/app` URS feature registration | **Absent** |
| `PUT /requirement-sets/:id` | **Stub message in router** |
| Detail tabs | **All “Coming soon”** |
| Library button | **No handler** |
| Wizard submit | **TODO / error path** |

---

## Verdict (exact)

**URS_COMPOSER_1_0_PARTIAL**

STOP.
