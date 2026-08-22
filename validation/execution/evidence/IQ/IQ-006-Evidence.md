# IQ-006 Evidence — Audit persistence configuration

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-006 |
| related | URS-AUD-001, RA-007 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Candidate config + compose/Dockerfile inspection |
| status | FAIL |
| finding | IQ-FIND-001 |

## Procedure performed

Inspected `commercial.createAuthorizationAuditPath` on base and production. Listed `.runtime`. Inspected compose volumes and production Dockerfile for a durable mount. Did not write audit records.

## Expected result (unchanged)

Path is present after merge. Default `.runtime/create-authorization-audit.jsonl` is accepted only if the volume is durable for the intended host.

## Actual result

Path after merge: present (`${CREATE_AUTHORIZATION_AUDIT_PATH:-.runtime/create-authorization-audit.jsonl}` in `app-config.yaml` and `app-config.production.yaml`; docker overlay does not remove it).

`.runtime/` on the verification host: **absent**.

Hosted durability: `docker-compose.yml` `control-plane` has **no** volume for `.runtime`. `packages/backend/Dockerfile` has **no** VOLUME/mount for that path. Default path is therefore **not** shown to be durable for hosted/compose hosts.

## Objective evidence

Config keys (values are placeholders, not secrets). `Test-Path .runtime` = false. Compose/Dockerfile volume inspection.
