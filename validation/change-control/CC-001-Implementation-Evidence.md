# CC-001 implementation evidence (developer)

Not formal IQ. Formal IQ-006 re-test remains NOT_EXECUTED.

| Check | Result |
| --- | --- |
| `yarn tsc` | PASS (after caption/mock type fixes) |
| Targeted Jest (26 tests) | PASS |
| `yarn build:backend` | PASS |
| Image | `platform-core:1.0-rc2` sha256:b25c9d4db4756ca21d4808e791e513277e7747a7946f7c8d0ecb9f84f83d4af8 |
| Validation Postgres | healthy, host 5435 → 5432, `postgres:16-alpine` |
| Validation Control Plane | HTTP 200 on `http://127.0.0.1:7008/.backstage/health/v1/readiness` |
| Audit path in container | `/app/.runtime/create-authorization-audit.jsonl` |
| Directory owner | `node:node` |
| Volume | `platform-core-validation_create_authorization_audit` |
| Probe after `compose restart` | `{"probe":"cc-001"}` still present (`PERSIST_OK`) |

No Part 11 claim.
