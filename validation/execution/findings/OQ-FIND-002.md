# OQ-FIND-002

| Field | Value |
| --- | --- |
| ID | OQ-FIND-002 |
| Phase | 5C Formal OQ (RC2) |
| Severity | Minor (scope-limited) |
| Status | **OPEN** |
| Related tests | OQ-ENT-003, OQ-AWS-001 |
| Related URS | URS-ENT-003, URS-ENT-004 |
| Related risk | RA-005, RA-013 |

## Description

Validation stack (`docker-compose.validation.yml` / production+github overlays) runs with local default entitlements (`ENTITLEMENT_PROVIDER` absent). AWS Marketplace profile / marketplace-test overlay was **not** active. Live register returns `status=NOT_CONFIGURED` with fail-closed flags (`accessGranted=false`, `tenantCreated=false`) but that does not satisfy OQ-ENT-003 / OQ-AWS-001 preconditions for an AWS fail-closed profile test.

## Impact

OQ-ENT-003 and OQ-AWS-001 recorded **BLOCKED**. Inventory confirmation for non-activating register remains usable for OQ-LEG-004 / OQ-LEG-006 (NOT_APPLICABLE_CURRENT_RELEASE).

## Disposition required

Execute AWS fail-closed OQ on a controlled marketplace-test / AWS profile environment without altering the immutable RC2 product candidate tag.

## Change control

Not required unless product/config for AWS path is changed.
