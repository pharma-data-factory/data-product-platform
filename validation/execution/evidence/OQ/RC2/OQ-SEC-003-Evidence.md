# OQ-SEC-003 Evidence (RC2) — Public clientId vs secrets

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-SEC-003 |
| related | URS-GH-002, RA-009 |
| execution_timestamp | 2026-08-22T20:08:30+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | OQ-SEC-001 + OQ-SEC-002 results |
| execution_method | Cross-check of committed overlays and compiled bundle scan |
| status | PASS |

## Procedure

Confirmed committed configs keep secrets as `${ENV}` placeholders and the compiled frontend does not embed private keys, tokens, or literal client secrets. Public `clientId` may appear.

## Actual result

| Item | Frontend-visible / committed | Assessment |
| --- | --- | --- |
| `clientId` | May appear (permitted) | OK |
| `clientSecret` | ENV placeholder or library field name only | OK |
| Private keys / tokens | Absent as real material | OK |

## Objective evidence

References OQ-SEC-001 and OQ-SEC-002 evidence files.
