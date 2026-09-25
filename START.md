# Starting Nexora

Four ways to run this platform. Pick the row that matches where you are, then
follow that one section. Nothing here is new — it collects procedures that were
spread across `README.md`, `docker/README.md`, `scripts/ona-dev.sh` and
`docs/deployment/`, because knowing *which* to use was the hard part.

| Where you are | Use | Get |
| --- | --- | --- |
| Laptop, want the whole stack in Docker | [A — Local Docker](#a--local-docker) | One container on `:7007` + PostgreSQL |
| Ona / Gitpod / Codespaces workspace | [B — Remote gateway](#b--remote-gateway) | One forwarded HTTPS origin |
| Inside the container, editing code | [C — Dev server](#c--dev-server) | Hot reload on `:3000` + `:7007` |
| Deploying | [D — Production image](#d--production-image) | Published image, real secrets |

**The single most common mistake** is running a split frontend/backend setup
(C) behind a remote gateway (B). It cannot work: the browser treats the API
host as cross-origin, withholds the gateway session cookie, and the gateway
answers 401 with no CORS headers. Use B in a remote workspace.

---

## A — Local Docker

The backend serves the built frontend from one port, exactly as the production
image does. No CORS, no second hostname.

```bash
yarn install --immutable
yarn tsc
yarn build:backend            # REQUIRED — see note below
docker compose up --build nexora
```

Open **http://localhost:7007** and sign in with *Continue as Guest*.

> **`yarn build:backend` is not optional.** `packages/backend/Dockerfile` copies
> `packages/backend/dist/skeleton.tar.gz` and `bundle.tar.gz` into the image; it
> does not build them. Without that step `docker compose up --build` fails on a
> missing file. The root `README.md` used to show the bare `docker compose up
> --build`, which is why this guide exists.

Split mode — nginx on `:3000`, backend on `:7007` — additionally needs
`yarn workspace app build` and `docker compose --profile split up`. It exists
for testing the reverse-proxy path and is not the default. See
[`docker/README.md`](docker/README.md).

```bash
docker compose ps                    # health
docker compose logs -f nexora        # follow
docker compose down                  # stop, keep the volumes
docker compose down -v               # stop and drop the database
```

Data lives in the `nexora_db` volume; Create-authorization audit records live in
`create_authorization_audit` (CC-001). `down -v` deletes both.

---

### Database, user and `.env` — set these *before* the first start

| Variable | Default | Read by | When to change it |
| --- | --- | --- | --- |
| `POSTGRES_USER` | `nexora` | `db` and the backend | Rarely |
| `POSTGRES_PASSWORD` | `nexora_dev_pass` | `db` and the backend | Before the **first** start — see the warning below |
| `POSTGRES_DATABASE` | `nexora` | backend | Rarely |
| `POSTGRES_HOST` / `POSTGRES_PORT` | `db` / `5432` | backend | Only against an external database |
| `BACKEND_SECRET` | `nexora-dev-secret-change-in-production` | backend | Any shared or long-lived instance |
| `AUTH_GUEST_ENABLED` | `true` (compose) | backend | Set `false` to require GitHub |
| `AUTH_GUEST_ROLE` | `developer` (compose) | backend | `viewer` for read-only |

All of them live in `docker-compose.yml` under `x-backend-env` with a default,
so **Docker needs no `.env` at all**. Override by exporting the variable or by
putting it in `.env`, which Compose reads automatically.

`.env` is for the dev server (B and C), not for production — D reads a Compose
environment file instead. Never write an *empty* value anywhere: Backstage
drops a config key whose `${VAR}` is unset, but rejects it with
"got empty-string, wanted string" when it is set and empty, and half the
backend plugins then refuse to start.

> **`POSTGRES_PASSWORD` only takes effect on the very first start.**
> PostgreSQL applies it when it initialises an empty data directory and never
> again. Change it afterwards and the backend cannot authenticate while the
> database still reports healthy.
>
> This one hides well: `docker compose exec db psql -U nexora` **succeeds**,
> because `pg_hba.conf` trusts local and `127.0.0.1` connections without
> checking the password. Only a TCP connection from another container — what
> the backend does — reaches the `scram-sha-256` rule. The obvious test says
> the credentials are fine.
>
> Test it the way the backend does, and fix it without losing data:
>
> ```bash
> docker compose exec -T db env PGPASSWORD=nexora_dev_pass \
>   psql -h db -U nexora -d nexora -c 'select 1'      # -h db, not 127.0.0.1
>
> docker compose exec -T db psql -U nexora -d nexora \
>   -c "ALTER USER nexora WITH PASSWORD 'nexora_dev_pass';"
> docker compose restart nexora
> ```
>
> `./start.sh` checks this before it starts waiting and prints the same fix.
> Do **not** reach for `docker compose down -v` — that deletes every product,
> version, contract and audit record in the volume.

## B — Remote gateway

For Ona, Gitpod and Codespaces, where the browser is outside the container.

```bash
scripts/ona-dev.sh expose     # opens 7007, writes .runtime/app-config.ona.yaml
yarn workspace app build      # the backend serves this bundle
scripts/ona-dev.sh serve      # single origin on 7007
```

`expose` prints the forwarded URL — open that, not `localhost`. Sign in with
*Continue as Guest*.

Two things to know:

- **No hot reload.** `serve` runs the built bundle. A frontend change needs
  `yarn workspace app build` and a restart; a backend change needs a restart.
- **The URL changes when the workspace restarts.** Re-run `expose`;
  `.runtime/app-config.ona.yaml` is gitignored and environment-specific.

Guest is a VIEWER by default. To exercise the Define and Create journeys set
`AUTH_GUEST_ROLE=developer` in `.env` and restart — see
`app-config.guest-developer.yaml`, which also explains what it deliberately
does not grant.

GitHub sign-in additionally needs `AUTH_GITHUB_CLIENT_ID`,
`AUTH_GITHUB_CLIENT_SECRET` and an OAuth App Redirect URI of exactly
`<forwarded-url>/api/auth/github/handler/frame`. Because the forwarded URL
contains the workspace id, the registered URI goes stale whenever the
workspace is recreated — Guest is the reliable path here.

Which settings, and what each sign-in failure means:
**[docs/github-setup.md](docs/github-setup.md)**. Read the troubleshooting
section before debugging a failed login — the UI message is deliberately
vague and the real cause is in the browser console.

---

## C — Dev server

Hot reload, container-local only. Frontend on `:3000`, backend on `:7007`.

```bash
yarn start
```

Equivalent to `scripts/ona-dev.sh start`, which additionally creates a `.env`
if one is missing. Do not use this through a remote gateway — see the warning
at the top.

---

## D — Production image

```bash
yarn prod:env                 # writes deploy/production.local.env
yarn docker:prod:build
yarn docker:prod:up
yarn docker:prod:logs
```

Windows: `.\scripts\prepare-production-local-env.ps1` and
`yarn docker:prod:build:win`.

The production path does **not** read `.env` — that is a development
mechanism. It reads a Compose environment file, and the same
`docker-compose.production.yml` backs the Portainer stack.

Never carry an *empty* variable into a production environment file.
Backstage drops a config key whose `${VAR}` is unset, but rejects it with
"got empty-string, wanted string" when it is set and empty, and half the
backend plugins then refuse to start. Required variables:
`deploy/portainer.env.example`.

Detail: [Docker production](docs/deployment/docker-production.md) ·
[Portainer](docs/deployment/portainer.md).

---

## It started — now what?

```bash
curl -s http://localhost:7007/.backstage/health/v1/readiness
# {"status":"ok"}
```

A 503 with `"Backend has not started yet"` means it is still booting; first
start takes a minute or two while migrations and the catalog run.

To call the API from a shell you need a **user** token — the Composer and
registry routes reject service credentials:

```bash
TOKEN=$(curl -s http://localhost:7007/api/auth/guest/refresh \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["backstageIdentity"]["token"])')
curl -H "Authorization: Bearer $TOKEN" http://localhost:7007/api/composer/products
```

Guest is a VIEWER, so writes return 403 until you raise `AUTH_GUEST_ROLE`.
