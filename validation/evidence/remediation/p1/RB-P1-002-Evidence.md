# RB-P1-002 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P1-002 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Related URS / SYS / TDS | URS-ENT-003 / SYS-ENT-003 / TDS-ENT-003 |
| Related risk | RA-005 |
| Evidence status | **TECHNICAL_EVIDENCE_AVAILABLE** |
| Date | 2026-08-22 |
| Phase | 4A developer remediation (not formal OQ) |

## Implementation reviewed

`POST /marketplace/register` returns `tenantCreated: false`, `accessGranted: false`, `requiresSignIn: true`. No `Set-Cookie` is issued. Payload type forces `tenantCreated: false`.

## Tests

- `plugins/entitlements-backend/src/router.test.ts` — register does not set session cookie; tenant not created; token not logged.

## Remaining limitations

Developer HTTP test, not a witnessed hosted procurement flow.
