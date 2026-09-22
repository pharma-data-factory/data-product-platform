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

## Which settings, exactly

Two separate GitHub registrations. They are not interchangeable, and mixing
them is the most common setup failure.

| | Portal login | Repository publishing |
| --- | --- | --- |
| GitHub page | Settings → Developer settings → **OAuth Apps** | Settings → Developer settings → **GitHub Apps** |
| Client ID | starts with `Ov23…` | a different value — do not assume from the prefix |
| `.env` keys | `AUTH_GITHUB_CLIENT_ID`<br>`AUTH_GITHUB_CLIENT_SECRET`<br>`AUTH_GITHUB_CALLBACK_URL` | `GITHUB_APP_ID`<br>`GITHUB_CLIENT_ID`<br>`GITHUB_CLIENT_SECRET`<br>`GITHUB_PRIVATE_KEY`<br>`GITHUB_WEBHOOK_SECRET` |
| Read by | `app-config.yaml` → `auth.providers.github` | `app-config.github.yaml` → `integrations.github.apps` |
| Needs installing on the org | No | Yes — on `pharma-data-factory` |
| Fails with | sign-in errors | `No token available for host: github.com` |

Both are 20-character strings of the same shape, so they look alike and the
prefix is not a reliable way to tell them apart. **Identify them by the page
you are on, not by the value.** A misread prefix is what sends people to the
wrong settings page and costs an afternoon.

### OAuth App settings, field by field

| Field | Value |
| --- | --- |
| Application name | anything recognisable, e.g. `Nexora Login` |
| Homepage URL | `http://localhost:3000` — cosmetic, not validated |
| Authorization callback URL | see below — **validated exactly** |
| Enable Device Flow | off |
| Allow wildcard matching | **off** — see the warning below |

**Redirect URIs are matched exactly, and you need one per environment.** Add
every URL a browser will actually reach the backend on, up to ten:

```
http://localhost:7007/api/auth/github/handler/frame
https://<forwarded-host>/api/auth/github/handler/frame
```

For an Ona, Gitpod or Codespaces workspace the forwarded host is what
`scripts/ona-dev.sh expose` prints, and it contains the workspace id — so it
**changes when the workspace is recreated** and the registered URI goes stale.
Re-add it, or use Guest sign-in for platform work; Guest needs no GitHub at
all.

Do not switch on *Allow wildcard matching* to avoid that chore. It sends
tokens to every subdomain and path beneath the URI, and a shared gateway
domain covers other people's workspaces.

`AUTH_GITHUB_CALLBACK_URL` in `.env` must be one of the registered URIs,
character for character.

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

## Troubleshooting: sign-in

The UI says **"GitHub sign-in failed. Please try again."** for every cause it
does not specifically recognise — `formatAuthError` collapses the rest on
purpose, so that a shared screen never shows a token or a stack trace. The
real message goes to the browser console instead:

```
[nexora] GitHub sign-in failed: <cause>
```

Open DevTools → Console before signing in. The backend logs nothing for a
failed sign-in, not even at `LOG_LEVEL=debug`, so the console is the only
place the cause exists.

### Check the credentials without a browser

GitHub's token endpoint tells you whether the client id and secret are a
valid pair. A deliberately invalid code separates the two failures:

```bash
curl -s -X POST https://github.com/login/oauth/access_token \
  -H 'Accept: application/json' \
  -d "client_id=$(grep ^AUTH_GITHUB_CLIENT_ID= .env | cut -d= -f2-)" \
  -d "client_secret=$(grep ^AUTH_GITHUB_CLIENT_SECRET= .env | cut -d= -f2-)" \
  -d "code=0000000000000000000"
```

| Response | Meaning |
| --- | --- |
| `bad_verification_code` | **Credentials are good.** Only the fake code was rejected. |
| `incorrect_client_credentials` | The id and secret are not a valid pair. |

### Causes, by console message

**`Authentication failed, Failed to obtain access token`** — the backend's
code-for-token call was rejected. Run the probe above. If it answers
`incorrect_client_credentials`, the secret no longer matches the app: GitHub
shows a client secret exactly once, so a regenerated secret silently kills the
old one, and rotating the whole OAuth App changes the client id too.

This one is deceptive because *everything visible succeeds first*.
`/login/oauth/authorize` validates only the `client_id`, never the secret — so
you get the consent screen, a redirect back, and `handler/frame` answering 200.
Only the invisible step afterwards fails. It looks like a cookie or gateway
problem and is neither.

**`redirect_uri_mismatch`** — the callback is not registered on *this* app, or
differs by a character. Compare `AUTH_GITHUB_CALLBACK_URL` in `.env` against
the Redirect URIs list. After rotating to a new OAuth App this is the usual
second failure: the new app starts with only the localhost URI.

**The AccessDenied page instead of an error** — authentication worked. The
identity carries no approved platform group, so `hasApprovedPlatformAccess`
refused it. That is RBAC, not OAuth: see
[identity-and-rbac.md](identity-and-rbac.md).

**Nothing in the console at all** — the popup was blocked or closed before it
returned. Allow popups for the host.

### Sanity checks

```bash
# Which client id is the running server actually serving?
curl -s http://127.0.0.1:7007/ | grep -oE 'Ov23[A-Za-z0-9]{16}'

# Was the server started after the last .env edit?
date -r .env '+%H:%M:%S'
```

A `.env` change needs a restart; a Redirect URI change on GitHub does not.

## Troubleshooting: No token available

If Create fails at **Publish to GitHub** with
`No token available for host: github.com`, the App is not installed on
`pharma-data-factory`.

If it fails with `Resource not accessible by integration` while creating a
**User** repository, the template pointed at a personal account. GitHub Apps
cannot create user repositories. Publish to the organization instead.
