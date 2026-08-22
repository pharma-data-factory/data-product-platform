# Verification traceability — Platform Core 1.0-RC1

**Baseline:** PDF-PC-VAL-BL-1.0  
**Candidate:** 1.0-RC1  
**Validation status:** NOT_VALIDATED  
**Formal tests:** NOT_EXECUTED  

Direction: URS → SYS → TDS → Risk → IQ/OQ/UAT → Evidence.

Developer tests remain technical candidates only. This view does **not** close gaps.

---

## Active URS (38)

| URS | SYS | TDS | Risk | Formal tests planned | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| URS-AUTH-001 | SYS-AUTH-001 | TDS-AUTH-001 | RA-001 | OQ-AUTH-001, OQ-AUTH-002, UAT-002 | NOT_EXECUTED | |
| URS-AUTH-002 | SYS-AUTH-002 | TDS-AUTH-002 | RA-001, RA-002 | IQ-004 | NOT_EXECUTED | |
| URS-AUTH-003 | SYS-AUTH-003 | TDS-AUTH-003 | RA-001, RA-004 | IQ-004, OQ-AUTH-001 | NOT_EXECUTED | |
| URS-AUTH-004 | SYS-AUTH-004 | TDS-AUTH-004 | RA-009 | IQ-015, OQ-GH-001, OQ-SEC-001 | NOT_EXECUTED | |
| URS-RBAC-001 | SYS-RBAC-001 | TDS-RBAC-001 | RA-004 | IQ-003, OQ-RBAC-001, OQ-RBAC-002 | NOT_EXECUTED | |
| URS-RBAC-002 | SYS-RBAC-002 | TDS-RBAC-002 | RA-004 | OQ-RBAC-006 | NOT_EXECUTED | Added Phase 5A.1 |
| URS-RBAC-003 | SYS-RBAC-003 | TDS-RBAC-003 | RA-003 | OQ-RBAC-005 | NOT_EXECUTED | |
| URS-RBAC-004 | SYS-RBAC-004 | TDS-RBAC-004 | RA-003 | OQ-RBAC-001, UAT-003 | NOT_EXECUTED | |
| URS-RBAC-005 | SYS-RBAC-005 | TDS-RBAC-005 | RA-005 | OQ-RBAC-002, OQ-SCF-001 | NOT_EXECUTED | |
| URS-RBAC-006 | SYS-RBAC-006 | TDS-RBAC-006 | RA-003 | OQ-RBAC-003 | NOT_EXECUTED | |
| URS-RBAC-007 | SYS-RBAC-007 | TDS-RBAC-007 | RA-003 | OQ-RBAC-004 | NOT_EXECUTED | |
| URS-ENT-001 | SYS-ENT-001 | TDS-ENT-001 | RA-005 | OQ-ENT-001, OQ-ENT-002, UAT-004 | NOT_EXECUTED | |
| URS-ENT-002 | SYS-ENT-002 | TDS-ENT-002 | RA-005 | OQ-ENT-002, UAT-004 | NOT_EXECUTED | |
| URS-ENT-003 | SYS-ENT-003 | TDS-ENT-003 | RA-005 | OQ-AWS-001 | NOT_EXECUTED | |
| URS-ENT-004 | SYS-ENT-004 | TDS-ENT-004 | RA-005, RA-013 | OQ-ENT-003, OQ-AWS-001 | NOT_EXECUTED | |
| URS-LEG-001 | SYS-LEG-001 | TDS-LEG-001 | RA-006 | OQ-LEG-001 | NOT_EXECUTED | OPEN-LEG-001 CLOSED. Other commercial ops N/A. |
| URS-LEG-002 | SYS-LEG-002 | TDS-LEG-002 | RA-014, RA-017 | OQ-LEG-002, UAT-005 | NOT_EXECUTED | |
| URS-CAT-001 | SYS-CAT-001 | TDS-CAT-001 | RA-010 | IQ-008, OQ-CAT-001 | NOT_EXECUTED | |
| URS-CAT-002 | SYS-CAT-002 | TDS-CAT-002 | RA-010 | IQ-009, OQ-CAT-002 | NOT_EXECUTED | |
| URS-CAT-003 | SYS-CAT-003 | TDS-CAT-003 | RA-014 | OQ-CAT-001, UAT-001 | NOT_EXECUTED | |
| URS-SCF-001 | SYS-SCF-001 | TDS-SCF-001 | RA-009, RA-016 | OQ-SCF-001, UAT-001 | NOT_EXECUTED | Interactive Create. |
| URS-SCF-002 | SYS-SCF-002 | TDS-SCF-002 | RA-005, RA-006 | OQ-SCF-002, UAT-003, UAT-004 | NOT_EXECUTED | |
| URS-SCF-003 | SYS-SCF-003 | TDS-SCF-003 | RA-005 | OQ-SCF-001 | NOT_EXECUTED | |
| URS-GH-001 | SYS-GH-001 | TDS-GH-001 | RA-009 | IQ-015, OQ-GH-001 | NOT_EXECUTED | |
| URS-GH-002 | SYS-GH-002 | TDS-GH-002 | RA-009 | OQ-SEC-001, OQ-SEC-002, OQ-SEC-003 | NOT_EXECUTED | Bundle scan is formal. |
| URS-GH-003 | SYS-GH-003 | TDS-GH-003 | RA-012 | OQ-CI-001 … OQ-CI-004, UAT-005 | NOT_EXECUTED | |
| URS-CI-001 | SYS-CI-001 | TDS-CI-001 | RA-012, RA-014 | OQ-CI-001, OQ-LEG-002, UAT-005 | NOT_EXECUTED | |
| URS-AUD-001 | SYS-AUD-001 | TDS-AUD-001 | RA-007 | IQ-006, OQ-SCF-003, OQ-AUD-001 … OQ-AUD-004 | NOT_EXECUTED | |
| URS-AUD-002 | SYS-AUD-002 | TDS-AUD-002 | RA-003 | OQ-RBAC-003 | NOT_EXECUTED | |
| URS-DATA-001 | SYS-DATA-001 | TDS-DATA-001 | RA-018 | IQ-005 | NOT_EXECUTED | |
| URS-DATA-002 | SYS-DATA-002 | TDS-DATA-002 | RA-010 | IQ-010, OQ-SEC-001 | NOT_EXECUTED | |
| URS-CFG-001 | SYS-CFG-001 | TDS-CFG-001 | RA-010 | IQ-001, IQ-002, IQ-003, IQ-007, IQ-013, IQ-014, IQ-016 | NOT_EXECUTED | |
| URS-CFG-002 | SYS-CFG-002 | TDS-CFG-002 | RA-010 | IQ-002 | NOT_EXECUTED | Overlay merge is IQ-sensitive. |
| URS-MKT-001 | SYS-MKT-001 | TDS-MKT-001 | RA-014 | UAT-001 | NOT_EXECUTED | Browse only; no payment. |
| URS-MKT-002 | SYS-MKT-002 | TDS-MKT-002 | RA-014 | OQ-MKT-002 | NOT_EXECUTED | Added Phase 5A.1 |
| URS-DOC-001 | SYS-DOC-001 | TDS-DOC-001 | RA-014 | OQ-DOC-001 | NOT_EXECUTED | Added Phase 5A.1 |
| URS-SRC-001 | SYS-SRC-001 | TDS-SRC-001 | RA-014 | OQ-SRC-001 | NOT_EXECUTED | Added Phase 5A.1 |
| URS-CERT-001 | SYS-CERT-001 | TDS-CERT-001 | RA-014 | OQ-LEG-002, OQ-RBAC-003 | NOT_EXECUTED | |

REJECTED URS-AUTH-005 is not formally verified.

---

## URS without planned formal verification

**None.** Active coverage is **38 / 38** after Phase 5A.1 (OQ-RBAC-006, OQ-MKT-002, OQ-DOC-001, OQ-SRC-001). All remain **NOT_EXECUTED**.

---

## Risks without formal verification

| Risk | Formal coverage | Note |
| --- | --- | --- |
| RA-001 | OQ-AUTH-001/002 | NOT_EXECUTED |
| RA-002 | IQ-004 | NOT_EXECUTED |
| RA-003 | OQ-RBAC-* | NOT_EXECUTED |
| RA-004 | OQ-RBAC-001, OQ-RBAC-006 | NOT_EXECUTED |
| RA-005 | OQ-ENT-*, UAT-004 | NOT_EXECUTED |
| RA-006 | OQ-LEG-001 | NOT_EXECUTED; **NOT ACCEPTED** |
| RA-007 | OQ-AUD-* | NOT_EXECUTED |
| RA-008 | None | AAS excluded (DEC-SCOPE-001) |
| RA-009 | OQ-GH-001, OQ-SEC-* | NOT_EXECUTED |
| RA-010 | IQ-008…010, OQ-CAT, OQ-SEC-001 | NOT_EXECUTED |
| RA-011 | None in Core protocols | Generated-repo content is Golden Path / out of Core |
| RA-012 | OQ-CI-* | NOT_EXECUTED |
| RA-013 | IQ-011, IQ-012 | SBOM/SOUP assessment NOT_ESTABLISHED |
| RA-014 | OQ-LEG-002 | NOT_EXECUTED |
| RA-015 | None | AI-generated validation package; process risk |
| RA-016 | UAT-001, OQ-SCF-001 | NOT_EXECUTED |
| RA-017 | OQ-LEG-002 | NOT_EXECUTED; no Part 11 claim |
| RA-018 | IQ-005 | NOT_EXECUTED |

All RA items remain **NOT ACCEPTED**. This plan does not accept residual risk.

---

## Tests without requirements

Protocol tests map to at least one URS except inventory-only N/A Legal Gate confirmations (OQ-LEG-003…006), which map to URS-LEG-001 policy completeness.

No protocol test invents a new URS.

---

## Requirements covered only by developer tests

| URS / area | Developer-only today |
| --- | --- |
| URS-RBAC-002 | Developer `policy.test.ts` until OQ-RBAC-006 runs |
| URS-DOC-001 / URS-SRC-001 | Developer/e2e candidates until OQ-DOC-001 / OQ-SRC-001 run |
| URS-MKT-002 | Marketplace data tests until OQ-MKT-002 runs |
| Torn JSONL (support for URS-AUD-001) | `create-authorization-audit-store.test.ts` until OQ-AUD-004 runs |
| Register cookie (URS-ENT-003) | entitlements `router.test.ts` until OQ-AWS-001 runs |

---

## Formal verification blockers (environment / process)

These block *execution*, not protocol preparation:

- DIRTY product worktree — candidate is not uniquely HEAD
- Validation package is outside the product git root (`NOT_ESTABLISHED` as a git object)
- Named human executor not assigned
- Hosted environment, GitHub App, Actions Read-only, and (for AWS tests) Marketplace credentials not established here
- SBOM / signed SOUP assessment NOT_ESTABLISHED
- RA items not accepted
- No electronic signatures will be fabricated
