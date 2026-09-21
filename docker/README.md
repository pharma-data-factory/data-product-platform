# Docker Setup — Nexora Data Product Platform

## Zwei Betriebsmodi

### Modus 1: Single-Container (Standard, empfohlen)

Ein Container auf Port 7007. Backend dient auch das Frontend — kein CORS, kein Proxy-Aufwand. Genau wie das Production-Image aus der CI-Pipeline.

```bash
# 1. Build
yarn install --immutable
yarn tsc
yarn build:backend

docker compose build

# 2. Starten
BACKEND_SECRET=<min-24-zeichen-geheim> \
POSTGRES_PASSWORD=<dein-passwort> \
docker compose up

# 3. Öffnen
open http://localhost:7007
```

### Modus 2: Split-Container (Frontend + Backend getrennt)

Frontend auf Port **3000** (nginx), Backend auf Port **7007**. nginx leitet `/api/*` und `/.backstage/*` an den Backend-Container weiter.

```bash
# 1. Frontend und Backend bauen
yarn install --immutable
yarn tsc
yarn build:backend
yarn workspace app build     # erzeugt packages/app/dist/

docker compose build

# 2. Starten (Profile "split")
BACKEND_SECRET=<geheim> \
POSTGRES_PASSWORD=<passwort> \
docker compose --profile split up

# 3. Öffnen
open http://localhost:3000   # Frontend
# Backend-API: http://localhost:7007
```

## Ports

| Service   | Modus  | Port  | Beschreibung                    |
|-----------|--------|-------|---------------------------------|
| nexora    | single | 7007  | Alles in einem Container        |
| backend   | split  | 7007  | Nur Backend-API                 |
| frontend  | split  | 3000  | nginx + React-App               |
| db        | beide  | 5432  | PostgreSQL (optional freilegen) |

## Umgebungsvariablen

| Variable          | Default                         | Beschreibung                    |
|-------------------|---------------------------------|---------------------------------|
| BACKEND_SECRET    | nexora-dev-secret-change-...    | JWT-Signaturschlüssel (ändern!) |
| POSTGRES_PASSWORD | nexora_dev_pass                 | DB-Passwort                     |

## Volumes

- `nexora_db` — PostgreSQL-Daten (persistent)
- `nexora_runtime` — Audit-Logs, Validierungsdaten (persistent)

## Health Check

```bash
curl http://localhost:7007/.backstage/health/v1/readiness
# {"status":"ok"}
```

## Architektur-Entscheidung

Das Backend-Image (`packages/backend/Dockerfile`) enthält **immer** das
gebaute Frontend (`packages/app/dist/`) — das ist das Standard-Backstage-
Produktionsmuster. Im Split-Modus laufen zwei Instanzen desselben Images:
der Frontend-Container (nginx) dient nur die statischen Dateien und
proxied alle API-Calls zum Backend.

Ein dediziertes Frontend-Image (ohne Node.js-Backend) wäre leichtgewichtiger,
erfordert aber eine separate Build-Pipeline für `packages/app`.
