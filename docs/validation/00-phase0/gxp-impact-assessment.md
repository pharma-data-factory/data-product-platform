# GxP Impact Assessment — CSV Phase 0 (PRELIMINARY)

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-GXP-001 |
| Status | PRELIMINARY — **GATE-04 GxP Impact Approval** required |
| Product validation status | **NOT_VALIDATED** |
| Compliance claims | **NONE** — does not claim 21 CFR Part 11, Annex 11, or GAMP certificate |
| Date | 2026-08-23 |

---

## 1. Purpose

Classify potential GxP impact of the **proposed Platform Core Baseline 0.1** Intended Use. This is a scoping aid, not a regulatory determination and not a validation.

Impact classes: `DIRECT` | `INDIRECT` | `NONE` | `UNKNOWN`

---

## 2. Assessment table (Platform Core candidate)

| Potential effect | Class | Rationale |
| --- | --- | --- |
| Create regulated records | **INDIRECT** / **UNKNOWN** | Platform may create catalog metadata, scaffolder task logs, and create-authorization audit files. Whether any are **GxP records** depends on customer SOPs and Intended Use approval — not established as eDMS. |
| Modify regulated records | **UNKNOWN** | If organizations store regulated evidence only in GitHub/other systems, platform may not modify those records. If audit JSONL or catalog annotations become controlled records, impact rises. |
| Process regulated data | **INDIRECT** | Control Plane typically processes identity, entitlements, catalog metadata — not batch/quality process data. Generated Data Products **may** process regulated data (**Layer 3**). |
| Influence GxP decisions | **NONE** (Baseline 0.1 intent) | Platform must not auto-disposition batches, release product, or make clinical/quality release decisions. Technical “CERTIFIED” labels must not be interpreted as GMP validation (AS-IS + existing validation docs). |
| Deploy software that processes GxP data | **INDIRECT** | Scaffolder may publish repos whose later deployment processes GxP data. Platform enables creation; **site deployment** is Layer 3/4. |
| Generate evidence | **INDIRECT** | May generate technical audit trails and CI metadata; not Part 11 signed validation evidence by default. |
| Control access | **DIRECT** (security relevance) | Authentication and authorization control who can create/publish templates and view assets. Access control of a tool used in regulated contexts is GxP-relevant even when the tool is not the system of record. |
| Affect data integrity | **INDIRECT** | Misconfiguration of permissions, Guest misuse, or incorrect template publish can affect integrity of **development** artifacts and potentially downstream systems if misused. |

---

## 3. Out-of-scope components (impact note)

| Component | Note |
| --- | --- |
| Generated Data Products | Potentially **DIRECT** if used on regulated data — **separate** assessment |
| Validation Expert | Could become DIRECT for validation records — **OUT of Baseline 0.1**; FUTURE |
| AAS / Nexora mock / OEE commercial | Not Baseline 0.1; industrial data paths UNKNOWN/FUTURE |

---

## 4. Preliminary conclusion (recommendation only)

For **Platform Core Baseline 0.1** as a developer control plane with access control and scaffolding:

- Overall preliminary posture: **INDIRECT GxP impact** (category typically associated with infrastructure / development tools supporting regulated software delivery), with **DIRECT** aspects limited to **access control**.  
- Does **not** establish the platform as a validated GxP computerized system.  
- Status remains **NOT_VALIDATED**.

Final GxP categorization (e.g., GAMP category / system criticality) requires **GATE-04** human Quality decision.

---

## 5. Human approval

| Gate | Decision |
| --- | --- |
| **GATE-04** | Approve or revise impact classes and overall posture |

**AI must not approve GATE-04.**
