# Traceability Matrix — Platform Core

**Document ID:** VAL-TM-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

Direction: URS → SYS → TDS → Risk → Test → Evidence.

Active coverage uses BASELINED URS only (38). REJECTED URS-AUTH-005 remains historically listed and **does not count** toward active coverage.

Evidence column is candidate or gap. Verification is **NOT_EXECUTED**. Use reviewed / approved execution evidence — not electronic signatures.

---

## Forward matrix

| URS | SYS | TDS | Risk | Test | Evidence |
| --- | --- | --- | --- | --- | --- |
| URS-AUTH-001 | SYS-AUTH-001 | TDS-AUTH-001 | RA-001 | TEST-AUTH-004, TEST-SEC-001 | Pilot Exit 401 note; NOT ESTABLISHED as protocol |
| URS-AUTH-002 | SYS-AUTH-002 | TDS-AUTH-002 | RA-001, RA-002 | TEST-AUTH-001, TEST-SEC-001, TEST-IQ-001 | `identity.test.ts` (candidate) |
| URS-AUTH-003 | SYS-AUTH-003 | TDS-AUTH-003 | RA-001, RA-004 | TEST-AUTH-002 | `accessPolicy.ts` + `accessPolicy.test.ts` (candidate) |
| URS-AUTH-004 | SYS-AUTH-004 | TDS-AUTH-004 | RA-009 | TEST-AUTH-003, TEST-GH-001 | `app-config.yaml` / `app-config.github.yaml` |
| URS-AUTH-005 (REJECTED) | SYS-AUTH-005 | TDS-AUTH-005 | RA-002 | TEST-AUTH-002 (dev control only) | Historical; not active coverage |
| URS-RBAC-001 | SYS-RBAC-001 | TDS-RBAC-001 | RA-004 | TEST-RBAC-001, TEST-OQ-001 | `roles.ts`; `org.yaml` |
| URS-RBAC-002 | SYS-RBAC-002 | TDS-RBAC-002 | RA-004 | TEST-RBAC-002, OQ-RBAC-006 | `policy.ts`; formal OQ planned |
| URS-RBAC-003 | SYS-RBAC-003 | TDS-RBAC-003 | RA-003 | TEST-RBAC-003, TEST-SEC-002 | Partial; IMPLEMENTATION_NOT_VERIFIED all routes |
| URS-RBAC-004 | SYS-RBAC-004 | TDS-RBAC-004 | RA-003 | TEST-RBAC-001, TEST-SCF-002, TEST-OQ-001 | `permissions.ts` |
| URS-RBAC-005 | SYS-RBAC-005 | TDS-RBAC-005 | RA-005 | TEST-RBAC-001, TEST-OQ-001 | `permissions.ts` |
| URS-RBAC-006 | SYS-RBAC-006 | TDS-RBAC-006 | RA-003 | TEST-AUD-003, TEST-OQ-001 | `permissions.ts` |
| URS-RBAC-007 | SYS-RBAC-007 | TDS-RBAC-007 | RA-003 | TEST-OQ-001 | `permissions.ts` |
| URS-ENT-001 | SYS-ENT-001 | TDS-ENT-001 | RA-005 | TEST-ENT-001, TEST-ENT-002, TEST-SEC-003 | `policy.ts`; `entitlement-service.ts` |
| URS-ENT-002 | SYS-ENT-002 | TDS-ENT-002 | RA-005 | TEST-ENT-001 | `CreateAuthorization.reason` |
| URS-ENT-003 | SYS-ENT-003 | TDS-ENT-003 | RA-005 | TEST-ENT-003 | IMPLEMENTATION_NOT_VERIFIED |
| URS-ENT-004 | SYS-ENT-004 | TDS-ENT-004 | RA-005, RA-013 | TEST-ENT-004 | IMPLEMENTATION_NOT_VERIFIED |
| URS-LEG-001 | SYS-LEG-001 | TDS-LEG-001 | RA-006 | TEST-LEG-001, OQ-LEG-001 | Customer Handoff coded; OPEN-LEG-001 CLOSED; other commercial ops N/A |
| URS-LEG-002 | SYS-LEG-002 | TDS-LEG-002 | RA-014, RA-017 | TEST-LEG-002 | `docs/status-model.md` |
| URS-CAT-001 | SYS-CAT-001 | TDS-CAT-001 | RA-010 | TEST-CAT-001 | `app-config.yaml` locations |
| URS-CAT-002 | SYS-CAT-002 | TDS-CAT-002 | RA-010 | TEST-CAT-002, TEST-IQ-001 | IMPLEMENTATION_NOT_VERIFIED / Pilot Exit note |
| URS-CAT-003 | SYS-CAT-003 | TDS-CAT-003 | — | TEST-CAT-003, TEST-UAT-001 | plugin routes |
| URS-SCF-001 | SYS-SCF-001 | TDS-SCF-001 | RA-009, RA-016 | TEST-SCF-001, TEST-UAT-001, TEST-AUTH-005 | NOT ESTABLISHED (interactive) |
| URS-SCF-002 | SYS-SCF-002 | TDS-SCF-002 | RA-005, RA-006 | TEST-ENT-001, TEST-SCF-002 | `authorizeCreate` |
| URS-SCF-003 | SYS-SCF-003 | TDS-SCF-003 | RA-005 | TEST-SCF-003 | `releases.ts` / release tests (candidate) |
| URS-GH-001 | SYS-GH-001 | TDS-GH-001 | RA-009 | TEST-GH-001, TEST-IQ-002 | `app-config.github.yaml` |
| URS-GH-002 | SYS-GH-002 | TDS-GH-002 | RA-009 | TEST-GH-002 | Public clientId OK; secrets in artifacts/logs/UI NOT ESTABLISHED |
| URS-GH-003 | SYS-GH-003 | TDS-GH-003 | RA-012 | TEST-GH-003, TEST-OQ-002 | UNKNOWN today; DEC-CI-001 requires DEGRADED/UNVERIFIED |
| URS-CI-001 | SYS-CI-001 | TDS-CI-001 | RA-012, RA-014 | TEST-LEG-002, TEST-OQ-002 | `documentation.ts` |
| URS-AUD-001 | SYS-AUD-001 | TDS-AUD-001 | RA-007 | TEST-AUD-001, TEST-AUD-002 | Policy Create decision → JSONL store → developer tests. Formal restart OQ NOT_EXECUTED |
| URS-AUD-002 | SYS-AUD-002 | TDS-AUD-002 | RA-003 | TEST-AUD-003 | Router + permission |
| URS-DATA-001 | SYS-DATA-001 | TDS-DATA-001 | RA-018 | TEST-DATA-001, TEST-IQ-001 | compose / app-config |
| URS-DATA-002 | SYS-DATA-002 | TDS-DATA-002 | RA-010 | TEST-DATA-002, TEST-IQ-002 | YAML placeholders; scan NOT ESTABLISHED |
| URS-CFG-001 | SYS-CFG-001 | TDS-CFG-001 | RA-010 | TEST-CFG-001 | app-config* |
| URS-CFG-002 | SYS-CFG-002 | TDS-CFG-002 | RA-010 | TEST-CFG-001 | Overlay flag IMPLEMENTATION_NOT_VERIFIED |
| URS-MKT-001 | SYS-MKT-001 | TDS-MKT-001 | — | TEST-MKT-001, TEST-UAT-001 | marketplace plugin |
| URS-MKT-002 | SYS-MKT-002 | TDS-MKT-002 | RA-014 | TEST-MKT-002, OQ-MKT-002 | Building-block labels; formal OQ planned |
| URS-DOC-001 | SYS-DOC-001 | TDS-DOC-001 | — | TEST-DOC-001, OQ-DOC-001 | modules; formal OQ planned |
| URS-SRC-001 | SYS-SRC-001 | TDS-SRC-001 | — | TEST-DOC-001, OQ-SRC-001 | search modules; formal OQ planned |
| URS-CERT-001 | SYS-CERT-001 | TDS-CERT-001 | RA-014 | TEST-CERT-001 | overlay processor |

“—” under Risk means no dedicated RA; general RA-014 still applies to the package.

---

## Reverse checks (required)

### Requirements without design

Active: 38 URS ↔ 38 SYS ↔ 38 TDS. REJECTED URS-AUTH-005 remains mapped historically.

**Design incomplete vs BASELINED URS:**

| URS | Issue |
| --- | --- |
| URS-ENT-003 | TDS-ENT-003 IMPLEMENTATION_NOT_VERIFIED |
| URS-ENT-004 | TDS-ENT-004 IMPLEMENTATION_NOT_VERIFIED |
| URS-CAT-002 | TDS-CAT-002 IMPLEMENTATION_NOT_VERIFIED |
| URS-MKT-002 | TDS-MKT-002 IMPLEMENTATION_NOT_VERIFIED |
| URS-GH-002 | No artifact/log/UI secret proof |
| URS-CFG-002 | Overlay not re-verified |
| URS-AUD-001 | Durable JSONL store designed (Phase 3A/4A). Formal restart evidence NOT_EXECUTED |
| URS-GH-003 | DEGRADED/UNVERIFIED representation not implemented |
| URS-LEG-001 | OPEN-LEG-001 CLOSED. Formal OQ of Customer Handoff still NOT_EXECUTED |

### Requirements without tests

None of the 38 active URS lack a proposed TEST ID.

### Tests without requirements

TEST IDs that cite only REJECTED URS-AUTH-005 as a *validated* parent must not be counted as active coverage. TEST-AUTH-002 still verifies URS-AUTH-002/003.

OEE live proof and Part 11 tests remain correctly unmapped (DEC-OEE-001, DEC-P11-001).

### Risks without controls

Every RA lists current and/or proposed controls. **No RA is accepted.**

### Controls without evidence

| Control | Evidence |
| --- | --- |
| Production Guest omitted | Candidate: `identity.test.ts` — not reviewed execution evidence |
| Legal customer-handoff deny | Candidate: `entitlement-service.test.ts` |
| Entitlement AND-gate | Candidate: `policy.test.ts` |
| CI Quality Gate live read | UNKNOWN today; not DEGRADED/UNVERIFIED |
| Secrets not in artifacts/logs/UI | NOT ESTABLISHED |
| AWS fail-closed | IMPLEMENTATION_NOT_VERIFIED |
| Permission.enabled on all overlays | NOT ESTABLISHED |
| Interactive Create | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Durable Create audit | NOT ESTABLISHED |

### Missing execution evidence

| Item | Status |
| --- | --- |
| Reviewed IQ execution evidence | NOT ESTABLISHED |
| Reviewed OQ execution evidence | NOT ESTABLISHED |
| Reviewed UAT execution evidence | NOT ESTABLISHED (`INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`) |
| Playwright in platform CI | Not wired |
| Quality Gate DEGRADED/UNVERIFIED display | NOT ESTABLISHED |
| Independent technical review record | NOT ESTABLISHED |

---

## Coverage summary (active baseline only)

| Link | Active coverage |
| --- | --- |
| BASELINED URS with SYS | 38 / 38 |
| SYS with TDS | 38 / 38 |
| BASELINED URS with ≥1 TEST | 38 / 38 |
| BASELINED URS with reviewed execution evidence | 0 / 38 |
| REJECTED URS excluded from coverage | 1 (URS-AUTH-005) |
| OPEN_POLICY_DEFINITION | 0 (`OPEN-LEG-001` CLOSED) |
| RA accepted | 0 / 18 |

This is **requirements-baseline traceability**, not validation coverage. Validation status: **NOT_VALIDATED**.
