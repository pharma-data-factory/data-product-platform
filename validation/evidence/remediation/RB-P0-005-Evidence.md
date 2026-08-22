# RB-P0-005 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-005 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-GH-003 (DEC-CI-001) |
| SYS | SYS-GH-003 |
| TDS | TDS-GH-003 |
| Risk | RA-012 |
| Tests | TEST-GH-003, TEST-OQ-002 (developer execution only; OQ not claimed) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree

## Files changed

- `data-product-platform/plugins/data-products-backend/src/types.ts`
- `data-product-platform/plugins/data-products-backend/src/router.ts` (public UNKNOWN payload)
- `data-product-platform/plugins/data-products-backend/src/mapCiStatus.test.ts`
- `data-product-platform/plugins/data-products-backend/src/router.test.ts`
- `data-product-platform/plugins/data-products/src/ciStatus.ts`
- `data-product-platform/plugins/data-products/src/components/CiStatusChip.tsx`
- `data-product-platform/plugins/data-products/src/components/CiQualityGateCard.test.tsx`
- `data-product-platform/plugins/data-products/src/api.test.ts`

## Implementation rationale

DEC-CI-001: status `UNKNOWN` shall never be interpreted as `PASS` and shall be represented as **DEGRADED / UNVERIFIED**.

Machine code `UNKNOWN` is preserved (no silent URS rewrite). Public API adds `representation` computed only from `status`. UI chip label uses that representation. Incoming `representation: 'PASSED'` on an UNKNOWN payload is ignored.

## Tests added/modified

- `publicCiStatus` UNKNOWN → representation `DEGRADED / UNVERIFIED`, never PASSED
- Router missing entityRef returns the representation
- Quality Gate / chip render `DEGRADED / UNVERIFIED` for UNKNOWN

## Test commands

```
cd data-product-platform/plugins/data-products-backend
yarn test --watchAll=false --testPathPatterns="router.test|mapCiStatus.test"

cd data-product-platform/plugins/data-products
yarn test --watchAll=false --testPathPatterns="api.test|CiQualityGateCard.test"
```

## Test results

- mapCiStatus.test: passed
- router.test: passed
- api.test: passed
- CiQualityGateCard.test: passed

## Remaining limitations

- Live GitHub Actions Read-only for the GitHub App is operational and was not granted in this phase. A real unread repository will still resolve as machine `UNKNOWN`, now displayed as DEGRADED / UNVERIFIED.
- Formal TEST-OQ-002 not executed.

## Residual risk

Operators may still see DEGRADED / UNVERIFIED until Actions read permission exists. That is the required representation, not a PASS.
