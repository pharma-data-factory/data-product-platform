# Docker production / pilot Control Plane

Owner: Platform Team  
Last reviewed: 2026-08-23  
Audience: PLATFORM ADMIN

This is the **hosted** path. Do not use the repository-root `Dockerfile`
(`yarn start`) for pilot or production.

## What “ready” means

| Gate | Evidence |
| --- | --- |
| Production image builds | `packages/backend/Dockerfile` after `yarn build:backend` |
| Compose stack starts | `docker-compose.production.yml` + env file |
| Readiness | `GET /.backstage/health/v1/readiness` → 200 |
| Guest disabled | production overlay / Sign-In |
| Secrets external | env file, never baked into image |

## Quick start (local production smoke)

From `data-product-platform/`:

```powershell
.\scripts\build-production-image.ps1
.\scripts\prepare-production-local-env.ps1
docker compose -f docker-compose.production.yml --env-file deploy/production.local.env up -d
curl http://localhost:7007/.backstage/health/v1/readiness
```

`production.local.env` is gitignored. Prefer
`.\scripts\prepare-production-local-env.ps1` (throwaway RSA key for Octokit).
If port 7007 is already used by local `yarn start`, pass `-Port 7017`.

If full-repo `yarn tsc` fails on unrelated packages, build with:
`.\scripts\build-production-image.ps1 -SkipTsc`



Stop:

```powershell
docker compose -f docker-compose.production.yml --env-file deploy/production.local.env down
```

## Hosted pilot (Portainer)

1. Build/push image (CI on `main` or local push to GHCR).
2. Copy `deploy/portainer.env.example` → Portainer stack env.
3. Set HTTPS `APP_BASE_URL` / `BACKEND_BASE_URL`, strong `BACKEND_SECRET`,
   unique `POSTGRES_PASSWORD`, real OAuth + GitHub App values.
4. Deploy `docker-compose.production.yml`.
5. Terminate TLS on Traefik / NPM / existing proxy → port **7007**.

See [portainer.md](./portainer.md).

## Build only

```powershell
yarn install --immutable
yarn tsc
yarn build:backend
docker build -f packages/backend/Dockerfile -t pharma-data-factory:mvp-1.0 .
```

Or: `yarn docker:prod:build`

## Do not

- Deploy root `Dockerfile` / `docker compose.yml` as production
- Reuse local Compose Postgres password `dpp` on a shared host
- Mix `AUTH_GITHUB_*` (user login) with `GITHUB_APP_*` (publish)
- Rely on image tag `latest`
