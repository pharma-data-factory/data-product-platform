# Data Integrity Impact — CSV Phase 0 (PRELIMINARY ALCOA+)

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-DI-001 |
| Status | PRELIMINARY — not a compliance claim |
| Product validation status | **NOT_VALIDATED** |
| Date | 2026-08-23 |

This evaluates how **Platform Core** capabilities **may influence** ALCOA+ principles if the platform is used in a regulated context. It does **not** claim ALCOA+ compliance or Part 11 controls.

---

## ALCOA+ mapping (preliminary)

| Principle | Platform influence (Baseline 0.1 candidate) | Gap / risk |
| --- | --- | --- |
| **Attributable** | Authn associates actions with GitHub/Backstage identity; create-authorization audit may store actor | Guest identity weakens attribution if used outside local-only; interactive auth not re-verified in AS-IS |
| **Legible** | UI + stored JSON/YAML/Markdown artifacts are human/machine readable | Log retention/format standards not frozen |
| **Contemporaneous** | Timestamps on scaffolder tasks / audit append (where implemented) | Clock sync / trusted time not established |
| **Original** | Catalog DB and audit files may be original technical records; GitHub holds original source for generated repos | Which store is “original” for which record type needs SOP |
| **Accurate** | Permission policy unit-tested; catalog accuracy depends on registered locations | Sample entities can pollute accuracy of discovery; overlays/file stores need control |
| **Complete** | Unknown for audit completeness (failure paths, denied actions coverage) | Completeness of audit trail not proven; Part 11 audit not claimed |
| **Consistent** | Yarn lockfile + pinned Backstage version support consistent builds | Dirty WT breaks configuration consistency; Python 3.11 vs 3.12 drift for GPs |
| **Enduring** | Postgres volumes in Compose; SQLite local files; audit JSONL path | Backup/restore **UNKNOWN** / not verified |
| **Available** | Platform availability depends on host/Compose; GitHub SaaS dependency | No validated availability commitment |

---

## Implications for Phase 0

1. Access control and identity are the primary Platform Core ALCOA+ levers for Baseline 0.1.  
2. Do not represent technical certification labels as GMP integrity conclusions.  
3. Enduring/Available require operational procedures outside this Phase 0 package.  
4. Generated Data Products need their own ALCOA+ assessment when in GxP use.

**No compliance claim is made.**
