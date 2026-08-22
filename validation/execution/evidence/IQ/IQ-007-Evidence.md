# IQ-007 Evidence — Required plugins and modules

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-007 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Local backend process + candidate `packages/backend/src/index.ts` |
| status | PASS |

## Procedure performed

Read `packages/backend/src/index.ts` on the candidate. Confirmed a backend process is listening and Core health responds. Did not have a hosted startup log.

## Expected result (unchanged)

Modules listed in `packages/backend/src/index.ts` for Core are loaded. AAS/Nexora industrial plugins may be loaded but remain out of Core validation scope.

## Actual result

Core registrations present in source:

- permission backend + `permissionModulePlatformPolicy`
- entitlements backend
- data-products backend
- catalog (+ scaffolder-entity-model, logs)
- scaffolder (+ github module)
- auth (+ guest module in source; guest provider still registered in code, config-gated)
- search + techdocs

Also registered (out of Core claim): `aasPlugin`, `@internal/plugin-nexora-backend`.

Running local backend: health 200. Startup module-by-module log: NOT_ESTABLISHED. Load inferred from source + process up.

## Objective evidence

`index.ts` at tag; IQ-016 health responses.
