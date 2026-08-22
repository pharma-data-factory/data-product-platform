# IQ-002 Evidence (RC2) — Production configuration overlay

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-002 |
| related | URS-CFG-001, URS-CFG-002, TEST-CFG-001 |
| execution_timestamp | 2026-08-22T19:38:35+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | docker-compose.validation.yml / platform-core:1.0-rc2 |
| status | PASS |

## Procedure

Inspected running container Cmd and Entrypoint. Confirmed image and NODE_ENV.

## Actual result

Running Cmd:

`node packages/backend --config app-config.yaml --config app-config.production.yaml --config app-config.github.yaml`

| Check | Result |
| --- | --- |
| Production overlay loaded | YES |
| GitHub overlay loaded | YES |
| Guest-only local profile | NO (production overlay) |
| NODE_ENV | production |
| Image | platform-core:1.0-rc2 |

RC1 BLOCKED condition (no hosted process) is cleared.

## Evidence

`docker inspect` Cmd/Image; `printenv NODE_ENV`.
