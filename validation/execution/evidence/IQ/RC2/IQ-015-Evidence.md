# IQ-015 Evidence (RC2) — Environment variable names

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-015 |
| related | URS-AUTH-004, URS-GH-001, URS-DATA-002 |
| execution_timestamp | 2026-08-22T19:39:59+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | validation Control Plane container |
| status | PASS |

## Procedure

Checked presence of required names inside the running container. Values not recorded (PRESENT_NON_EMPTY / UNSET only).

## Actual result

| Name | Presence |
| --- | --- |
| AUTH_GITHUB_CLIENT_ID | PRESENT_NON_EMPTY |
| AUTH_GITHUB_CLIENT_SECRET | PRESENT_NON_EMPTY |
| AUTH_GITHUB_CALLBACK_URL | PRESENT_NON_EMPTY |
| GITHUB_APP_ID | PRESENT_NON_EMPTY |
| GITHUB_CLIENT_ID | PRESENT_NON_EMPTY |
| GITHUB_CLIENT_SECRET | PRESENT_NON_EMPTY |
| GITHUB_PRIVATE_KEY | PRESENT_NON_EMPTY |
| GITHUB_WEBHOOK_SECRET | UNSET (optional) |
| POSTGRES_* | PRESENT_NON_EMPTY |
| APP_BASE_URL / BACKEND_BASE_URL / BACKEND_SECRET | PRESENT_NON_EMPTY |
| CREATE_AUTHORIZATION_AUDIT_PATH | PRESENT_NON_EMPTY |
| LEGAL_DISTRIBUTION_STATUS | PRESENT_NON_EMPTY |

## Evidence

Container `printenv` presence checklist only.
