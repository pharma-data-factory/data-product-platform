# RB-P0-002 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-002 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-RBAC-003 |
| SYS | SYS-RBAC-003 |
| TDS | TDS-RBAC-003 |
| Risk | RA-003 |
| Tests | TEST-RBAC-003, TEST-SEC-002 (developer execution only) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree
- OPEN-LEG-001: not used (Legal Gate operation list not invented)

## Files changed

- `data-product-platform/plugins/nexora-backend/src/plugin.ts`
- `data-product-platform/plugins/nexora-backend/src/router.ts`
- `data-product-platform/plugins/nexora-backend/src/router.test.ts`
- `data-product-platform/plugins/nexora-backend/package.json`
- `data-product-platform/plugins/data-products-backend/src/router.ts`
- `data-product-platform/plugins/data-products-backend/src/router.test.ts`
- `data-product-platform/plugins/data-products-backend/src/releaseRouter.test.ts`
- `data-product-platform/packages/backend/src/permission/policy.test.ts`

Already authorizing (unchanged): entitlements-backend `requirePermission`; data-products POST `/certification` and POST `/releases/transition`.

## Implementation rationale

URS-RBAC-003 requires backend authorization. Custom industrial GETs on nexora-backend had no `permissions.authorize`. GET `/ci-status` and GET `/releases` required credentials only.

Added fail-closed `data-product.view` authorization on those reads (except `/health` and missing `entityRef` on CI, which return no catalog data). Viewer mutation denies already existed in policy and entitlements; tests were added so certification POST, entitlement admin, and Create (policy + `/authorize-create`) are evidenced.

AAS routes remain out of Platform Core scope.

## Tests added/modified

- Nexora industrial GET denied without view permission
- POST `/certification` returns 403 without manage permission
- GET `/ci-status` returns 403 without view permission
- GET `/releases` requires view permission (release router test updated)
- Viewer denied `data-product.certification.manage` and `entitlement.admin`

## Test commands

```
cd data-product-platform/plugins/nexora-backend
yarn test --watchAll=false --testPathPatterns=router.test

cd data-product-platform/plugins/data-products-backend
yarn test --watchAll=false --testPathPatterns="router.test|releaseRouter.test"

cd data-product-platform/packages/backend
yarn test --watchAll=false --testPathPatterns=policy.test

cd data-product-platform/plugins/entitlements-backend
yarn test --watchAll=false --testPathPatterns=router.test
```

## Test results

- nexora-backend router: 5 passed, 0 failed
- data-products-backend router + mapCiStatus + releaseRouter (after test update): passed
- policy.test: passed (included in backend 25-test group)
- entitlements-backend router: passed (Viewer Create 403 / admin 403 already present)

First data-products-backend run failed `releaseRouter.test` GET `/releases` (403) because the new authorize check was missing from that test fixture. Fixture updated to allow view; re-run passed.

## Remaining limitations

- Developer HTTP tests use mocked `permissions.authorize`, not a live Backstage session as Viewer.
- Interactive Scaffolder Create as Viewer was not executed (P1 / UAT).
- AAS not in Core evidence.

## Residual risk

UI-only gating is no longer the sole control on the remediated prefixes. Live session abuse testing remains NOT_EXECUTED.
