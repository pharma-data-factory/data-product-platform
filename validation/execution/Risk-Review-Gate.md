# Risk review gate — Platform Core 1.0-RC1

**Baseline:** PDF-PC-VAL-BL-1.0  
**Document:** `validation/baseline/Risk-Assessment.md`  
**Acceptance:** This gate does **not** accept RA-001 … RA-018.  
**Date:** 2026-08-22  

Humans must record review outcomes. AI must not write APPROVED or ACCEPTED.

| Classification | Meaning |
| --- | --- |
| MUST_REVIEW_BEFORE_IQ | Configuration/install hazard should be reviewed before IQ starts |
| MUST_REVIEW_BEFORE_OQ | Operational hazard should be reviewed before OQ starts |
| MUST_REVIEW_BEFORE_UAT | Intended-use / claim hazard should be reviewed before UAT |
| MAY_REMAIN_OPEN_UNTIL_VALIDATION_SUMMARY | May stay open through execution; must appear in the validation summary |
| OUT_OF_SCOPE | Outside Platform Core (DEC-SCOPE-001 or equivalent) |

---

| ID | Theme | Gate | Rationale |
| --- | --- | --- | --- |
| RA-001 | Unauthenticated access | MUST_REVIEW_BEFORE_OQ | OQ-AUTH-002 is the operational challenge. IQ only sees config. |
| RA-002 | Guest in hosted env | MUST_REVIEW_BEFORE_IQ | Guest omission is an install/config property (IQ-004). |
| RA-003 | UI-only gating | MUST_REVIEW_BEFORE_OQ | Backend authorize is OQ-RBAC-005. |
| RA-004 | Missing role mapping | MUST_REVIEW_BEFORE_OQ | Includes no-role user (OQ-RBAC-006). |
| RA-005 | Entitlement bypass | MUST_REVIEW_BEFORE_OQ | Create AND-gate is OQ. |
| RA-006 | Legal gate bypass | MUST_REVIEW_BEFORE_OQ | List is CLOSED; process residual remains NOT ACCEPTED. |
| RA-007 | Audit loss | MUST_REVIEW_BEFORE_IQ | Path/volume is IQ-006; restart is OQ-AUD-003. Review before IQ so the volume is in scope. |
| RA-008 | AAS in-memory audit | OUT_OF_SCOPE | AAS excluded (DEC-SCOPE-001). |
| RA-009 | GitHub publish | MUST_REVIEW_BEFORE_OQ | App vs OAuth and live publish are OQ/UAT. |
| RA-010 | Config integrity | MUST_REVIEW_BEFORE_IQ | Overlays, samples, secrets placeholders. |
| RA-011 | Generated repo content | OUT_OF_SCOPE | Golden Path content (DEC-SCOPE-001). |
| RA-012 | CI misrepresentation | MUST_REVIEW_BEFORE_OQ | PASS/FAIL/UNKNOWN/DEGRADED. |
| RA-013 | SOUP / supply chain | MUST_REVIEW_BEFORE_IQ | Lockfile/SBOM plan; no SOUP approval exists. |
| RA-014 | Traceability / evidence | MAY_REMAIN_OPEN_UNTIL_VALIDATION_SUMMARY | Evidence completeness is a package-level risk. |
| RA-015 | AI-generated validation content | MAY_REMAIN_OPEN_UNTIL_VALIDATION_SUMMARY | Process risk; human sampling required. Not accepted here. |
| RA-016 | Interactive Create unproven | MUST_REVIEW_BEFORE_UAT | UAT-001 / OQ-SCF-001. |
| RA-017 | Part 11 / IQ-OQ claimed present | MUST_REVIEW_BEFORE_UAT | Claim-control walk (OQ-LEG-002, UAT-005). Part 11 remains NOT_CLAIMED. |
| RA-018 | DB loss / SQLite hosted | MUST_REVIEW_BEFORE_IQ | Hosted Postgres (IQ-005). |

---

## Blockers for starting IQ (review, not acceptance)

Humans should complete MUST_REVIEW_BEFORE_IQ items (RA-002, RA-007, RA-010, RA-013, RA-018) before IQ execution. This document does not accept those risks.

## Blockers for starting OQ / UAT

Complete the corresponding MUST_REVIEW_* rows. RA-014 and RA-015 may remain open until the validation summary if humans so decide.

**No RA item is ACCEPTED by this phase.**
