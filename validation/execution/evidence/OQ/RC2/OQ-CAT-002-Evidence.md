# OQ-CAT-002 Evidence (RC2) — Samples absent

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-CAT-002 |
| related | URS-CAT-002, RA-010 |
| execution_timestamp | 2026-08-22T20:04:30+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Validation Postgres `backstage_plugin_catalog` |
| execution_method | SQL absence checks for known sample entity names / sample locations |
| status | PASS |

## Actual result

| Check | Count |
| --- | --- |
| `final_entity` text contains sample-orders-product / artist-lookup / playback-order | **0** |
| `locations.target` ILIKE `%samples%` | **0** |

## Objective evidence

SQL counts recorded in this file; consistent with RC2 IQ-009.
