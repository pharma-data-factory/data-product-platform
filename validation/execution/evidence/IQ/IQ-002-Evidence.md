# IQ-002 Evidence — Production configuration overlay

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-002 |
| related | URS-CFG-001, URS-CFG-002, TEST-CFG-001 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | See IQ-Environment.md |
| status | BLOCKED |

## Procedure performed

Inspected start-script/CMD in the candidate. Inspected the running process command line. `docker compose ps` for this project.

## Expected result (unchanged)

Overlay set matches the intended hosted profile. Guest-enabled local-only yaml is not the sole hosted config.

## Actual result

**Intended hosted CMD (candidate, not running):**

- Root `Dockerfile` (compose/dev image): `yarn start --config app-config.yaml --config app-config.docker.yaml`
- `packages/backend/Dockerfile` (production image): `node packages/backend --config app-config.yaml --config app-config.production.yaml --config app-config.github.yaml`

**Running process on this host:** `backstage-cli package start` with `--env-file=../../.env`. No `--config app-config.docker.yaml` or production overlay. Product `docker compose` is not running.

Hosted instance confirmation is unavailable. The running instance uses the local Guest-enabled profile and is **not** accepted as the hosted IQ subject.

## Objective evidence

Dockerfile CMD lines; Win32_Process command line for PID 122124 / parent 88936; `docker compose ps` empty for this project.
