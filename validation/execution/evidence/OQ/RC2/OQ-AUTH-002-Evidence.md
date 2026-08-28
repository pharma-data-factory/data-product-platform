# OQ-AUTH-002 Evidence (RC2) — Unauthenticated access

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-AUTH-002 |
| related | URS-AUTH-001, RA-001, TEST-AUTH-004, TEST-SEC-001 |
| execution_timestamp | 2026-08-22T20:10:11+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Hosted validation Control Plane http://127.0.0.1:7008 |
| execution_method | Unauthenticated HTTP (curl) without session cookie |
| status | PASS |

## Procedure

Called protected routes without credentials: Scaffolder task create, entitlements admin, certification POST, and catalog entities GET.

## Actual result

| Route | HTTP | Body (excerpt) |
| --- | --- | --- |
| POST /api/scaffolder/v2/tasks | 401 | AuthenticationError Missing credentials |
| GET /api/entitlements/admin/entitlements | 401 | AuthenticationError Missing credentials |
| POST /api/data-products/certification | 401 | AuthenticationError Missing credentials |
| GET /api/catalog/entities?limit=1 | 401 | AuthenticationError Missing credentials |

No catalog mutation observed. No Create task created.

## Objective evidence

`OQ-AUTH-002-*.headers`, `OQ-AUTH-002-*.body`, `OQ-AUTH-002-summary.txt`
