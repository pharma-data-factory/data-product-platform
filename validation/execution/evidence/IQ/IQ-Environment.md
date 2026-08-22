# IQ execution environment

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| canonical_tag | platform-core-v1.0-rc1 |
| tag_target | dcc937370e325cbaf493ed28ab02dccca3557d53 |
| HEAD_at_execution | 33e7fa0ab2d3074cb8b76036137432ce6c06f32e |
| HEAD_vs_tag | One commit after tag: `validation/execution/RC1-Finalization-Record.md` only |
| worktree | CLEAN |
| execution_timestamp | 2026-08-22T18:00:07+02:00 (identity); 2026-08-22T18:01:55+02:00 (runtime) |
| named_human_executor | NOT_ESTABLISHED |
| technical_operator | Cursor agent on host SCHMECKM, Windows user `marku` |
| limitation | Evidence conventions require a named human executor. None was fabricated. |
| hostname | SCHMECKM |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Node | v22.12.0 |
| Yarn | 4.13.0 |
| Backstage (backstage.json) | 1.53.0 |
| `@backstage/cli` lockfile | 0.36.4 |
| `@backstage/backend-defaults` lockfile | 0.17.6 |
| Docker Engine | 29.5.3 |
| Docker Compose | v5.1.4 |
| IDP docker compose | not running |
| Running Control Plane | local `backstage-cli package start` with `--env-file=../../.env` (not docker/production overlay) |
| Ports observed | 7007 backend (node), 3000 frontend (node), 5432 bound by unrelated `hap-postgres` |
| Browser | NOT_ESTABLISHED |
| Postgres for this candidate | NOT_ESTABLISHED (pdf-pilot-pg exited; product compose not up) |
