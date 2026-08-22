# IQ-008 Evidence — Production catalog configuration

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-008 |
| related | URS-CAT-001, URS-CAT-002 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Static docker/production overlays |
| status | PASS |

## Procedure performed

Recorded `catalog.locations` from `app-config.docker.yaml` and `app-config.production.yaml`.

## Expected result (unchanged)

Hosted locations include org/entities/templates as specified by docker/production overlays, not local-only sample files.

## Actual result

Both hosted overlays list: `catalog/entities.yaml`, `platform-components/catalog.yaml`, `catalog/org.yaml`, and the official Template files (python, node, mqtt-connector, mqtt-temperature, rest-equipment, unified-namespace, machine-state, oee). Docker also lists `templates/aas-asset/template.yaml`. Neither lists `catalog/samples/`.

Live merged runtime of a hosted process: not obtained (IQ-002 BLOCKED).

## Objective evidence

`app-config.docker.yaml` lines 43–88; `app-config.production.yaml` lines 50–93.
