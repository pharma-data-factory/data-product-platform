<p align="center">
  <img src="docs/brand/nexora-lockup.svg" alt="Nexora — Pharma Data Factory" width="640" />
</p>

<h1 align="center">Nexora</h1>

<p align="center">
  <strong>Pharma Data Factory</strong> Control Plane for governed Data Products
  in life science manufacturing.
</p>

**Nexora** is the product name. **NEXORA** is the wordmark. **Pharma Data
Factory** is the product line: a commercial Control Plane for small and
mid-sized life science teams (pharma, biotech, and CDMO/CMO). Developers discover, create,
and operate Data Products around existing ERP, MES, LIMS, EWM, and other
IT/OT systems of record — without building an Internal Developer Platform
from scratch.

The Control Plane is built on [Backstage](https://backstage.io) **1.53.0**
(Apache-2.0). Backstage is the framework, not the product. Generated Data
Products run independently of the Control Plane.

| | |
| --- | --- |
| Product name | Nexora |
| Wordmark | NEXORA |
| Product line | Pharma Data Factory |
| Brand mark | Hexagonal N mark (`docs/brand/nexora-lockup.svg`, `packages/app/public/favicon.svg`) |
| Baseline | MVP 1.0 |
| Technical status | TECHNICAL_MVP_COMPLETE |
| Commercial distribution | BLOCKED pending counsel-approved LICENSE / NOTICE |
| GxP / CSV | Not validated. CERTIFIED is technical conformance only. |

This repository is standalone. It does not reuse or connect to unrelated
corporate platforms.

---

## What the platform does

Nexora keeps core systems standard, composes certified capabilities, and
delivers independently versioned Data Products.

| Capability | What you get |
| --- | --- |
| **Discover** | Catalog, Marketplace, TechDocs, ownership, APIs, dependencies |
| **Create** | Golden Path templates, GitHub repository, source, Docker, tests, CI |
| **Deliver** | GitHub Actions quality gate, contracts, compatibility, versioning |
| **Operate** | Lifecycle metadata, documentation, RBAC, certification status |

Official Golden Path:

```text
Marketplace → MQTT Temperature, REST Equipment, or OEE
  → Configure parameters → Generate → GitHub repository
  → GitHub Actions → Tests → Docker build
  → Catalog → Data Products → Contract / TechDocs / CI quality gate
```

ERP, MES, LIMS, EWM, historians, and similar systems remain the systems of
record. The Control Plane does not replace them and does not connect to
those databases directly.

---

## Official Golden Paths

| Golden Path | Catalog name | Technical status | Commercial availability |
| --- | --- | --- | --- |
| MQTT Temperature Data Product | `mqtt-temperature-data-product` | CERTIFIED / RELEASED | Pilot (legal gates OPEN) |
| REST Equipment Data Product | `rest-equipment-data-product` | CERTIFIED / RELEASED | Pilot (legal gates OPEN) |
| OEE Data Product | `oee-data-product` | CERTIFIED / RELEASED | FUTURE |

CERTIFIED means the template conforms to Data Product Standard 1.0.x. It
is not GxP validation and not a sales SKU.

Python Microservice, Node.js Microservice, and MQTT Connector are general
service templates, not Data Product Golden Paths.

---

## Create parameters

Create collects a small set of business fields. Secrets and runtime URLs
are never entered in the form. They belong in the generated service
environment after publish.

### Shared (all official Data Product templates)

| Parameter | Required | Meaning |
| --- | --- | --- |
| **Data Product Name** | Yes | Lowercase letters, digits, and dashes (`^[a-z0-9]+(-[a-z0-9]+)*$`). Becomes the GitHub repository name. |
| **Description** | Yes | Short product description. |
| **Owner** | Yes | Catalog User or Group. Not the GitHub organization. |
| **GitHub Repository** | Yes | Created in `pharma-data-factory` by the platform GitHub App. Enter the repository name only. |

Fixed by the template (not asked on Create): GitHub host `github.com`,
organization `pharma-data-factory`, private repository, default branch
`main`, system `data-platform`, initial version `1.0.0`.

### MQTT Temperature

| Parameter | Default | Meaning |
| --- | --- | --- |
| **MQTT Topic** | `pharma/temperature/+` | Subscription topic. `+` is a single-level wildcard. |

Domain is manufacturing.

### REST Equipment

| Parameter | Default | Meaning |
| --- | --- | --- |
| **Domain** | `manufacturing` | Business domain for catalog metadata. |

The REST source URL is a runtime environment variable on the generated
service, not a Create field.

### OEE Data Product

| Parameter | Default | Meaning |
| --- | --- | --- |
| **Domain** | `manufacturing` | Business domain. |
| **Equipment Identifier** | `filler-01` | Canonical `equipmentId` on every OEE input and result. |
| **Default Time Window** | `hour` | `hour`, `day`, `shift`, `order`, or `custom`. `CURRENT_SHIFT` requires from/to at query time. |
| **MQTT Topic Pattern** | `pharma/oee/+/+` | Machine, count, and quality events. |
| **Production Context URL Reference** | `SOURCE_API_URL` | **Name** of the env var that will hold the MES REST URL. Do not paste the URL or a secret. |

OEE architecture is fixed: counter convention CUMULATIVE; Wave 1 MQTT
Consumer and REST Source; OEE contract 1.0.0.

### Python Microservice (not a Golden Path)

Service Name, Description, Owner, GitHub repository name. Same naming
rules as Data Products.

Full template notes: [docs/templates.md](docs/templates.md).

---

## Runtime and Control Plane parameters

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable group | Purpose |
| --- | --- |
| `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` / `AUTH_GITHUB_CALLBACK_URL` | GitHub **OAuth App** for human login (`Ov23…`). Callback: `{backend}/api/auth/github/handler/frame`. |
| `GITHUB_APP_ID` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET` | GitHub **App** for publishing generated repositories (`Iv23…`). Do not mix with OAuth login. |
| `GITHUB_ORG` | Target organization (default `pharma-data-factory`). |
| `APP_BASE_URL` / `BACKEND_BASE_URL` / `BACKEND_SECRET` | Hosted Control Plane URLs and backend cookie secret. Leave empty for local `yarn start`. |
| `POSTGRES_*` | Docker Compose / hosted PostgreSQL. Local Compose uses documented local-only defaults. |
| `AWS_MARKETPLACE_*` | Optional procurement integration. Empty for local development. Not a public listing. |
| `LEGAL_DISTRIBUTION_STATUS` | Operational flag. Default **BLOCKED** until counsel approves LICENSE / NOTICE. |

OAuth App client IDs start with `Ov23`. GitHub App client IDs start with
`Iv23`. Mixing them breaks login or publish.

Local: [docs/github-setup.md](docs/github-setup.md),
[docs/identity-and-rbac.md](docs/identity-and-rbac.md).  
Hosted: [docs/deployment/portainer.md](docs/deployment/portainer.md).

---

## License and third-party notices

**This product is not open source.** Custom Control Plane code (plugins,
UI, templates, `platform-common`, generated-product SDK) is declared
`UNLICENSED` / private. There is no outbound `LICENSE`, `NOTICE`, or
`THIRD_PARTY_NOTICES.md` in this repository yet.

Counsel review is required before commercial distribution, Template
Edition packaging, or publishing final legal pages.

| Layer | Status |
| --- | --- |
| Nexora original code | Proprietary. `license: UNLICENSED`. Distribution blocked until counsel approves outbound terms. Nexora and Pharma Data Factory are product names, not an open-source grant. |
| Backstage 1.53.0 | [Apache License 2.0](https://github.com/backstage/backstage/blob/master/LICENSE). Apache-2.0 does not grant trademark rights in Backstage®. |
| Upstream NOTICE | [The Backstage Authors](https://github.com/backstage/backstage/blob/master/NOTICE) plus third-party portions. |
| Generated Data Products | Independent FastAPI services. Outbound LICENSE / NOTICE / third-party notices are counsel-gated placeholders, not invented here. |
| Public legal pages | `/legal`, `/privacy`, `/terms`, `/open-source` are review placeholders, not binding terms. |

Required OSS attribution will be published after Phase 0 counsel gates
are APPROVED. Until then, do not treat this README as a license grant.

Commercial editions (Template / Platform / SaaS): [docs/commercial-model.md](docs/commercial-model.md).
List prices are not published.

---

## Getting started

Prerequisites: Node.js 22 or 24, Yarn 4 (Corepack), Docker Compose for the
primary path. GitHub credentials only if you want Create to publish
repositories.

```bash
corepack enable
copy .env.example .env
yarn install
yarn tsc
yarn start
```

Open http://localhost:3000. Sign in with GitHub when `AUTH_GITHUB_*` is
set, or **Continue as Guest** for local development only. Guest is not
available in production.

`yarn start` loads `.env`, frontend **3000**, backend **7007**. Do not
start only `yarn workspace backend start` without `.env`.

### Docker

```bash
copy .env.example .env
docker compose up --build
```

Compose starts PostgreSQL and the Control Plane. UI:
http://localhost:3000 — backend: http://localhost:7007.

Local `yarn start` without Docker uses SQLite from `app-config.yaml`.
Do not deploy the root `Dockerfile` as production. Production image:
`packages/backend/Dockerfile`. Hosted: [Portainer](docs/deployment/portainer.md).

### Configuration files

| File | Purpose |
| --- | --- |
| `app-config.yaml` | Default local configuration |
| `app-config.local.yaml` | Safe local overrides, no secrets |
| `app-config.github.yaml` | Opt-in GitHub App for repository publishing |
| `app-config.docker.yaml` | Compose / container paths and PostgreSQL |
| `app-config.production.yaml` | Production-like PostgreSQL, GitHub login, no Guest |

Without GitHub App credentials the portal still runs. **Create** fails at
publish until the App is installed on the organization.

---

## Testing and CI

```bash
yarn test:all --watchAll=false
```

Platform workflow: `.github/workflows/ci.yml`. Generated repositories
run lint, unit tests, contract/quality tests, Docker build, and a
security scan.

---

## Security

- No secrets in git. Credentials only via environment variables.
- Least-privilege GitHub App permissions.
- OAuth login credentials are separate from GitHub App publishing credentials.
- Permission checks run in the backend policy, not only in the UI.
- Generated services must not log tokens or MQTT passwords.
- Production requires an approved Catalog User. Unknown GitHub users are denied.

---

## Documentation

Authenticated starting point: **Developer Hub** (`/developer`).

- [MVP 1.0 baseline](docs/mvp-1.0-baseline.md)
- [Architecture](docs/architecture.md)
- [Engineering contract](docs/engineering-contract.md)
- [Demo guide](docs/demo-guide.md)
- [Capability matrix](docs/capability-matrix.md)

---

## Project structure

```text
data-product-platform/
├── app-config.yaml
├── docker-compose.yml
├── packages/            # app, backend, data-product-sdk, platform-common
├── plugins/             # marketplace, data-products, entitlements
├── templates/           # Golden Paths and service templates
├── platform-components/ # Wave 1 building blocks
├── catalog/
├── docs/
└── .github/workflows/
```

---

## Out of scope for this MVP

Kubernetes, Terraform, production AWS/Azure packaging, Snowflake, SAP,
Neo4j, Kafka infrastructure, payments, partner marketplace, AI/LLM/RAG,
GxP validation claims, customer multi-tenancy, and enterprise SSO beyond
GitHub OAuth.

SaaS Edition is future. Platform Edition is planned. Do not treat the
current internal Control Plane as a generally available customer-cloud SKU.
