# Pharma Data Factory — Product Roadmap

This roadmap is the authoritative product plan. Status labels are exact.
Planned and future capabilities are **not available** in the running product.

MVP 1.0 freeze: [mvp-1.0-baseline.md](docs/mvp-1.0-baseline.md).
Status dimensions: [status-model.md](docs/status-model.md).

## MVP 1.0 — TECHNICAL BASELINE

Status: **COMPLETE** (`TECHNICAL_MVP_COMPLETE`)

Shipped Control Plane, foundation, Wave 1, and three official Golden Paths:

- Backstage Control Plane
- Authentication / RBAC (Viewer / Developer / Owner / Admin)
- Catalog / Marketplace / Create / Developer Hub / Search / TechDocs
- Data Products and Platform Components registry
- Data Product Standard, SDK, contracts, quality, compatibility, CI/CD
- Technical certification model
- Wave 1 CERTIFIED 1.0.0: Health, Observability, REST API, REST Source,
  MQTT Consumer, Time-Series Storage
- MQTT Temperature Data Product (CERTIFIED / RELEASED)
- REST Equipment Data Product (CERTIFIED / RELEASED)
- OEE Data Product (CERTIFIED / RELEASED technically; commercial **FUTURE**)
- Local single-line OEE pilot harness (Test MES, Mosquitto, SQLite, Docker)
- GitHub App repository publishing (mechanism; interactive Create is Pilot Exit)
- Public landing page (not a commercial distribution claim)

Do not treat MQTT Connector, Node.js Microservice, Python Microservice,
or marketplace placeholders as completed Data Product Golden Paths.

OEE commercial SKU remains FUTURE. Legal distribution remains BLOCKED.
AAS and Unified Namespace remain DEVELOPMENT and are outside MVP 1.0.

## MVP 1.1 — PILOT EXIT

Status: **IN PROGRESS**

Pilot Exit is the next gate. It does not add Golden Paths or Wave 1 APIs.

Outstanding conditions (not Technical MVP blockers):

- `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`
- `OEE_GITHUB_LIVE_PROOF_NOT_RUN`
- `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED`
- GitHub App Actions Read-only so Quality Gate is not UNKNOWN
- Plant TLS / credentials before non-local MQTT

Assets present in the repository that stay **outside** the MVP 1.0
value proposition (do not promote):

- Unified Namespace (`uns/`) — DEVELOPMENT
- AAS Foundation (`/assets`) — DEVELOPMENT / PROTOTYPE UI
- Machine State Consumer — TESTED composition proof, not an official Golden Path
- Machine Metrics — TESTED REFERENCE composition proof

See [pilot-exit-gate.md](docs/pilot-exit-gate.md)
and [developer journey evidence](docs/developer/mvp-journey-evidence.md).

## V1.2 — COMMERCIALIZATION

Status: **IN PROGRESS** (foundation)

Shipped in this Control Plane (not a live AWS listing):

- Entitlement Foundation (provider-neutral model + service)
- Commercial Product IDs
- Distribution Model (RELEASED artifacts only)
- AWS Marketplace Adapter (official SDK; NOT CONFIGURED without credentials)
- Local Marketplace simulation
- Marketplace commercial status (ENTITLED / NOT ENTITLED / PLANNED / FUTURE)
- Entitlement-aware Create (RBAC AND entitlement)
- Production AWS fail-closed (no silent INTERNAL fallback)
- AWS Marketplace Test Enablement 1.0 (REST Equipment registration,
  organization linking, legal distribution gate default BLOCKED)

Not available:

- Template Edition commercial packaging while legal gates are OPEN
- Public / live AWS Marketplace listing
- Private Offer readiness
- Billing / metering records
- SaaS tenant provisioning

## V2 — PLATFORM EDITION

Status: **PLANNED**

Not available:

- Customer-hosted Pharma Data Factory
- Customer Identity Provider
- Microsoft Entra ID / OIDC
- Customer GitHub integration
- Customer configuration
- Deployment automation

## FUTURE — SAAS

Status: **FUTURE**

Not available:

- Multi-organization tenancy / tenant isolation
- Customer SSO
- Subscription / billing integration
- Managed upgrades
- Operations / monitoring
- Automatic customer tenant provisioning

OrganizationContext and entitlement enforcement exist as a single-organization
foundation. They are not SaaS multi-tenancy.

## Post-MVP (explicitly out of 1.0)

AAS certification, UNS certification, Kafka, Knowledge Graph, RAG, AI,
Grafana, TimescaleDB, Kubernetes, multi-tenancy, SaaS, AWS public
Marketplace listing, SAP Golden Path, Snowflake, Cold Chain, additional
Golden Paths, plant shift calendar, GxP validation.
