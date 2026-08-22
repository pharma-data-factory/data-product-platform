# IQ-013 Evidence (RC2) — Build artifact

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-013 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T19:39:59+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | validation stack |
| status | PASS |

## Procedure

Recorded the running image identity used for verification.

## Actual result

| Item | Value |
| --- | --- |
| Image tag | platform-core:1.0-rc2 |
| Image ID | sha256:b25c9d4db4756ca21d4808e791e513277e7747a7946f7c8d0ecb9f84f83d4af8 |
| Created | 2026-08-22T17:07:33Z |
| Running container | platform-core-validation-control-plane-1 |
| Compose file | docker-compose.validation.yml |

Single artifact identity for this execution environment: **YES**.

## Evidence

`docker image inspect`; `docker compose images`.
