# CC-001 — Persistent Create-authorization audit storage

| Field | Value |
| --- | --- |
| Change ID | CC-001 |
| Date | 2026-08-22 |
| Source | IQ-FIND-001 / IQ-006 |
| Candidate from | Platform Core 1.0-RC1 (`platform-core-v1.0-rc1`) |
| Candidate to | Platform Core 1.0-RC2 (proposed `platform-core-v1.0-rc2`) |
| Finding status after implementation | REMEDIATED_PENDING_RETEST (not CLOSED) |
| Part 11 | NOT_CLAIMED |
| Validation status | NOT_VALIDATED |

RC1 tag and commit are not modified.

## Affected requirements

| Item | ID |
| --- | --- |
| URS | URS-AUD-001 |
| SYS | SYS-AUD-001 |
| TDS | TDS-AUD-001 |
| Risk | RA-007 |

URS/SYS/TDS wording is unchanged. This change supplies the hosted volume the IQ expected.

## Current behavior (RC1)

`commercial.createAuthorizationAuditPath` defaults to `.runtime/create-authorization-audit.jsonl`. The store creates the directory on first write. Hosted compose and the production image do **not** mount persistent storage for that path. A container recreate loses the JSONL.

## Expected behavior

On docker/production deployment, the configured audit file lives on a named Docker volume that survives application/container restart. No Part 11 controls. Audit subsystem unchanged.

## Root cause

Confirmed by inspection (not guessed):

| Artifact | Observation |
| --- | --- |
| `app-config.yaml` / `app-config.production.yaml` | Path configured |
| `docker-compose.yml` `control-plane` | No volume for `.runtime` |
| `docker-compose.production.yml` `control-plane` | No volume for `.runtime` |
| `packages/backend/Dockerfile` | `USER node`; no `mkdir`/`VOLUME` for `/app/.runtime` |
| Root `Dockerfile` | No volume |
| `.dockerignore` | Excludes `.runtime` from the image (correct; must be a mount) |
| Runtime user | Production image runs as `node`; mount must be writable by `node` |

## Proposed remediation

1. Named volume `create_authorization_audit` mounted at `/app/.runtime` on both compose files.
2. `CREATE_AUTHORIZATION_AUDIT_PATH=/app/.runtime/create-authorization-audit.jsonl` set in those services so the configured path matches the mount.
3. Production Dockerfile: create `/app/.runtime` owned by `node` and declare `VOLUME`.
4. Root compose Dockerfile: create `/app/.runtime` and declare `VOLUME`.
5. Developer file tests for the mount/path pairing.

Supporting compile-only fixes required to `yarn tsc` / `yarn build:backend` on this tree (not audit logic): `GoldenPathVisual` caption coordinate types; nexora-backend test mock typing. No URS change.

## Validation impact

Formal IQ-006 must be re-executed on RC2. Related blocked IQ items that need a hosted stack may be unblocked if the validation compose is used. OQ of audit restart remains NOT_EXECUTED until a later phase.

## Regression impact

No change to `PlatformPermissionPolicy` or JSONL format. Risk is compose/image-only: wrong mount path or permissions would prevent writes. Developer tests assert path/mount pairing.

## Required re-tests

See `validation/execution/RC2-Impact-Assessment.md`.
