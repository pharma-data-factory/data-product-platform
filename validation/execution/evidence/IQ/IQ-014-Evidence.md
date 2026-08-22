# IQ-014 Evidence — Runtime versions

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-014 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T18:00:07+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Host SCHMECKM |
| status | PASS |

## Procedure performed

Recorded Node, OS, Yarn, Docker. Postgres for this candidate not running — recorded NOT_ESTABLISHED rather than using another project’s engine.

## Expected result (unchanged)

Versions recorded. Manifest observed values may be used as a starting point and must be confirmed.

## Actual result

| Item | Confirmed |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Node | v22.12.0 (matches planner host / engines 22 \|\| 24) |
| Yarn | 4.13.0 |
| Docker Engine | 29.5.3 |
| Docker Compose | v5.1.4 |
| Postgres (this candidate) | NOT_ESTABLISHED |
| Container runtime for Control Plane | not used (local node) |

## Objective evidence

`node -v`, `yarn -v`, `[Environment]::OSVersion`, `docker version`.
