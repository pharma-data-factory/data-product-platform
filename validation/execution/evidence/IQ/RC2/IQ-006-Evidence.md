# IQ-006 Evidence (RC2) — Audit persistence (finding re-test)

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-006 |
| related | URS-AUD-001, RA-007 |
| finding | IQ-FIND-001 |
| execution_timestamp | 2026-08-22T19:38:35+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | validation stack; volume create_authorization_audit |
| status | PASS |

## Procedure

1. Confirmed env path `/app/.runtime/create-authorization-audit.jsonl`
2. Confirmed mount `platform-core-validation_create_authorization_audit` → `/app/.runtime`
3. Appended identifiable probe `IQ-RC2-006-20260822193840`
4. Confirmed present before recreate
5. `docker compose ... up -d --force-recreate control-plane`
6. Confirmed same probe after recreate
7. Appended post-recreate probe; confirmed writable
8. Health returned 200 after recreate

No secret values recorded. Probe lines are synthetic IQ markers, not operational Create decisions. Not Part 11.

## Actual result

| Step | Result |
| --- | --- |
| Configured path | `/app/.runtime/create-authorization-audit.jsonl` |
| Volume mount | YES |
| Directory owner | node:node |
| Before recreate | BEFORE_RESTART_OK |
| After force-recreate | AFTER_RECREATE_PERSIST_OK |
| Writable after recreate | AFTER_WRITE_OK |
| Health after recreate | 200 |

## Evidence

Mount listing; `printenv CREATE_AUTHORIZATION_AUDIT_PATH`; grep of probe markers; volume name; health URL on :7008.
