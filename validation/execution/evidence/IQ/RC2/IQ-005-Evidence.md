# IQ-005 Evidence (RC2) — Database connectivity

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-005 |
| related | URS-DATA-001, RA-018 |
| execution_timestamp | 2026-08-22T19:38:35+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | validation Postgres + production overlay |
| status | PASS |

## Procedure

Confirmed `backend.database.client: pg` in production overlay. Confirmed Postgres service healthy. Confirmed Control Plane performed catalog database migration (plugin DBs created). Passwords not recorded.

## Actual result

| Check | Result |
| --- | --- |
| Config client | pg (`app-config.production.yaml`) |
| Postgres version | 16.14 (alpine) |
| pg_isready | accepting connections |
| Hosted SQLite | NO |
| Plugin databases present | backstage_plugin_catalog and others |
| Startup log | Performing database migration (catalog); Listening on :7007 |

## Evidence

Config excerpt; `postgres -V`; `pg_isready`; `\l` listing plugin DBs; redacted startup log lines.
