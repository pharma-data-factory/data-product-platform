# RB-P0-003 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-003 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-ENT-004 |
| SYS | SYS-ENT-004 |
| TDS | TDS-ENT-004 |
| Risk | RA-005 |
| Tests | TEST-ENT-004 (developer execution only) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree
- AWS credentials: not invented; failing client fixture used

## Files changed

- `data-product-platform/plugins/entitlements-backend/src/awsMarketplace.test.ts`

Runtime already fail-closed (`failClosed: provider === 'aws'`; AWS API throw returns `[]`; no INTERNAL wrap). No production code change required.

## Implementation rationale

URS-ENT-004 requires no silent INTERNAL fallback when the entitlement provider is AWS in a production commercial environment. Existing adapter already returned empty entitlements on AWS failure. Remediation added an explicit runtime test that local default product IDs in config do not grant Create after a failed lookup.

## Tests added/modified

- `does not grant INTERNAL or local default entitlements when AWS lookup fails`
- Existing fail-closed / MIXED_CONFIGURATION / credentials-missing cases reused

## Test commands

```
cd data-product-platform/plugins/entitlements-backend
yarn test --watchAll=false --testPathPatterns="awsMarketplace.test|router.test"
```

## Test results

- Suites: 2 passed
- Tests: 21 passed, 0 failed

## Remaining limitations

- Fixture is a throwing client, not a live AWS Marketplace account.
- Formal TEST-ENT-004 / OQ not executed.

## Residual risk

Operational AWS misconfiguration outside these fixtures is not witnessed. Fail-closed code path is unit-verified.
