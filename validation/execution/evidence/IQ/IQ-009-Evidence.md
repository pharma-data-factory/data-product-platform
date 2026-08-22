# IQ-009 Evidence — Sample catalog absence

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-009 |
| related | URS-CAT-002, RA-010, TEST-CAT-002, TEST-IQ-001 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Static hosted overlays; local catalog query only |
| status | BLOCKED |

## Procedure performed

Confirmed docker/production locations omit `catalog/samples`. Queried local backend for `component:default/sample-orders-product`. Did not have a hosted catalog ingest.

## Expected result (unchanged)

No `catalog/samples` location. Sample-only entities are not present.

## Actual result

Hosted overlay locations: no `catalog/samples` (see IQ-008).

Hosted catalog query: **not performed** (hosted instance not running).

Local running instance query: HTTP **401** (permission enabled; unauthenticated). Cannot treat local catalog as the hosted IQ subject (local `app-config.yaml` **does** register samples).

## Objective evidence

Location lists; HTTP 401 on `GET /api/catalog/entities/by-name/component/default/sample-orders-product`.
