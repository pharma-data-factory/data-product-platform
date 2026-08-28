# OQ-FIND-001

| Field | Value |
| --- | --- |
| ID | OQ-FIND-001 |
| Phase | 5C Formal OQ (RC2) |
| Severity | Major (blocks formal OQ completion) |
| Status | **OPEN** |
| Related tests | OQ-AUTH-001; OQ-RBAC-001…006; OQ-ENT-001/002; OQ-SCF-001…003; OQ-AUD-001…004; OQ-CI-001…004; OQ-GH-001; OQ-LEG-001; OQ-LEG-002; OQ-MKT-002; OQ-DOC-001; OQ-SRC-001 |
| Related URS | URS-AUTH-001/003; URS-RBAC-*; URS-ENT-001/002; URS-SCF-*; URS-AUD-*; URS-GH-001/003; URS-CI-001; URS-LEG-001/002; URS-MKT-002; URS-DOC-001; URS-SRC-001; URS-CERT-001 |
| Related risk | RA-001, RA-003, RA-004, RA-005, RA-006, RA-007, RA-009, RA-012, RA-014, RA-016, RA-017 |

## Description

Formal OQ against Platform Core 1.0-RC2 could not complete role-based, Create, audit, CI/Actions, Legal Gate Customer Handoff, Marketplace label, TechDocs, or authorized Search tests because **no interactive authenticated Catalog User session** was established on the validation Control Plane.

Catalog User/Group entities exist. GitHub OAuth configuration env names are present. Auth DB shows **0** sessions and **0** user_info rows. Unauthenticated calls correctly return 401 (see OQ-AUTH-002 PASS) but do not substitute for signed-in OQ procedures.

## Impact

OQ remains **BLOCKED** for the listed tests. Product candidate tag/commit unchanged. No product defect asserted by this finding alone.

## Disposition required

Establish named human executor and perform interactive GitHub OAuth sign-in for Viewer / Developer / Owner / Admin / no-role Catalog Users; then re-execute blocked OQ items. Do not modify RC2 product tag.

## Change control

Not required for product code. Environment / process gap.
