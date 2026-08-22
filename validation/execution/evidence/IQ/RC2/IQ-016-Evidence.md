# IQ-016 Evidence (RC2) — Health endpoints

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-016 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T19:39:59+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Hosted validation Control Plane :7008 |
| status | PASS |

## Procedure

HTTP GET to readiness, liveness, and entitlements health on the hosted validation instance.

## Actual result

| URL | HTTP | Body |
| --- | --- | --- |
| `/.backstage/health/v1/readiness` | 200 | `{"status":"ok"}` |
| `/.backstage/health/v1/liveness` | 200 | `{"status":"ok"}` |
| `/api/entitlements/health` | 200 | `{"status":"ok"}` |

This is not an OQ of authorization.

## Evidence

Invoke-WebRequest responses.
