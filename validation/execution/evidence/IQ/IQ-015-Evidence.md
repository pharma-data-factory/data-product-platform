# IQ-015 Evidence — Environment variable names

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-015 |
| related | URS-AUTH-004, URS-GH-001, URS-DATA-002 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | `.env` name presence only; values not recorded |
| status | PASS |

## Procedure performed

Read `.env` **names** and empty-vs-non-empty only. Values were not copied into this record.

## Expected result (unchanged)

Required names are set for the chosen profile. Values are not copied into the evidence pack.

## Actual result

Chosen executed profile: local `yarn start` (not production overlay).

| Name | Presence |
| --- | --- |
| AUTH_GITHUB_CLIENT_ID | PRESENT_NON_EMPTY |
| AUTH_GITHUB_CLIENT_SECRET | PRESENT_NON_EMPTY |
| AUTH_GITHUB_CALLBACK_URL | PRESENT_NON_EMPTY |
| GITHUB_APP_ID | PRESENT_NON_EMPTY |
| GITHUB_CLIENT_ID | PRESENT_NON_EMPTY |
| GITHUB_CLIENT_SECRET | PRESENT_NON_EMPTY |
| GITHUB_PRIVATE_KEY | PRESENT_NON_EMPTY |
| GITHUB_WEBHOOK_SECRET | PRESENT_EMPTY |
| GITHUB_TOKEN | ABSENT_FROM_ENV_FILE |
| POSTGRES_HOST | PRESENT_NON_EMPTY |
| POSTGRES_PORT | PRESENT_NON_EMPTY |
| POSTGRES_USER | PRESENT_NON_EMPTY |
| POSTGRES_PASSWORD | PRESENT_NON_EMPTY |
| POSTGRES_DATABASE | PRESENT_NON_EMPTY |
| APP_BASE_URL | ABSENT_FROM_ENV_FILE |
| BACKEND_BASE_URL | ABSENT_FROM_ENV_FILE |
| BACKEND_SECRET | ABSENT_FROM_ENV_FILE |
| CREATE_AUTHORIZATION_AUDIT_PATH | ABSENT_FROM_ENV_FILE (default path applies) |

Observation: production overlay names `APP_BASE_URL` / `BACKEND_BASE_URL` / `BACKEND_SECRET` are unset. That profile was not running. Compose docker overlay uses localhost URLs in file, not those names.

## Objective evidence

Name/presence checklist only.
