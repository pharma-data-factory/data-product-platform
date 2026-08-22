# IQ-009 Evidence (RC2) — Sample catalog absence

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-009 |
| related | URS-CAT-002, RA-010, TEST-CAT-002, TEST-IQ-001 |
| execution_timestamp | 2026-08-22T19:39:59+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Hosted validation Control Plane + Postgres catalog DB |
| status | PASS |

## Procedure

Confirmed production overlay locations omit `catalog/samples` (IQ-002 established that overlay is loaded). Unauthenticated catalog HTTP returned 401 (permission enabled). Queried `backstage_plugin_catalog` for sample-only entity absence and sample location targets.

## Actual result

| Check | Result |
| --- | --- |
| `app-config.production.yaml` locations include samples | NO |
| HTTP `sample-orders-product` | 401 (auth required; not used as presence proof) |
| DB `entity_ref = component:default/sample-orders-product` | count **0** |
| DB final_entity text contains `sample-orders-product` | count **0** |
| DB locations with target ILIKE `%samples%` | count **0** |
| Templates present | 8 production templates (mqtt/rest/oee/…) |

## Evidence

Production locations excerpt; SQL counts on `backstage_plugin_catalog.final_entities` / `locations` (no passwords).
