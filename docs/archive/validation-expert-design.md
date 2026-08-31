# Validation Expert v0.1 — Design

**Status:** Design approved for implementation  
**Product candidate:** Platform Core 1.0-RC2 (`platform-core-v1.0-rc2`)  
**Product validation status (authoritative):** `NOT_VALIDATED`  
**Validation Expert validation status:** `NOT_VALIDATED`  
**Date:** 2026-08-22

This document completes Phase A inspection. Application code changes follow this design.

---

## 1. Inspection summary

| Area | Finding |
| --- | --- |
| Frontend plugins | New frontend system: `createFrontendPlugin` + `PageBlueprint` (`plugins/data-products`, `marketplace`, `nexora-*`) |
| App modules | `packages/app/src/modules/*` via `createFrontendModule` |
| Backend plugins | `createBackendPlugin` + `createRouter` + `httpRouter.use` |
| Navigation | `packages/app/src/modules/nav/Sidebar.tsx` — explicit `nav.take('page:…')` order |
| Permissions | `@internal/platform-common` permission objects + role name sets; `PlatformPermissionPolicy` |
| Identity | Frontend `identityApiRef`; backend `httpAuth.credentials` + optional `userInfo` |
| Persistence (custom) | File/JSON overlays and JSONL audit — **no Knex** in custom plugins |
| Postgres | Backstage core only (dev SQLite / prod pg) |
| Validation SoT | `validation/` markdown + YAML; **no existing parsers** |
| API convention | `/api/<pluginId>/…` via discovery |

---

## 2. Package names

| Package | Path | pluginId |
| --- | --- | --- |
| `@internal/plugin-validation-expert` | `plugins/validation-expert` | `validation-expert` |
| `@internal/plugin-validation-expert-backend` | `plugins/validation-expert-backend` | `validation-expert` |

Shared permission constants and role helpers live in `@internal/platform-common`.

Impact note: `validation-expert/VALIDATION-IMPACT.md` (repo-relative under `data-product-platform/`).

---

## 3. Frontend integration

- Register `validationExpertPlugin` in `packages/app/src/App.tsx` `features`.
- Add workspace dependency in `packages/app/package.json`.
- Sidebar placement (after Data Products / Marketplace cluster, before Admin/settings):

```text
Home → Catalog → Marketplace → Data Products → Validation Expert → …
```

- Routes:
  - `/validation-expert` — Overview
  - `/validation-expert/requirements`
  - `/validation-expert/requirements/:id`
  - `/validation-expert/traceability`
  - `/validation-expert/risks`
  - `/validation-expert/iq`
  - `/validation-expert/oq`
  - `/validation-expert/uat`
  - `/validation-expert/runs`
  - `/validation-expert/runs/:runId`
  - `/validation-expert/runs/:runId/tests/:testId`
  - `/validation-expert/evidence`
  - `/validation-expert/findings`

- Visual language: existing Nexora Material-UI / Backstage `InfoCard`, compact status chips, navy/teal tokens where already used. No GMP badges.

---

## 4. Backend integration

- Register in `packages/backend/src/index.ts`:
  `backend.add(import('@internal/plugin-validation-expert-backend'));`
- Dependency in `packages/backend/package.json`.
- Config (optional):

```yaml
validationExpert:
  validationRoot: validation   # relative to repo / cwd
  runtimeStorePath: validation/runtime/runs-store.json
  healthBaseUrl: http://localhost:7007   # for IQ-016-style checks
```

Default `validationRoot` resolves to the monorepo `data-product-platform/validation` directory.

---

## 5. API contract

Base: `/api/validation-expert`

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | `{ status: 'ok' }` |
| GET | `/overview` | `validation.read` | Candidate, statuses, counts |
| GET | `/requirements` | `requirement.read` | Active + rejected (flagged) |
| GET | `/requirements/:id` | `requirement.read` | Detail + trace links |
| GET | `/traceability` | `traceability.read` | Rows + gap flags |
| GET | `/risks` | `validation.read` | RA items; **no accept** |
| GET | `/protocols/:type` | `validation.read` | `IQ` \| `OQ` \| `UAT` |
| GET | `/runs` | `validation.read` | List runs |
| GET | `/runs/:runId` | `validation.read` | Run + executions |
| POST | `/runs` | `validation.run.start` | Create run `{ candidate, type }` |
| POST | `/runs/:runId/execute-automated` | `validation.run.start` | Run MVP automated tests for run |
| POST | `/runs/:runId/tests/:testId/start` | `validation.test.execute` | Manual/automated start |
| POST | `/runs/:runId/tests/:testId/result` | `validation.test.execute` | Manual result |
| GET | `/evidence` | `validation.read` | Artifact + runtime evidence |
| GET | `/findings` | `validation.read` | File + runtime findings |

Error shape: `{ error: string }` with 401/403/404/400 as appropriate.

---

## 6. Persistence model

### Target (production)

PostgreSQL tables: `validation_run`, `validation_test_execution`, `validation_evidence`, `validation_finding` (as specified in the master prompt).

### v0.1 approved development store

**Interface:** `ValidationRunRepository`

**Implementation:** `FileValidationRunRepository` writing append-safe JSON under:

`validation/runtime/runs-store.json`

Rules:

- Completed runs are **immutable** (updates rejected).
- New executions create new run IDs (`OQ-RUN-0001`, …).
- Never writes into `validation/execution/evidence/IQ/` or RC1/RC2 historical folders.
- Runtime evidence metadata is stored in the same store; optional evidence files under `validation/runtime/evidence/<runId>/`.
- Not an undocumented in-memory production store. Memory implementation is **tests only**.

PostgreSQL adapter is an extension point; not required for v0.1 completeness if the file store is durable and auditable.

---

## 7. Permission model

| Permission | Action | VIEWER | DEVELOPER | OWNER | PLATFORM_ADMIN |
| --- | --- | --- | --- | --- | --- |
| `validation.read` | read | ✓ | ✓ | ✓ | ✓ |
| `requirement.read` | read | ✓ | ✓ | ✓ | ✓ |
| `traceability.read` | read | ✓ | ✓ | ✓ | ✓ |
| `validation.run.start` | create | — | ✓ | ✓ | ✓ |
| `validation.test.execute` | update | — | ✓ | ✓ | ✓ |
| `validation.review` | update | — | — | ✓* | ✓ |
| `validation.admin` | update | — | — | — | ✓ |
| `validation.approve` | update | — | — | — | **denied** in v0.1 |
| `risk.accept` | update | — | — | — | **denied** in v0.1 |
| `baseline.modify` | update | — | — | — | **denied** in v0.1 |

\* Owner maps to “Validation Reviewer” read/review for v0.1 (comments optional; no package approval).

**Validation Approver** is reserved: no automatic approval API.

Privileged names (`validation.approve`, `risk.accept`, `baseline.modify`, `validation.admin`) are treated as privileged reads/writes and are **not** granted via generic read privilege.

Role helpers: `canReadValidation`, `canStartValidationRun`, `canExecuteValidationTest`, `canReviewValidation`, `canAdministerValidation`.

---

## 8. Validation-file parser strategy

Authoritative inputs (read-only):

- `baseline/BASELINE.yaml`
- `baseline/URS.md` (disposition table + `### URS-*` sections)
- `baseline/System-Specification.md`, `TDS.md`, `Risk-Assessment.md`, `Traceability-Matrix.md`
- `execution/Verification-Traceability.md`
- `execution/IQ/IQ-Protocol.md`, `RC2-IQ-Execution-Summary.md`
- `execution/OQ/OQ-Protocol.md`, `UAT/UAT-Protocol.md`
- `execution/RC2-Manifest.yaml`
- `execution/findings/*.md`
- `execution/evidence/**` (indexed by path; content not rewritten)

Strategy:

1. YAML via `yaml` package for manifests/baseline.
2. Markdown: regex section headers + pipe tables for fields.
3. Cache parsed snapshot per process with mtime invalidation.
4. Never write baseline or protocol files.

Gaps highlighted when: requirement lacks formal test link; test lacks URS; status FAIL/BLOCKED; missing evidence reference for executed formal tests.

---

## 9. Test-runner architecture

```ts
interface ValidationTestRunner {
  supports(test: ValidationTestDefinition): boolean;
  execute(
    test: ValidationTestDefinition,
    context: ValidationRunContext,
  ): Promise<ValidationTestResult>;
}
```

Registry selects first matching runner. Types: `AUTOMATED_API` | `AUTOMATED_PLATFORM` | `AUTOMATED_SECURITY` | `MANUAL` | `EXTERNAL`.

### v0.1 MVP runners (real checks)

| Protocol ID | Runner | Type |
| --- | --- | --- |
| `IQ-001` | Candidate identity (tag/manifest/baseline files present; optional git when available) | AUTOMATED_PLATFORM |
| `IQ-016` | Health HTTP check against configured readiness/health URLs | AUTOMATED_API |
| `OQ-CI-004` | Assert `CI_UNKNOWN_REPRESENTATION === 'DEGRADED / UNVERIFIED'` via shared mapping function (DEC-CI-001) | AUTOMATED_PLATFORM |

`EXTERNAL` tests remain `NOT_EXECUTED` / start blocked with message — never mocked PASS.

Manual workflow: authenticated user only; FAIL requires comment; evidence reference when protocol requires it.

---

## 10. Status semantics (hard rules)

| Concept | Source | Display |
| --- | --- | --- |
| Validation state | `BASELINE.yaml` / RC2 manifest | **NOT_VALIDATED** |
| IQ workspace | RC2 IQ summary | PASS WITH OPEN OBSERVATIONS |
| OQ / UAT | Protocols | NOT_EXECUTED / READY (protocol ready, not validated) |
| Certification / release | separate product systems | never imply GMP validation |

Do not auto-approve requirements, risks, tests, or validation packages.

---

## 11. Out of scope (v0.1)

AI, e-signatures, Part 11 claims, DocuSign/Veeva/Polarion, autonomous approval, baseline editing UI, graph DB, replacing historical RC evidence.

---

## 12. Testing plan

- Backend unit: parsers, permissions, run create, runner results, findings on FAIL, identity capture.
- Frontend unit: overview NOT_VALIDATED, requirements table, protocol pages, manual workflow gates.
- Typecheck / package tests via Backstage CLI.
- Developer E2E smoke (manual or documented); **not** formal validation of Validation Expert.

---

## 13. Implementation order

1. platform-common permissions + policy  
2. backend parsers + repository + runners + router  
3. frontend API + pages + nav  
4. wiring + tests + VALIDATION-IMPACT.md  

**STOP after v0.1 — do not begin v0.2 automatically.**
