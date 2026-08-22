# IQ-011 Evidence — Dependency inventory

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-011 |
| related | DEC-SOUP-001, RA-013 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | RC1 `yarn.lock` (unchanged between tag and HEAD) |
| status | PASS |

## Procedure performed

Recorded Node, Yarn, declared and lockfile versions. Hashed `yarn.lock`. Did not create a signed SOUP assessment. Did not install new dependencies.

## Expected result (unchanged)

Inventory recorded. Missing signed SOUP assessment is noted as NOT_ESTABLISHED, not invented.

## Actual result

| Item | Value |
| --- | --- |
| Node | v22.12.0 |
| Yarn | 4.13.0 (`packageManager: yarn@4.13.0`) |
| `@backstage/cli` declared | ^0.36.4 |
| `@backstage/cli` resolved | 0.36.4 |
| `@backstage/backend-defaults` declared | ^0.17.5 |
| `@backstage/backend-defaults` resolved | 0.17.6 |
| `@backstage/plugin-catalog-backend` resolved | 3.8.1 |
| `@backstage/plugin-permission-backend` resolved | 0.7.14 |
| `@backstage/plugin-scaffolder-backend` resolved | 4.0.2 |
| Backstage release file | 1.53.0 |
| yarn.lock SHA-256 | 2AA0C6614DCEEAEC5CDD3AE587FF7F456CA8553018ECBEC0A38A5F77608E64AF |
| Signed SOUP assessment | NOT_ESTABLISHED |
| SOUP approval | NOT CLAIMED |

Platform Core lockfile subset includes Backstage packages plus `@internal/platform-common`, data-products*, entitlements-backend, marketplace, app, backend. Nexora workspaces are in the same lockfile and remain out of the Core URS claim.

## Objective evidence

`node -v`, `yarn -v`, lockfile hash, lockfile version lines.
