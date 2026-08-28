# OQ-LEG-003…006 Evidence (RC2) — Legal Gate commercial operations inventory

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_ids | OQ-LEG-003, OQ-LEG-004, OQ-LEG-005, OQ-LEG-006 |
| related | URS-LEG-001, URS-ENT-003, RA-006 |
| execution_timestamp | 2026-08-22T20:07:00+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | RC2 tag source inventory + live register endpoint on validation CP |
| status | NOT_APPLICABLE_CURRENT_RELEASE (each) |

## Inventory results

| Test | Operation | Confirmation |
| --- | --- | --- |
| OQ-LEG-003 | Customer Package Export | No export API/UI in product code. Mentions limited to validation/policy docs. |
| OQ-LEG-004 | Commercial Activation | No separate activation operation. Live `POST /api/entitlements/marketplace/register` returned `tenantCreated=false`, `accessGranted=false`, `requiresSignIn=true`, `status=NOT_CONFIGURED`, HTTP 503. No `Set-Cookie`. |
| OQ-LEG-005 | Marketplace Commercial Release | No commercial publish/release operation in product code (policy docs only). Technical RELEASED is a different dimension. |
| OQ-LEG-006 | Customer Tenant Provisioning | Absent. Register contract forces `tenantCreated=false`. Live response confirms. |

## Objective evidence

`OQ-LEG-inventory-grep.txt`, `OQ-LEG-004-register.body`, `OQ-LEG-004-register.headers`
