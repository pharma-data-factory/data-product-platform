# IQ-FIND-001

| Field | Value |
| --- | --- |
| ID | IQ-FIND-001 |
| Originating IQ | IQ-006 |
| Date | 2026-08-22 |
| Severity | Major |
| Status | REMEDIATED_PENDING_RETEST (CC-001). Not CLOSED until formal IQ-006 re-test on RC2. |

## Description

The candidate configures Create-authorization audit persistence as `.runtime/create-authorization-audit.jsonl` (env-overridable). The hosted start definitions do not mount a persistent volume for that path.

## Expected behavior

URS-AUD-001 / IQ-006: after merge, the audit path is present **and**, if the default `.runtime/...` path is used, it sits on a durable volume for the intended hosted host.

## Observed behavior

- `app-config.yaml` and `app-config.production.yaml` set `commercial.createAuthorizationAuditPath`.
- Root `docker-compose.yml` `control-plane` service has **no** volume for `.runtime`.
- `packages/backend/Dockerfile` (production image) has **no** VOLUME/mount for `.runtime`.
- On the verification host, `.runtime/` did not exist at execution (first write not performed).

## Affected

| Item | ID |
| --- | --- |
| URS | URS-AUD-001 |
| SYS | SYS-AUD-001 |
| TDS | TDS-AUD-001 |
| Risk | RA-007 |

## Potential validation impact

Hosted restart can lose Create-authorization audit records. IQ of durable audit installation is not satisfied for compose/production profiles.

## Recommended disposition

Change record after RC1: mount a durable volume (or external store) for the audit JSONL on hosted profiles. Re-execute IQ-006. Do not treat this finding as OQ evidence.
