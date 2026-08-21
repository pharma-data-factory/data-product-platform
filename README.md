# Pharma Data Factory

A standalone commercial Control Plane for small and mid-sized companies that
need a Data Product factory without building their own Internal Developer
Platform.

The product is **Pharma Data Factory**. It is built on
[Backstage](https://backstage.io) 1.53 (Apache-2.0 open-source framework).

This repository is independent. It does not reuse or connect to any other
internal platform.

## Product vision

A developer should be able to:

1. Open the portal
2. Browse available templates
3. Select a template
4. Enter a few parameters
5. Generate a new project
6. Automatically create a GitHub repository
7. Generate source code, Docker, tests, and GitHub Actions
8. Register the component in Backstage
9. View documentation, ownership, dependencies, and technical metadata

The long-term product includes a richer marketplace, certified partner
templates, impact analysis, quality gates, and managed platform capabilities.
Those are intentionally out of scope for this MVP.

## Architecture

Backstage is the foundation. Custom product behavior is implemented as
Backstage plugins and official software templates.

```text
Discover → Choose → Configure → Create → Build → Test → Deploy → Operate
```

See [docs/architecture.md](docs/architecture.md).

## Local setup

Prerequisites:

- Node.js 22 or 24
- Yarn 4 via Corepack
- Docker and Docker Compose for the primary startup path
- GitHub credentials only if you want the factory to create repositories

```bash
corepack enable
copy .env.example .env
yarn install
yarn tsc
yarn start
```

Open http://localhost:3000. Unauthenticated users see the public landing.
Click **Sign in**, then **Continue with GitHub** when `AUTH_GITHUB_*` is
configured, or **Continue as Guest** for local development only.

`yarn start` loads `.env`, then runs the frontend on port 3000 and the backend
on port 7007. GitHub sign-in needs `AUTH_GITHUB_*` in that file. Do not start
only `yarn workspace backend start` without `.env` loaded — the portal will
show that GitHub sign-in is not configured.

### GitHub user login (OAuth App)

Create a dedicated OAuth App named **Pharma Data Factory Login**:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL:
  `http://localhost:7007/api/auth/github/handler/frame`

Set `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` in `.env`.
OAuth App client IDs usually start with `Ov23`. Copy the value from the
OAuth App, not the GitHub App. Do not paste the GitHub App client ID
(`Iv23…`, used for repository publishing) into `AUTH_GITHUB_*`.
Do not reuse GitHub App publishing credentials. Production requires an
approved Catalog User. Add the GitHub login to `catalog/org.yaml` and a
platform group before the user can enter. Unknown GitHub users are denied
in production and do not receive Viewer access.

See [docs/identity-and-rbac.md](docs/identity-and-rbac.md).

## Docker setup

Primary startup method:

```bash
copy .env.example .env
docker compose up --build
```

Compose starts PostgreSQL and the Pharma Data Factory Control Plane
(`pharma-data-factory` image). The UI is available at
http://localhost:3000 and the backend at http://localhost:7007.

Local development without Docker is supported with `yarn start`. That path uses
SQLite from `app-config.yaml`.

Hosted Portainer / HTTPS: [Portainer](docs/deployment/portainer.md).
Do not deploy the root `Dockerfile` as production.

## GitHub configuration

Never commit secrets. Use `.env` or your secret manager.

Required to publish templates:

- A GitHub App installed on the target organization
- `.env` filled from `.env.example`
- `yarn start:github`

GitHub *user* login is separate. Set `AUTH_GITHUB_CLIENT_ID` and
`AUTH_GITHUB_CLIENT_SECRET` for portal authentication. Do not reuse GitHub App
publishing credentials for user sign-in unless you deliberately choose to.

See [docs/github-setup.md](docs/github-setup.md) for permissions and the
end-to-end test procedure.
See [docs/identity-and-rbac.md](docs/identity-and-rbac.md) for roles.

Without GitHub credentials the portal still runs with `yarn start`. Template
**Create** will fail at the publish step until the App is configured.

## Backstage configuration

| File | Purpose |
| --- | --- |
| `app-config.yaml` | Default local configuration |
| `app-config.local.yaml` | Safe local overrides, no secrets |
| `app-config.github.yaml` | Opt-in GitHub App for repository publishing |
| `app-config.docker.yaml` | Compose / container paths and PostgreSQL |
| `app-config.production.yaml` | Production-like PostgreSQL, GitHub user login, no Guest |

Enabled foundation features:

- Software Catalog
- Software Templates / Scaffolder
- TechDocs
- Search
- GitHub App integration for publish
- GitHub user authentication when `AUTH_GITHUB_*` is configured
- Guest login for local development only
- Permission Framework with Viewer / Developer / Owner / Admin

## Templates

Official templates in `templates/`:

- **Python Microservice** — FastAPI, Pydantic, pytest, Docker, GitHub Actions
- **MQTT Temperature Data Product** — MQTT ingestion, canonical temperature model, SQLite, REST API
- **Node.js Microservice** — TypeScript, Express, Vitest, ESLint, Docker
- **MQTT Data Connector** — demonstration connector, env-based MQTT config

Every official template follows [docs/engineering-contract.md](docs/engineering-contract.md).

## Marketplace

The Marketplace plugin lists templates, connectors, data products, and
solutions. MVP entries are static and catalog-driven. There is no billing or
partner onboarding.

## Data Products

The Data Products plugin lists catalog Components with
`spec.type: data-product`. The model extends Backstage Components through
`dataprod.platform/*` annotations. It does not replace the Software Catalog.

## CI/CD

Generated repositories include GitHub Actions:

Pull Request → Lint → Unit Tests → Build → Docker Build → Security Scan → Success

The platform repository has its own workflow in `.github/workflows/ci.yml`.

## Testing

```bash
yarn test:all --watchAll=false
```

Covered in the MVP:

1. Backstage backend plugin registration and startup contract
2. Official template registration
3. Python, Node.js, and MQTT template dry-run generation
4. `catalog-info.yaml` generation
5. Marketplace data
6. Data Product model and filtering

Template dry-runs render skeletons without calling GitHub.

## Project structure

```text
data-product-platform/
├── app-config.yaml
├── app-config.local.yaml
├── docker-compose.yml
├── Dockerfile
├── package.json
├── README.md
├── packages/
│   ├── app/
│   ├── backend/
│   └── data-product-sdk/
├── plugins/
│   ├── marketplace/
│   └── data-products/
├── templates/
│   ├── python-service/
│   ├── mqtt-temperature-product/
│   ├── rest-equipment-product/
│   ├── node-service/
│   └── mqtt-connector/
├── catalog/
├── docs/
└── .github/workflows/
```

## Security

- No secrets in git
- Credentials only through environment variables
- Least-privilege GitHub App permissions
- Guest auth is for local development, not a production shortcut
- GitHub user OAuth credentials are separate from GitHub App publishing credentials
- Permission checks run in the backend policy, not only in the UI
- Generated services do not log tokens or MQTT passwords

## Future roadmap

Not in this MVP:

- Kubernetes, Terraform, AWS, Azure
- Snowflake or SAP integrations
- Neo4j / dedicated graph database
- Kafka
- Payments and partner marketplace
- AI agents, LLM, RAG
- GxP validation
- Customer multi-tenancy and enterprise SSO

Recommended next step after the MVP factory flow works: GitHub catalog
discovery for customer organizations, then quality gates on generated
pipelines.
