# IQ-FIND-001

| Field | Value |
| --- | --- |
| ID | IQ-FIND-001 |
| Originating IQ | IQ-006 |
| Opened | 2026-08-22 (RC1 IQ) |
| Severity | Major |
| Status | **CLOSED** |
| Closed on | 2026-08-22 |
| Closure candidate | Platform Core 1.0-RC2 (`platform-core-v1.0-rc2` / `e2b2297a1506603ba05e6fb1dcf973ac046ad009`) |
| Change control | CC-001 |

## Description

The candidate configures Create-authorization audit persistence as `.runtime/create-authorization-audit.jsonl` (env-overridable). On RC1, hosted start definitions did not mount a persistent volume for that path.

## Expected behavior

URS-AUD-001 / IQ-006: after merge, the audit path is present **and** sits on a durable volume for the intended hosted host.

## Observed behavior (RC1)

- Path configured in app-config
- No compose/Dockerfile volume for `.runtime`
- IQ-006 FAIL

## Remediation (CC-001)

Named volume `create_authorization_audit` → `/app/.runtime`; env path `/app/.runtime/create-authorization-audit.jsonl`; Dockerfile VOLUME + writable dir.

## Closure evidence (RC2 formal re-test)

`validation/execution/evidence/IQ/RC2/IQ-006-Evidence.md`

Probe `IQ-RC2-006-20260822193840` persisted across `force-recreate` of control-plane; post-recreate write succeeded. IQ-006 RC2 status: **PASS**.

## Affected

| Item | ID |
| --- | --- |
| URS | URS-AUD-001 |
| SYS | SYS-AUD-001 |
| TDS | TDS-AUD-001 |
| Risk | RA-007 |

## Notes

Closure is for the IQ installation finding only. Formal OQ of Create-authorization audit restart remains **NOT_EXECUTED**. Not Part 11.
