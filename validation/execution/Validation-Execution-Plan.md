# Validation Execution Plan — Platform Core 1.0-RC1

| Field | Value |
| --- | --- |
| Document | VAL-EP-PC-RC1 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Candidate | Platform Core 1.0-RC1 |
| Validation status | **NOT_VALIDATED** |
| Formal IQ / OQ / UAT | **NOT_EXECUTED** |
| Date | 2026-08-22 |

This plan prepares formal verification. It does not execute IQ, OQ, or UAT. It does not approve regulatory compliance. Creating the RC1 manifest does **not** technically freeze the git repository.

## Readiness (Phase 5A)

| Check | Result |
| --- | --- |
| Unresolved P0 implementation blockers | None (P0 READY FOR NEXT PHASE: YES; P1 remediations addressed the P0 finding) |
| Unresolved P1 implementation blockers | None (P1 READY FOR VERIFICATION PREPARATION: YES; no REVIEW_FINDING) |
| Baseline change request | None |
| OPEN-LEG-001 | **CLOSED** (DEC-LEGAL-002) |
| URS internally consistent | Yes after policy-detail close. Requirement sentences unchanged. |
| SYS/TDS traceability | Present for 38 active URS |
| Proposed verification tests | Present in `baseline/Test-Specification.md` and this execution package |
| Worktree state | **Known: DIRTY (240 paths).** HEAD `d96ab0cbd97ea86314ddcbd468ff5faf756df212` does not uniquely pin the candidate |
| Formal URS coverage | **38 / 38** planned (Phase 5A.1). All NOT_EXECUTED |
| Change inventory | `RC1-Change-Inventory.md` |
| Fixation | `RC1-Fixation-Plan.md` — **RC1 READY TO FIX: NO** |

**RC1 freeze readiness:** documented candidate only. **Not** uniquely fixable until inventory decisions and validation-package copy.

## Sequence (not executed here)

1. IQ of the hosted/production-like candidate identified in `RC1-Manifest.yaml`.
2. OQ of specified Core functions (auth, RBAC, entitlements, Create, audit, CI, secrets, AWS fail-closed, catalog, claims, existing Legal Gate).
3. UAT of intended Developer and negative journeys. Golden Path *content* is out of scope.

## Code freeze rule

After RC1, feature development on this candidate is not permitted. Product-code changes require a change record, impact assessment, affected URS/SYS/TDS/tests, regression assessment, and a new candidate version if applicable. Allowed without a new product feature: formal verification findings, security-critical defects, validation-blocking defects.

## Evidence

Follow `Evidence-Conventions.md`. Do not fabricate executor, timestamps, screenshots, logs, signatures, or approvals.

## Related files

| File | Role |
| --- | --- |
| `RC1-Manifest.yaml` | Candidate identity |
| `IQ/IQ-Protocol.md` | Installation Qualification |
| `OQ/OQ-Protocol.md` | Operational Qualification |
| `UAT/UAT-Protocol.md` | User Acceptance |
| `Verification-Traceability.md` | URS → formal tests |
| `Evidence-Conventions.md` | Evidence rules |
| `RC1-Change-Inventory.md` | Worktree classification |
| `RC1-Validation-Package-Migration-Plan.md` | Copy validation into product git |
| `RC1-Fixation-Plan.md` | Clean commit/tag plan (not executed) |
| `RC1-Change-Reconciliation.md` | A–E classification of all 240 paths |
| `RC1-Out-of-Scope-Register.md` | Allowed non-Core components |
| `RC1-Reconciled-Candidate.md` | Snapshot candidate model |
| `SOUP-SBOM-Plan.md` | Inventory / SBOM approach |
| `Formal-Environment-Prerequisites.md` | IQ/OQ/UAT env |
| `Risk-Review-Gate.md` | RA review timing (not accepted) |
