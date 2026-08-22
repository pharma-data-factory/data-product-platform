# IQ Re-test Summary — Platform Core 1.0-RC2

| Field | Value |
| --- | --- |
| Document | VAL-IQ-PC-RC2-SUM |
| Candidate | 1.0-RC2 |
| Canonical tag | `platform-core-v1.0-rc2` |
| Tag target | `e2b2297a1506603ba05e6fb1dcf973ac046ad009` |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Execution date | 2026-08-22 |
| Named human executor | NOT_ESTABLISHED |
| Predecessor IQ | RC1 FAIL (IQ-006 / IQ-FIND-001) |
| Product validation status | **NOT_VALIDATED** |
| OQ | NOT_EXECUTED |
| UAT | NOT_EXECUTED |

Formal IQ re-test does **not** validate the product. Developer tests are not formal IQ.

RC1 evidence under `validation/execution/evidence/IQ/` is preserved. RC2 evidence is under `validation/execution/evidence/IQ/RC2/`.

---

## RC2 formally re-tested results

| ID | Status | Notes |
| --- | --- | --- |
| IQ-001 | PASS | Tag/commit/worktree/baseline verified |
| IQ-002 | PASS | Running Cmd uses production + github overlays |
| IQ-005 | PASS | Postgres 16.14; pg client; migrations observed |
| IQ-006 | PASS | Volume persistence proven across force-recreate |
| IQ-009 | PASS | Sample entity absent in catalog DB; no samples locations |
| IQ-010 | PASS | Spot-check; overlays still `${ENV}` (no secrets) |
| IQ-013 | PASS | Image `platform-core:1.0-rc2` digest recorded |
| IQ-015 | PASS | Required env names present in container |
| IQ-016 | PASS | Hosted health endpoints HTTP 200 |

Re-test counts: **9 PASS / 0 FAIL / 0 BLOCKED**

---

## Inherited unaffected RC1 PASS results

(Not formally re-executed; impact analysis: CC-001 surface does not affect)

| ID | RC1 status | RC2 disposition |
| --- | --- | --- |
| IQ-003 | PASS | Inherited |
| IQ-004 | PASS | Inherited |
| IQ-007 | PASS | Inherited |
| IQ-008 | PASS | Inherited (locations covered via IQ-009 DB proof) |
| IQ-011 | PASS | Inherited |
| IQ-012 | PASS | Inherited; consistency review confirms criterion (SBOM **or** NOT_ESTABLISHED) |
| IQ-014 | PASS | Inherited (Postgres version also recorded under IQ-005) |

---

## Findings

| ID | Status |
| --- | --- |
| IQ-FIND-001 | **CLOSED** (RC2 IQ-006 PASS; CC-001) |

Open findings: **none**

---

## Observations (not FAIL)

1. **Named human executor NOT_ESTABLISHED** — recorded on all RC2 evidence; not fabricated. Governance observation for formal package sign-off.
2. **HEAD vs tag** — documentation commit `cecae60` after tag (finalization record only); worktree CLEAN.
3. **Catalog HTTP 401** — expected with permission enabled; IQ-009 used catalog Postgres as objective evidence.
4. **IQ-012** — no SBOM artifact; prior PASS remains justified by explicit NOT_ESTABLISHED criterion. SOUP not approved.
5. **SBOM / signed SOUP** — still NOT_ESTABLISHED / NOT CLAIMED.

---

## Complete IQ protocol disposition for RC2

All 16 IQ items are either re-tested PASS or inherited unaffected PASS. No FAIL. No BLOCKED. Finding IQ-FIND-001 CLOSED.

**IQ EXECUTION RESULT: PASS WITH OPEN OBSERVATIONS**

Primary open observation: named human executor NOT_ESTABLISHED on formal evidence records.

---

## Status after this phase

| Item | Value |
| --- | --- |
| Platform Core validation | **NOT_VALIDATED** |
| OQ | **NOT_EXECUTED** |
| UAT | **NOT_EXECUTED** |
| Part 11 | **NOT_CLAIMED** |
