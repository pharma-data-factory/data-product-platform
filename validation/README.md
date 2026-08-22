# Validation Package

**Requirements baseline:** Platform Core Validation Baseline v1.0 (`PDF-PC-VAL-BL-1.0`)  
**Validation status:** **NOT_VALIDATED**  
**Part 11:** NOT_CLAIMED

This directory holds the Platform Core **requirements baseline** and supporting review/evidence/remediation records. It does not claim that Pharma Data Factory is validated, qualified, or GxP compliant.

`CERTIFIED` and `RELEASED` Golden Path states are technical product statuses. They are **not** GMP / CSV validation.

## Structure

| Path | Content |
| --- | --- |
| `validation/baseline/` | Scope, URS, SYS, TDS, risk, tests, traceability, open gaps, `BASELINE.yaml` |
| `validation/evidence/` | Rules for reviewed / approved execution evidence. No executed IQ/OQ/PQ records. |
| `validation/reviews/` | Phase 2B review history and applied Phase 2C decisions. No fabricated signatures. |
| `validation/remediation/` | Analysis-only backlog plus P1 classification. |
| `validation/execution/` | RC1 formal verification *preparation*. IQ/OQ/UAT not executed. |

## Baseline documents (v1.0)

| File | Status |
| --- | --- |
| `baseline/BASELINE.yaml` | BASELINED / NOT_VALIDATED |
| `baseline/Validation-Scope.md` | BASELINED |
| `baseline/URS.md` | BASELINED (38 active; 1 rejected) |
| `baseline/System-Specification.md` | BASELINED |
| `baseline/TDS.md` | BASELINED |
| `baseline/Risk-Assessment.md` | BASELINED (risks not accepted) |
| `baseline/Test-Specification.md` | BASELINED (all tests NOT_EXECUTED) |
| `baseline/Traceability-Matrix.md` | BASELINED |
| `baseline/Open-Gaps.md` | BASELINED |

## Counts

| | Value |
| --- | --- |
| Active BASELINED URS | 38 |
| REJECTED URS | 1 (URS-AUTH-005) |
| OPEN_POLICY_DEFINITION | 0 (`OPEN-LEG-001` CLOSED) |
| Validation | NOT_VALIDATED |

## Rules

- Do not implement product changes from this package unless a later phase explicitly authorizes it.
- Acceptance of a URS means intended behavior, not implementation or verification.
- Do not use VALIDATED as a requirement state.
- Part 11 is not claimed. Do not require electronic signatures unless customer GxP governance later requires them.
- Guest authentication is DEVELOPMENT_ONLY.
