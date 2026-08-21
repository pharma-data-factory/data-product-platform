# Control Plane hosting

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08-21  
Audience: PLATFORM ADMIN

Operational notes for a **hosted pilot** Control Plane. Local `yarn start`
remains the developer path. See [Portainer](../deployment/portainer.md)
for the stack file.

This page does not claim a live host was verified.

## Portainer variables

Do not put values in Git. Empty cells are secrets or site-specific.

| Variable | Purpose |
| --- | --- |
| `APP_BASE_URL` | Public HTTPS origin, no trailing slash |
| `BACKEND_BASE_URL` | Same origin as `APP_BASE_URL` behind one proxy |
| `CONTROL_PLANE_IMAGE` | GHCR tag, for example `…:sha-abc1234` or `…:mvp-1.0` |
| `CONTROL_PLANE_PORT` | Host port mapped to 7007. Default `7007` |
| `BACKEND_SECRET` | Backstage cookie/token signing key (base64, ≥32 bytes decoded in Backstage docs as 24 random bytes base64) |
| `AUTH_GITHUB_CLIENT_ID` | OAuth App client id (`Ov23…`) |
| `AUTH_GITHUB_CLIENT_SECRET` | OAuth App client secret |
| `AUTH_GITHUB_CALLBACK_URL` | `https://<domain>/api/auth/github/handler/frame` |
| `GITHUB_APP_ID` | GitHub App id for `publish:github` |
| `GITHUB_CLIENT_ID` | GitHub App client id (`Iv23…`) |
| `GITHUB_CLIENT_SECRET` | GitHub App client secret |
| `GITHUB_PRIVATE_KEY` | PEM as one line with `\n` |
| `GITHUB_WEBHOOK_SECRET` | Optional App webhook secret |
| `GITHUB_ORG` | Org the App is installed on. Templates publish to `pharma-data-factory` |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Unique password. Never `dpp` |
| `POSTGRES_DATABASE` | Database name |
| `LEGAL_DISTRIBUTION_STATUS` | Keep `BLOCKED` until counsel approves distribution |

`POSTGRES_HOST` / `POSTGRES_PORT` inside the stack are `postgres` / `5432`.
Do not point the Control Plane at a laptop `localhost` from Portainer.

## GitHub App publishing

The production image loads `app-config.github.yaml`. Do not run
`yarn start:github` in the container.

Install the App on **`pharma-data-factory`** (All repositories). Golden
Path `publish:github` steps use `owner=pharma-data-factory`.

Minimum permissions (implementation):

| Permission | Access | Why |
| --- | --- | --- |
| Administration | Read and write | Create the repository |
| Contents | Read and write | Push generated source |
| Metadata | Read-only | Repository metadata |
| Workflows | Read and write | Push `.github/workflows` |
| Actions | Read-only | CI Quality Gate on Data Product detail |

Do not grant org admin or delete-repo.

## Create live proof (after the stack is healthy)

Do not run this against a failing host.

1. Developer signs in with GitHub (Catalog User in
   `data-product-developers` or higher).
2. Open Marketplace.
3. Create **REST Equipment** or **OEE Data Product**.
4. Confirm GitHub repository under `pharma-data-factory`.
5. Confirm Catalog registration.

Until that run exists, treat live Create as **not proven** on the host.

## Backup

Postgres: snapshot or `pg_dump` the `postgres_data` volume. Control Plane
image is immutable; do not back up container writable layers for product
state.

## Security

- No `.env` or `*.pem` in the image (`.dockerignore`).
- OAuth client secret and GitHub App private key are runtime env only.
- Frontend must not receive `clientSecret` / private keys.
- Guest provider absent in production overlay.
- AWS Marketplace overlay is not loaded by the production CMD.
- `LEGAL_DISTRIBUTION_STATUS=BLOCKED`.
