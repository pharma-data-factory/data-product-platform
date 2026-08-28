# OQ-SEC-002 Evidence (RC2) — Compiled frontend bundle scan

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-SEC-002 |
| related | URS-GH-002, RA-009 |
| execution_timestamp | 2026-08-22T20:08:00+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Image `platform-core:1.0-rc2` path `/app/packages/app/dist/static` |
| execution_method | Container filesystem scan of compiled JS (and classification of substring hits) |
| status | PASS |

## Procedure

Scanned the production frontend static assets served by the RC2 image for private keys, GitHub/AWS token shapes, and literal client secrets. Did not invent or paste secret values.

## Actual result

| Check | Result |
| --- | --- |
| `*.js` files | 393 |
| Files containing `PRIVATE KEY` | 0 |
| `ghp_` **token-shaped** matches | 0 (only 4-char substring false positives in minified JS) |
| `AKIA` **key-shaped** matches | 0 (substring/false positives, mainly `.map`) |
| Literal `clientSecret: '<value>'` secrets | 0 |
| `clientSecret` occurrences | library field names / `${AUTH_GOOGLE_CLIENT_SECRET}` placeholders / docs examples |

## Objective evidence

`OQ-SEC-002-final-counts.txt`, `OQ-SEC-002-classify.txt`, `OQ-SEC-002-contexts.txt` (redacted)
