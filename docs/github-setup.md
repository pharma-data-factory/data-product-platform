# GitHub configuration

The MQTT Temperature and REST Equipment Golden Paths use Backstage's
standard GitHub integration and the `publish:github` scaffolder action.

Credentials are never committed.

## What is already wired

- `@backstage/plugin-scaffolder-backend-module-github`
- `publish:github` and `catalog:register` in the Python template
- Guest login for local portal use
- Opt-in GitHub App config in `app-config.github.yaml` for **repository publishing**
- Native GitHub user login in `app-config.yaml` via `AUTH_GITHUB_*`

Local: yarn start:github after `.env` contains real GitHub App values.
Hosted production loads `app-config.github.yaml` in the image CMD. Do not
run `yarn start:github` in Portainer.

GitHub user login and GitHub App publishing are separate. Do not use
`GITHUB_CLIENT_ID` as the portal OAuth client.

## GitHub OAuth App for portal login

This is **user authentication only**. It is not used to create repositories.

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**
2. Application name: `Nexora Login`
3. Homepage URL: `http://localhost:3000`
4. Authorization callback URL:
   `http://localhost:7007/api/auth/github/handler/frame`
5. Put the Client ID and Client Secret in `.env` as
   `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`.
   The Client ID should start with `Ov23`.
6. Keep `AUTH_GITHUB_CALLBACK_URL` aligned with the callback above

Do not reuse `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, or
`GITHUB_PRIVATE_KEY` for login.

See [identity-and-rbac.md](identity-and-rbac.md) for sign-in, user mapping,
and RBAC. See [demo-guide.md](demo-guide.md) for the MQTT Temperature
developer journey.

## GitHub App permissions

A GitHub App can create repositories in an **organization**. It cannot
create repositories on a personal user account. That is a GitHub limit,
not a Backstage setting.

Create the App, **transfer it to `pharma-data-factory`** if it is still
owned by a user, then **install** it on that organization. Creation alone
is not enough.

`publish:github` fails with `No token available for host: github.com` when
the App is not installed on `pharma-data-factory`. Guest login is enough
for local portal use. GitHub user OAuth is not required for this Golden Path
publish step.

Minimum permissions for this Golden Path:

| Permission | Access | Why |
| --- | --- | --- |
| Administration | Read and write | Create the repository |
| Contents | Read and write | Push generated source |
| Metadata | Read-only | Repository metadata |
| Workflows | Read and write | Push `.github/workflows/ci.yml` |
| Actions | Read-only | Read latest workflow run status on Data Product detail. If this permission is missing or GitHub is unavailable, the CI Quality Gate stays `UNKNOWN`. Do not treat that as a product failure. |

Do not grant organization admin, delete-repo, or unrelated write permissions.

Install the App with **All repositories** so newly created repositories are
included.

## Local setup

1. Create `.env` by hand. Do **not** copy `.env.example` verbatim: it lists
   every variable with an empty value, and Backstage rejects an empty
   `${VAR}` with `got empty-string, wanted string` while it simply drops an
   unset one. A variable you do not have must be absent, not empty.
2. Create the GitHub App.
3. If the App is owned by a user, open **Advanced** → **Transfer ownership**
   and transfer it to `pharma-data-factory`.
4. Open **Install App** and install it on `pharma-data-factory`.
   Choose **All repositories**. Confirm it appears under
   `https://github.com/organizations/pharma-data-factory/settings/installations`.
5. Put these values in `.env`:
   - `GITHUB_APP_ID`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_WEBHOOK_SECRET`
   - `GITHUB_PRIVATE_KEY` as one quoted line with `\n` for newlines
6. Stop any running `yarn start` process.
7. Start the Golden Path backend:

```bash
cd data-product-platform
yarn start:github
```

8. Open http://localhost:3000 and sign in with GitHub. Guest sign-in is
   opt-in and off by default; set `AUTH_GUEST_ENABLED=true` in `.env` if you
   want it for local work.

Hosted login and Portainer: [hosted login](developer/hosted-login.md),
[Portainer](deployment/portainer.md),
[platform repository](github/platform-repository.md).

Do not print `.env` or the private key in logs, tickets, or chat.

## End-to-end test procedure

1. Confirm the portal is running with `yarn start:github`.
2. Open **Create**.
3. Select **Python Microservice**.
4. Enter:
   - Service Name, for example `orders-api`
   - Description
   - Owner, for example `group:default/platform-team`
   - GitHub repository name, for example `orders-api`
5. Click **Create**.
6. Confirm Backstage creates the GitHub repository under `pharma-data-factory`.
7. Confirm the repository contains:
   - `app/`
   - `tests/`
   - `Dockerfile`
   - `.dockerignore`
   - `.gitignore`
   - `pyproject.toml`
   - `README.md`
   - `catalog-info.yaml`
   - `.github/workflows/ci.yml`
8. Confirm the component appears in the Backstage Catalog.
9. Open the repository **Actions** tab and confirm the CI workflow started.
10. Confirm the workflow runs lint, tests, and Docker build.

This is a local Golden Path test. It is not a production deployment.

## Troubleshooting: No token available

If Create fails at **Publish to GitHub** with
`No token available for host: github.com`, the App is not installed on
`pharma-data-factory`.

If it fails with `Resource not accessible by integration` while creating a
**User** repository, the template pointed at a personal account. GitHub Apps
cannot create user repositories. Publish to the organization instead.
