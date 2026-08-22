# IQ-003 Evidence — Permission Framework enabled

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-003 |
| related | URS-RBAC-001, URS-CFG-001, RA-003 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Static merge of tagged candidate overlays (hosted instance not running) |
| status | PASS |

## Procedure performed

Searched committed `app-config*.yaml` for `permission.enabled`. Confirmed no hosted overlay sets `false`.

## Expected result (unchanged)

`enabled: true`. No hosted overlay sets `false`.

## Actual result

| File | permission.enabled |
| --- | --- |
| app-config.yaml | true |
| app-config.docker.yaml | true |
| app-config.production.yaml | true |
| app-config.marketplace-test.yaml | true |
| app-config.github.yaml | not set (credential overlay) |
| app-config.local.yaml | not set (title only) |

No `enabled: false` in any overlay. Docker/production redefine `permission:` with `enabled: true`.

## Objective evidence

File excerpts at tagged content (unchanged on HEAD for these files).
