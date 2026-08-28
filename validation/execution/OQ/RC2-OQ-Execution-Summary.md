# OQ Execution Summary — Platform Core 1.0-RC2

| Field | Value |
| --- | --- |
| Document | VAL-OQ-PC-RC2-SUM |
| Candidate | 1.0-RC2 |
| Canonical tag | `platform-core-v1.0-rc2` |
| Tag target (product candidate) | `e2b2297a1506603ba05e6fb1dcf973ac046ad009` |
| IQ evidence commit | `407c4969896a70f0aa17c560aba8c64214785f7d` |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Execution date | 2026-08-22 |
| Named human executor | NOT_ESTABLISHED |
| IQ prerequisite | PASS WITH OPEN OBSERVATIONS; IQ-FIND-001 CLOSED |
| Product validation status | **NOT_VALIDATED** |
| UAT | **NOT_EXECUTED** |

Formal OQ does **not** validate the product. The evidence commit (if any later) does not change the tested product candidate tag.

Evidence root: `validation/execution/evidence/OQ/RC2/`.

---

## Counts

| Result | Count |
| --- | --- |
| Total OQ tests | **38** |
| PASS | **6** |
| FAIL | **0** |
| BLOCKED | **28** |
| NOT_APPLICABLE | **4** |

---

## PASS

| ID | Notes |
| --- | --- |
| OQ-AUTH-002 | Unauthenticated protected routes → 401 |
| OQ-SEC-001 | Committed configs: secrets as `${ENV}` |
| OQ-SEC-002 | Compiled frontend: no private keys/tokens/literal secrets |
| OQ-SEC-003 | Public clientId vs secrets checklist |
| OQ-CAT-001 | Hosted catalog has production entities (DB query) |
| OQ-CAT-002 | Sample entities/locations absent |

---

## NOT_APPLICABLE_CURRENT_RELEASE

| ID | Notes |
| --- | --- |
| OQ-LEG-003 | Customer Package Export absent |
| OQ-LEG-004 | Register non-activating; no commercial activation op |
| OQ-LEG-005 | Marketplace commercial release absent |
| OQ-LEG-006 | Tenant provisioning absent (`tenantCreated=false`) |

---

## BLOCKED

| ID | Finding |
| --- | --- |
| OQ-AUTH-001 | OQ-FIND-001 |
| OQ-RBAC-001 … OQ-RBAC-006 | OQ-FIND-001 |
| OQ-ENT-001, OQ-ENT-002 | OQ-FIND-001 |
| OQ-ENT-003 | OQ-FIND-002 |
| OQ-SCF-001 … OQ-SCF-003 | OQ-FIND-001 |
| OQ-AUD-001 … OQ-AUD-004 | OQ-FIND-001 |
| OQ-CI-001 … OQ-CI-004 | OQ-FIND-001 |
| OQ-GH-001 | OQ-FIND-001 |
| OQ-AWS-001 | OQ-FIND-002 |
| OQ-LEG-001, OQ-LEG-002 | OQ-FIND-001 |
| OQ-MKT-002, OQ-DOC-001, OQ-SRC-001 | OQ-FIND-001 |

Primary blocker: no interactive authenticated Catalog User session (auth `sessions=0` / `user_info=0`) despite Catalog User entities and GitHub OAuth env presence.

Secondary blocker: AWS Marketplace provider/profile not active on validation stack.

---

## Findings

| ID | Status | Summary |
| --- | --- | --- |
| OQ-FIND-001 | OPEN | Interactive Catalog User sessions / OAuth sign-in not established |
| OQ-FIND-002 | OPEN | AWS fail-closed OQ preconditions not met on validation stack |
| IQ-FIND-001 | CLOSED | (prior) |

FAIL findings: **none**

---

## Requirements formally verified (OQ evidence this phase)

OQ PASS / N/A completed for:

| URS | Basis |
| --- | --- |
| URS-GH-002 | OQ-SEC-001, OQ-SEC-002, OQ-SEC-003 PASS |
| URS-DATA-002 | OQ-SEC-001 PASS (with prior IQ-010) |
| URS-CAT-001 | OQ-CAT-001 PASS |
| URS-CAT-002 | OQ-CAT-002 PASS |
| URS-CAT-003 | OQ-CAT-001 PASS (browse/discoverability via hosted catalog query) |
| URS-LEG-001 (inventory subset) | OQ-LEG-003…006 NOT_APPLICABLE confirmed; **Customer Handoff OQ-LEG-001 still pending** |

---

## Requirements still pending (OQ)

All other active URS with blocked OQ items remain pending formal OQ verification, including URS-AUTH-001/003 (AUTH-001 blocked), URS-RBAC-*, URS-ENT-*, URS-SCF-*, URS-AUD-*, URS-GH-001/003, URS-CI-001, URS-LEG-001 (handoff), URS-LEG-002, URS-MKT-002, URS-DOC-001, URS-SRC-001, URS-CERT-001, URS-ENT-003/004 (AWS).

IQ-covered URS without completed OQ remain pending for OQ unless noted above.

---

## Observations (not FAIL)

1. Named human executor **NOT_ESTABLISHED**.
2. Catalog User/Group entities exist; sessions do not.
3. Compiled bundle contains claim-qualifying strings (`NOT_VALIDATED`, `not GxP`, `DEGRADED / UNVERIFIED`) but authenticated UI walk was not completed.
4. RC2 product tag was **not** moved.
5. Worktree was CLEAN at OQ start. Unrelated product-code dirt (Validation Expert / home UI) appeared later and is outside this OQ evidence set.

---

## OQ EXECUTION RESULT

**BLOCKED**

---

## Status after this phase

| Item | Value |
| --- | --- |
| Platform Core validation | **NOT_VALIDATED** |
| OQ | **BLOCKED** (executed; incomplete) |
| UAT | **NOT_EXECUTED** |
| Part 11 | **NOT_CLAIMED** |
| Product candidate tag | `platform-core-v1.0-rc2` → `e2b2297a1506603ba05e6fb1dcf973ac046ad009` (unchanged) |
