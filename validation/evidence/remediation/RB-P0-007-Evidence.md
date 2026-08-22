# RB-P0-007 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-007 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-CFG-002 |
| SYS | SYS-CFG-002 |
| TDS | TDS-CFG-002 |
| Risk | RA-010 |
| Tests | TEST-CFG-001, TEST-IQ-001 (developer execution only; IQ not claimed) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree

## Files changed

- `data-product-platform/app-config.docker.yaml`
- `data-product-platform/app-config.production.yaml`
- `data-product-platform/app-config.marketplace-test.yaml`
- `data-product-platform/packages/backend/src/config/committedConfigIntegrity.test.ts` (added)

`app-config.yaml` already had `permission.enabled: true`. `app-config.github.yaml` is an App-credential overlay, not a standalone RBAC deployment, and was left unchanged.

## Implementation rationale

URS-CFG-002 requires the Permission Framework to be enabled for Platform Core deployments that enforce RBAC. Docker/production overlays omitted the key and relied on merge with the base file. The URS target is explicit enablement on intended RBAC deployments.

Set `permission.enabled: true` on docker, production, and marketplace-test overlays. Test asserts those files contain the flag and none set `false`.

## Tests added/modified

- `enables the Permission Framework on every intended RBAC deployment overlay`

## Test commands

```
cd data-product-platform/packages/backend
yarn test --watchAll=false --testPathPatterns=committedConfigIntegrity
```

## Test results

- committedConfigIntegrity.test.ts: passed

## Remaining limitations

- Runtime confirmation that the merged Backstage config object is `true` after process start was not captured (file review + unit assertion only).
- Not formal IQ.

## Residual risk

A future overlay that sets `permission.enabled: false` would fail the new test if added to the RBAC deployment list. An unpublished overlay would not.
