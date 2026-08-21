# Portainer hosting

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08-21  
Audience: PLATFORM ADMIN

Hosted **pilot** Control Plane on Docker/Portainer. This is not Kubernetes,
not SaaS, and not commercial distribution.

**Status:** hosting package. A live Portainer stack is **not** verified in
this repository until an operator deploys it.

## Modes

| Mode | Compose / config | Guest | URLs |
| --- | --- | --- | --- |
| Local development | `yarn start` + `app-config.yaml` | allowed (Developer) | localhost |
| Local Compose | `docker compose.yml` + `app-config.docker.yaml` | forbidden | localhost |
| Hosted pilot | `docker-compose.production.yml` + production image | forbidden | HTTPS |
| Marketplace test | hosted baseline + `app-config.marketplace-test.yaml` | forbidden | HTTPS + AWS overlay |

Do not mix modes. Do not deploy the repository-root `Dockerfile`
(`yarn start`, `NODE_ENV=development`).

## Image

Production image: `packages/backend/Dockerfile`.

```bash
yarn install --immutable
yarn tsc
yarn build:backend
docker build -f packages/backend/Dockerfile -t ghcr.io/pharma-data-factory/data-product-platform:mvp-1.0 .
```

CI on `main` pushes:

- `ghcr.io/<org>/<repo>:sha-<7-char-sha>`
- `ghcr.io/<org>/<repo>:mvp-1.0`

Do not rely on `latest`. Rollback by setting `CONTROL_PLANE_IMAGE` to a
previous `sha-…` tag and redeploying.

## Stack

File: `docker-compose.production.yml`.

Services: `postgres`, `control-plane`. Reverse proxy stays outside this
file. Point `https://<domain>` at container port **7007**.

Env template: `deploy/portainer.env.example`. Fill values in Portainer.
Never paste secrets into the compose file or Git.

Required variables are listed in
[Control Plane hosting](../operations/control-plane-hosting.md).

Postgres password must not be `dpp`. Persist `postgres_data`.

## Health

Control Plane readiness: `GET /.backstage/health/v1/readiness` → 200.

Portainer uses the compose healthcheck. Postgres uses `pg_isready`.

## Persistence check

1. Stack healthy.
2. Sign in as an approved Catalog User. Open Catalog.
3. Restart `control-plane`. Session keys survive if `BACKEND_SECRET` is
   unchanged. Catalog users come from `catalog/org.yaml` in the image.
4. Restart `postgres`. Catalog plugin database state remains on
   `postgres_data`.

## Update

```text
git push origin main
→ GitHub Actions test + image
→ new sha-<sha> and mvp-1.0 tags on GHCR
→ Portainer pull / recreate control-plane
→ readiness 200
```

Do not copy source onto the server.

## Rollback

Set `CONTROL_PLANE_IMAGE` to the last known good `sha-…` tag. Recreate
only `control-plane`. Keep the Postgres volume.

## HTTPS

Terminate TLS on Traefik, Nginx Proxy Manager, or an existing proxy.
OAuth callback must be HTTPS. See [hosted login](../developer/hosted-login.md).
