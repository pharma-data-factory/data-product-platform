# IQ-005 Evidence — Database connectivity

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-005 |
| related | URS-DATA-001, RA-018 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | See IQ-Environment.md |
| status | BLOCKED |

## Procedure performed

Inspected `backend.database.client` on docker/production. Checked whether product Postgres/compose is running. Did not use unrelated host port 5432 (`hap-postgres`).

## Expected result (unchanged)

Hosted instance is not using SQLite. Database is reachable.

## Actual result

| Source | client |
| --- | --- |
| app-config.yaml (local) | better-sqlite3 |
| app-config.docker.yaml | pg |
| app-config.production.yaml | pg |
| docker-compose.yml image | postgres:16-alpine |

Product compose / `pdf-pilot-pg` is **not running**. Running Control Plane is local `yarn start` (SQLite per base config). Port 5432 on this host belongs to another project’s container, not this candidate. Hosted connection/health log: not obtained.

## Objective evidence

Config excerpts; `docker ps` showing `pdf-pilot-pg` Exited; empty `docker compose ps` for this project.
