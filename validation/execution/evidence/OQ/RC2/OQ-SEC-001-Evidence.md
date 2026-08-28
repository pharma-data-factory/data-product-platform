# OQ-SEC-001 Evidence (RC2) — Committed configuration secrets review

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-SEC-001 |
| related | URS-DATA-002, URS-GH-002, RA-010, RA-009 |
| execution_timestamp | 2026-08-22T20:03:00+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Source tree at annotated tag (immutable candidate) |
| execution_method | git show of app-config*.yaml and docker-compose*.yml at tag; pattern scan |
| status | PASS |

## Procedure

Reviewed committed overlays/compose at RC2 tag for raw secrets, private keys, and tokens. Values not copied into evidence.

## Actual result

| Check | Result |
| --- | --- |
| Config/compose files scanned | 9 |
| Raw secret / PEM / token pattern hits (non-ENV) | **0** |
| secret/token/password/privateKey/clientSecret keys using `${ENV}` | 30 |
| Public `clientId` allowed | not treated as finding |

## Objective evidence

`OQ-SEC-001-summary.txt`, `OQ-SEC-001-files.txt`, `OQ-SEC-001-scan-hits.txt`, `OQ-SEC-001-env-placeholders.txt` (key names only)
