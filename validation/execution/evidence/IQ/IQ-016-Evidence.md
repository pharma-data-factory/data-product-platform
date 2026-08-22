# IQ-016 Evidence — Health endpoints

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-016 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Local backend `127.0.0.1:7007` (not hosted overlay) |
| status | PASS |

## Procedure performed

HTTP GET to documented health URLs. No authorization OQ.

## Expected result (unchanged)

Health responses indicate the process is up. This is not an OQ of authorization.

## Actual result

| URL | HTTP | Body (redacted) |
| --- | --- | --- |
| `/.backstage/health/v1/readiness` | 200 | `{"status":"ok"}` |
| `/.backstage/health/v1/liveness` | 200 | `{"status":"ok"}` |
| `/api/entitlements/health` | 200 | `{"status":"ok"}` |

Limitation: process is the local yarn-start backend, not compose/production.

## Objective evidence

Invoke-WebRequest output 2026-08-22T18:01:55+02:00.
