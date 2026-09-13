# URS Composer — Validation Package Outline

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-URS-VP-OUTLINE-001 |
| Status | **DRAFT / NOT EXECUTED** |
| Package | URS Composer (separate from Platform Core) |
| Intended use | [intended-use.md](./intended-use.md) |
| Date | 2026-09-10 |

Scaffold only. No IQ, OQ, or UAT protocols in this outline have been
executed. Subsystem validation remains **NOT VALIDATED**.

---

## Planned protocol areas

| Area | IQ | OQ | UAT | Notes |
| --- | --- | --- | --- | --- |
| Authorization (permission / RBAC gates for URS actions) | Planned | Planned | Planned | Backstage Permission Framework; not a proprietary RBAC engine |
| Baseline immutability (approved baselines cannot be mutated) | Planned | Planned | Planned | ADR-006 |
| Electronic signature PIN (re-auth, payload hash binding) | Planned | Planned | Planned | Technical workflow control only — not Part 11 claim |
| Change control (change requests against approved baselines) | Planned | Planned | Planned | Product UI gate still in progress |
| Audit trail append-only | Planned | Planned | Planned | Postgres immutability controls when persistence mode is `postgres` |

---

## Execution status

| Protocol | Status |
| --- | --- |
| IQ | **DRAFT / NOT EXECUTED** |
| OQ | **DRAFT / NOT EXECUTED** |
| UAT | **DRAFT / NOT EXECUTED** |

Do not treat passing developer tests or demo flows as formal CSV evidence.
