# Pilot operations runbook

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: PLATFORM ADMIN  
Version: 1.0.0

Minimum operational notes for a **controlled technical pilot**. This is
not an enterprise ITSM process.

## Images

| Runtime | Image | Notes |
| --- | --- | --- |
| Control Plane (pilot/production) | `packages/backend/Dockerfile` | `NODE_ENV=production`. Requires `yarn install --immutable`, `yarn tsc`, `yarn build:backend` first. |
| Local Compose Control Plane | root `Dockerfile` | Development only. `NODE_ENV=development`. Guest forbidden by `app-config.docker.yaml`. |
| MQTT Temperature | generated `Dockerfile` | Independent of Backstage. |
| REST Equipment | generated `Dockerfile` | Independent of Backstage. |
| OEE Data Product | generated `Dockerfile` | Independent of Backstage. Pilot compose: `pilot/oee/docker-compose.yml` (Test MES + Mosquitto + generated product). Mosquitto anonymous mode is pilot-local only. |
| Machine Metrics Reference | `platform-components/examples/machine-metrics/Dockerfile` | Build from `platform-components/`. |
| Wave 1 libraries | consumed by product images | Not shipped as six separate production services. |
| Unified Namespace | `uns/Dockerfile` | DEVELOPMENT. Not required for OEE MVP. |

Do not use Kubernetes.

## Startup

1. Fill `.env` from `.env.example`. Do not bake secrets into images.
2. For Control Plane: Postgres healthy, then backend with
   `app-config.yaml` + `app-config.production.yaml` (or docker overlay).
3. Confirm `auth.environment` is `production` for the pilot Control Plane.
4. Confirm Guest is absent from Sign In.
5. Generated Data Products: inject MQTT/REST/SQLite settings via env.
6. Probe `/health` (products) and Control Plane load.

## Shutdown

Stop generated Data Products first, then Control Plane, then Postgres.
SQLite files remain on the product volume until deleted.

## Health

- Control Plane: backend process up, Catalog readable, auth configured.
- Data Products: `GET /health` (liveness) and readiness from Health 1.0.0.
- MQTT down → MQTT Consumer health `DOWN`; process should stay up.
- Empty MQTT host → consumer disabled, health `UP` with detail `disabled`.

## Configuration

- Control Plane: `app-config*.yaml` + environment substitution.
- Products: `.env` / container env. Never commit `.env`.
- Replace `localhost` URLs before any non-local URL is advertised.

## Secrets

- `.env` is gitignored and dockerignored.
- GitHub OAuth (`AUTH_GITHUB_*`) ≠ GitHub App (`GITHUB_APP_*`).
- MQTT passwords and source tokens stay in env; observability redacts
  password/token/secret/authorization/api_key.
- Default Compose Postgres password `dpp` is local-only. Change it for
  any shared pilot host.

## Logs and metrics

Observability 1.0.0: structured stdout logs, `X-Request-ID`, in-process
counters. No central metrics backend, tracing, or alerting.

Pilot minimum: retain container stdout, watch `/health`, treat repeated
`DOWN` as an incident.

## Backup and data reset

- Control Plane: Postgres volume (`postgres_data`).
- Time-series / UNS / AAS SQLite: copy or delete the configured path.
- Certification overlay `catalog/certification-overrides.json` is local
  and gitignored.

## Incident diagnosis

1. Identity: GitHub OAuth callback, Catalog User exists, group/role.
2. Create denied: RBAC (Viewer) vs entitlement vs AWS fail-closed.
3. Product not ingesting: MQTT host, topic, payload schema, storage path.
4. CI Quality Gate `UNKNOWN`: GitHub App Actions Read-only missing or
   GitHub unavailable. Environment issue, not product failure.

Hosted Portainer stack: [Control Plane hosting](control-plane-hosting.md).
Do not use this runbook's local `dpp` password on a shared host.

## Rollback and upgrade

- Control Plane: redeploy previous image; keep Postgres.
- Data Products: previous Git tag / image. Wave 1 APIs stay 1.x.
- Do not hot-swap CERTIFIED component major versions in a running pilot.

## Support ownership

Platform Team owns Control Plane, Catalog, Golden Paths, and Wave 1
components. Plant OT owns brokers, MES APIs, and network. Generated
Data Product domain logic is owned by the Catalog `spec.owner`.
