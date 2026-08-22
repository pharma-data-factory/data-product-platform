# IQ-010 Evidence — Secret configuration mechanism

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-010 |
| related | URS-DATA-002, URS-GH-002, RA-010 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Committed overlays only; `.env` not copied |
| status | PASS |

## Procedure performed

Reviewed committed `app-config*.yaml` for secret-bearing keys. Searched for PEM / token prefixes. Did not copy `.env` values.

## Expected result (unchanged)

No committed raw secrets. Public `clientId` may appear as configured.

## Actual result

Secret assignments observed as `${VAR}` or `${VAR:-default}`:

- `AUTH_GITHUB_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- `POSTGRES_PASSWORD`, `BACKEND_SECRET`
- `GITHUB_TOKEN` in base integrations

PEM / `ghp_` / `gho_` hits in overlays: **0**. `clientId` values are `${AUTH_GITHUB_CLIENT_ID}` / `${GITHUB_CLIENT_ID}` (placeholders).

## Objective evidence

Redacted overlay keys only. No secret values recorded.
