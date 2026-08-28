# OQ-CAT-001 Evidence (RC2) — Production catalog

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | OQ-CAT-001 |
| related | URS-CAT-001, URS-CAT-003, RA-010 |
| execution_timestamp | 2026-08-22T20:04:30+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Validation Postgres `backstage_plugin_catalog` for hosted CP |
| execution_method | SQL query of `final_entities` (HTTP catalog requires auth → 401) |
| status | PASS |

## Procedure

Unauthenticated HTTP catalog returned 401 (permission enabled). Queried hosted catalog DB for production entity refs.

## Actual result

| Check | Result |
| --- | --- |
| Entity count | **65** |
| Kinds | API 5, Component 22, Group 6, Location 12, System 6, Template 8, User 6 |
| Official Golden Path templates present | mqtt-temperature-data-product, rest-equipment-data-product, oee-data-product (+ others) |
| Platform component entities present | e.g. mqtt-consumer, rest-api, unified-namespace, … |

## Objective evidence

`OQ-CAT-001-entity-refs.txt`, `OQ-CAT-locations-excerpt.txt`
