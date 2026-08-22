# IQ-013 Evidence — Build artifact

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-013 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Verification host; no RC1 image running |
| status | BLOCKED |

## Procedure performed

Looked for a candidate image digest and `yarn build:backend` artifacts. Compared timestamps to the RC1 tag. Did not rebuild.

## Expected result (unchanged)

A single artifact identity is recorded for the execution environment.

## Actual result

Running identity: local `backstage-cli package start` from source, not an image.

Local dist exists but **predates** the RC1 tag:

| Artifact | Last write |
| --- | --- |
| packages/backend/dist/bundle.tar.gz | 2026-08-22T13:54:14+02:00 (17 197 983 bytes) |
| packages/backend/dist/skeleton.tar.gz | 2026-08-22T13:53:54+02:00 |
| RC1 tag commit | 2026-08-22T17:05:10+02:00 |

Images named `pharma-data-factory:pilot-exit` / `pharma-data-factory` are not running and are not evidenced as this tag. No image digest for `platform-core-v1.0-rc1`.

A unique RC1 build/image identity for this execution environment is **NOT_ESTABLISHED**.

## Objective evidence

`Test-Path` / `Get-Item` timestamps; `docker ps -a` excerpt; tag commit date.
