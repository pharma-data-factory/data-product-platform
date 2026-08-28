# Baseline Entry Criteria — CSV Phase 0

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-BEC-001 |
| Baseline candidate | PLATFORM CORE VALIDATION BASELINE 0.1 |
| Proposed tag (not created) | `platform-core-v0.1.0-csv-baseline` |
| Product validation status | **NOT_VALIDATED** |
| Evaluation date | 2026-08-23 |

Result codes: `PASS` | `FAIL` | `OPEN` | `NOT_APPLICABLE`

---

## Criteria evaluation (current workspace)

| ID | Criterion | Result | Evidence / notes |
| --- | --- | --- | --- |
| BEC-01 | Clean Git working tree | **FAIL** | `git status` dirty (~71 entries); untracked Validation Expert / Plugin Directory |
| BEC-02 | Unique commit SHA identified | **PASS** | HEAD `6e8318a093da871a665df92c2ac004d895a49b1f` |
| BEC-03 | Release / baseline tag applied to clean commit | **FAIL** | Tag not created (by design this Phase); RC2 exists but ≠ CSV Baseline 0.1 freeze |
| BEC-04 | Frontend smoke (app reachable, core shell loads) | **FAIL** / **OPEN** | AS-IS: `:3000` connection refused — not re-proven |
| BEC-05 | Backend smoke (health/liveness) | **PASS** | AS-IS: `:7007` and validation Compose `:7008` liveness OK |
| BEC-06 | Authentication smoke (interactive login) | **OPEN** | Configured Guest + GitHub; interactive login not re-verified in AS-IS |
| BEC-07 | Authorization smoke (denied/allowed action) | **OPEN** | Unit tests PASS; interactive smoke not executed |
| BEC-08 | Catalog smoke (authenticated entity list) | **OPEN** | Unauthenticated → 401 expected; authenticated list not verified |
| BEC-09 | Scaffolder smoke (dry-run or controlled create) | **OPEN** | Not executed in AS-IS |
| BEC-10 | Guest configuration decision recorded | **OPEN** | Guest on in default dev config; production overlays forbid — **GATE decision pending** |
| BEC-11 | Sample/demo catalog isolation | **FAIL** / **OPEN** | Samples loaded by default per AS-IS; not isolated for freeze |
| BEC-12 | Dependency lock present & installable | **PASS** (partial) | `yarn.lock` present; full immutable install not re-run this Phase 0 writing session |
| BEC-13 | Reproducible build identity documented | **OPEN** | Backstage 1.53.0 + Yarn 4.13.0 documented; image digest for freeze not captured |
| BEC-14 | Configuration identification complete | **PASS** (draft) | `configuration-identity.md` drafted; freeze still blocked by BEC-01 |
| BEC-15 | WIP plugins excluded from baseline identity | **FAIL** | WT wires Validation Expert / Plugin Directory; not in HEAD |
| BEC-16 | Product status remains NOT_VALIDATED | **PASS** | `validation/baseline/BASELINE.yaml` + assessment |

---

## Aggregate freeze readiness

```text
NOT_READY_TO_FREEZE
```

**Blocking:** BEC-01, BEC-03, BEC-15 (and likely BEC-04, BEC-11 until addressed or formally waived by Quality).

**Recommended tag name (when ready — do not apply now):**

`platform-core-v0.1.0-csv-baseline`

Optional annotated message:

`PLATFORM CORE VALIDATION BASELINE 0.1 — configuration freeze candidate; product remains NOT_VALIDATED`

---

## Minimum actions before re-evaluation

1. Park or commit WIP on separate branches; restore clean tree matching intended freeze commit (prefer HEAD plugins only).  
2. Decide Guest policy for frozen environment.  
3. Isolate or remove sample catalog locations from frozen config.  
4. Execute smoke checklist BEC-04–BEC-09 against that clean tree.  
5. Create tag **only after GATE-05**.  

**AI must not tag, commit, or push.**
