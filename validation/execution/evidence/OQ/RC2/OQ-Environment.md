# RC2 OQ execution environment

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| product | Platform Core |
| canonical_tag | platform-core-v1.0-rc2 |
| tag_target_commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| IQ_evidence_commit | 407c4969896a70f0aa17c560aba8c64214785f7d |
| HEAD_at_execution_start | 6e8318a093da871a665df92c2ac004d895a49b1f |
| worktree | CLEAN |
| baseline | PDF-PC-VAL-BL-1.0 |
| IQ_result | PASS WITH OPEN OBSERVATIONS |
| IQ-FIND-001 | CLOSED |
| validation_status | NOT_VALIDATED |
| UAT | NOT_EXECUTED |
| execution_date | 2026-08-22 |
| execution_timestamp_window | 2026-08-22T20:01:50+02:00 … 2026-08-22T20:10:11+02:00 |
| named_human_executor | NOT_ESTABLISHED |
| technical_operator | Cursor agent on host SCHMECKM |
| hostname | SCHMECKM |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Docker Engine | 29.5.3 |
| Image | platform-core:1.0-rc2 |
| Compose file | docker-compose.validation.yml |
| Control Plane | http://127.0.0.1:7008 (container :7007) |
| Postgres | postgres:16-alpine, healthy, host 5435→5432 |
| Audit volume | platform-core-validation_create_authorization_audit → /app/.runtime |
| ENTITLEMENT_PROVIDER | ABSENT_DEFAULT_LOCAL (not AWS) |
| LEGAL_DISTRIBUTION_STATUS | BLOCKED |
| auth_sessions_in_DB | 0 |
| user_info_rows | 0 |
| Browser interactive OAuth | NOT_EXECUTED |
| Browser | NOT_ESTABLISHED |
| worktree_note_after_execution | CLEAN at OQ start. After evidence writing, unrelated non-validation product paths appear DIRTY (Validation Expert / home UI / policy permissions). Those paths were **not** modified by this OQ execution and are **not** OQ evidence. RC2 product tag unchanged. |

Governance note: Evidence conventions require a named human executor. None was fabricated. Missing interactive Catalog User sessions block role-based and GitHub/Actions live OQ items.
