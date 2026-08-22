# IQ-010 Evidence (RC2) — Secret configuration spot-check

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-010 |
| related | URS-DATA-002, URS-GH-002, RA-010 |
| execution_timestamp | 2026-08-22T19:39:59+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Committed overlays at RC2 |
| status | PASS |

## Procedure

Spot-check after CC-001 env addition. Scanned committed `app-config*.yaml` for PEM/token prefixes. Confirmed `CREATE_AUTHORIZATION_AUDIT_PATH` / `createAuthorizationAuditPath` remain `${ENV}` forms. Values not copied.

## Actual result

PEM/token hits: **0** across overlays. New audit path still env-substituted. No raw secrets in compose validation defaults beyond documented local-only placeholders outside committed secret fields.

## Evidence

Scan counts; redacted key names only.
