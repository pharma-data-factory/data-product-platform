# IQ-004 Evidence — Authentication provider configuration

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-004 |
| related | URS-AUTH-001, URS-AUTH-002, URS-AUTH-003 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Static hosted overlays in candidate |
| status | PASS |

## Procedure performed

Inspected `auth.environment` and `auth.providers` on docker/production overlays. Confirmed Guest omitted. Confirmed OAuth secrets are `${ENV}`.

## Expected result (unchanged)

`auth.environment` is production on docker/production overlays. Guest provider is omitted. No hard-coded OAuth secret.

## Actual result

| Overlay | auth.environment | Guest | GitHub clientSecret |
| --- | --- | --- | --- |
| app-config.docker.yaml | production | omitted | `${AUTH_GITHUB_CLIENT_SECRET}` |
| app-config.production.yaml | production | omitted | `${AUTH_GITHUB_CLIENT_SECRET}` |
| app-config.yaml (local base) | development | present (local only) | `${AUTH_GITHUB_CLIENT_SECRET}` |

Docker/production replace the `auth` block; Guest does not remain after that overlay. No raw OAuth secret in overlays (PEM scan 0 hits).

## Objective evidence

Redacted excerpts from `app-config.docker.yaml` lines 21–35 and `app-config.production.yaml` lines 30–45.
