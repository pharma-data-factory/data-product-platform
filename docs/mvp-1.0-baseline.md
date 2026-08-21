# Pharma Data Factory — MVP 1.0 Baseline

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PRODUCT  
Version: **1.0.0**  
Verdict: **TECHNICAL_MVP_COMPLETE**

This is the authoritative MVP 1.0 snapshot for Landing Page, Developer
Hub, sales material, and architecture diagrams.

It is not GxP validation, not legal approval, and not a commercial
distribution license. Status dimensions must not be collapsed. See
[Status model](status-model.md).

## Product version

| Field | Value |
| --- | --- |
| Product | Pharma Data Factory |
| Baseline | MVP 1.0 |
| Technical verdict | TECHNICAL_MVP_COMPLETE |
| Customer pilot | PILOT_READY_WITH_CONDITIONS |
| Pilot exit | PILOT_EXIT_FAIL (next gate, not this baseline) |
| Commercial distribution | BLOCKED |
| Legal | READY FOR LEGAL REVIEW |
| AWS Marketplace | Preparation / test integration only |
| GxP | NOT VALIDATED |

## Architecture baseline

```text
CONTROL PLANE (Backstage)
  Catalog · Marketplace · Create / Scaffolder · Developer Hub
  Search · TechDocs · Data Products · Platform Components
  Authentication / RBAC · Entitlements (local)
        ↓
DATA PRODUCT FOUNDATION
  Standard 1.0.x · SDK 1.0.0 · contracts · quality
  compatibility · CI/CD · certification model
        ↓
WAVE 1 PLATFORM COMPONENTS (CERTIFIED 1.0.0)
  Health · Observability · REST API · REST Source
  MQTT Consumer · Time-Series Storage
        ↓
OFFICIAL GOLDEN PATHS 1.0
  MQTT Temperature · REST Equipment · OEE
        ↓
GENERATED DATA PRODUCTS (independent FastAPI + Docker)
        ↓
RUNTIME / PILOT
  MQTT broker · REST / Test MES · SQLite · /health · /api/v1/quality
```

Backstage is the Control Plane. Generated Data Products run without a
Backstage instance. Shared generic behavior lives in
`packages/data-product-sdk` and is vendored as `dataprod/`.

Entitlements, Catalog (`catalog/`), and the local OEE harness (`pilot/oee`)
are part of this baseline. AAS and Unified Namespace exist as DEVELOPMENT
assets and are **not** in the MVP 1.0 value proposition.

## Control Plane

| Capability | MVP 1.0 |
| --- | --- |
| Backstage Control Plane | Included |
| Authentication / RBAC | Included |
| Catalog | Included |
| Marketplace (technical) | Included |
| Create / Scaffolder | Included |
| Developer Hub | Included |
| Search | Included |
| TechDocs | Included |
| Data Products | Included |
| Platform Components registry | Included |

## Data Product Foundation

| Artifact | Version |
| --- | --- |
| Data Product Standard | 1.0.0 (`1.0.x`) |
| Data Product SDK | 1.0.0 (`1.x`) |
| Quality model | Reusable (`dataprod` + `/api/v1/quality`) |
| Compatibility model | Shared policy (TypeScript + Python) |
| CI/CD standard | Golden Path quality gate + `pip-audit` |
| Certification model | DEVELOPMENT / TESTED / CERTIFIED (technical) |
| Composition validation | `validateComposition` (library, not orchestration) |

## Wave 1 — frozen CERTIFIED 1.0.0

Do not change Wave 1 APIs or runtime semantics unless a demonstrated
P0/P1 defect requires it.

| Component | Catalog | Package | Version | Implementation | Catalog lifecycle |
| --- | --- | --- | --- | --- | --- |
| Health | `component:default/health` | `pdf-health` | 1.0.0 | CERTIFIED | production |
| Observability | `component:default/observability` | `pdf-observability` | 1.0.0 | CERTIFIED | production |
| REST API | `component:default/rest-api` | `pdf-rest-api` | 1.0.0 | CERTIFIED | production |
| REST Source | `component:default/rest-source` | `pdf-rest-source` | 1.0.0 | CERTIFIED | production |
| MQTT Consumer | `component:default/mqtt-consumer` | `pdf-mqtt-consumer` | 1.0.0 | CERTIFIED | production |
| Time-Series Storage | `component:default/timeseries` | `pdf-timeseries` | 1.0.0 | CERTIFIED | production |

CERTIFIED means Pharma Data Factory technical conformance only.

CERTIFIED does **not** mean GxP validated, regulatory approved,
commercially approved, or AWS Marketplace listed.

MQTT Temperature and REST Equipment predate full Wave 1 library import.
They contain equivalent runtime capabilities. OEE vendors the CERTIFIED
1.x snapshots. Do not refactor MQTT/REST onto Wave 1 in this freeze.

## Official Golden Paths 1.0

| Golden Path | Template | Release | Implementation | Commercial availability |
| --- | --- | --- | --- | --- |
| MQTT Temperature | `mqtt-temperature-data-product` | RELEASED 1.0.0 | CERTIFIED | AVAILABLE (internal entitlement) |
| REST Equipment | `rest-equipment-data-product` | RELEASED 1.0.0 | CERTIFIED | AVAILABLE (internal entitlement; AWS test SKU only) |
| OEE | `oee-data-product` | RELEASED 1.0.0 | CERTIFIED | **FUTURE** |

Python Microservice and Node.js Microservice are general service
templates, not official Data Product Golden Paths.

Generated product **instances** remain DEVELOPMENT until separately
assessed.

### OEE dual status (intentional)

| Dimension | OEE 1.0 |
| --- | --- |
| Implementation | CERTIFIED |
| Release | RELEASED |
| Commercial availability | FUTURE (`future.golden-path.oee`) |
| Validation | NOT VALIDATED |

FUTURE does **not** mean OEE is missing technically. Create remains
available internally because commercial offer is not AVAILABLE.
CERTIFIED does **not** mean customers can buy OEE.

## Pilot proof in MVP 1.0

Included:

- Local single-line OEE harness (`pilot/oee`)
- Test MES
- Mosquitto (anonymous **PILOT-LOCAL** only)
- SQLite via Time-Series Storage
- Docker compose for the generated line

Not included (Pilot Exit, next gate):

- `OEE_GITHUB_LIVE_PROOF_NOT_RUN`
- `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`
- `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED`

These are preserved facts. They are not Technical MVP blockers. See
[Developer journey evidence](developer/mvp-journey-evidence.md) and
[Pilot exit gate](pilot-exit-gate.md).

## Commercial status

| Edition | Status |
| --- | --- |
| Template Edition | AVAILABLE FOR PILOT — not commercially distributable |
| Platform Edition | PLANNED |
| SaaS Edition | FUTURE |

Legal distribution flag: **BLOCKED**.

## Legal status

**READY FOR LEGAL REVIEW.** Counsel gates remain OPEN.

Do not claim LEGAL_APPROVED, commercial distribution ready, or Available
on AWS Marketplace. Do not invent LICENSE / NOTICE / THIRD_PARTY_NOTICES
until counsel approves text.

## Known limitations

- No automatic repository upgrades; vendored SDK and Wave 1 copies can drift
- MQTT/REST Golden Paths are not Wave 1 library consumers yet
- OEE vendors Wave 1 snapshots (N products = N copies)
- SQLite single writer is acceptable for the OEE pilot only
- Guest is local development only
- GitHub OAuth is separate from GitHub App publishing
- CI Quality Gate is UNKNOWN when the App lacks Actions Read-only
- Production Control Plane config is a technical-pilot profile, not AWS production
- Marketplace placeholders (Snowflake connector, Kafka, RAG) are not Golden Paths
- AAS Control Plane adapter is in-memory PROTOTYPE
- Unified Namespace is DEVELOPMENT

## Post-MVP scope (not in 1.0)

AAS certification, UNS certification, Kafka, Knowledge Graph, RAG, AI,
Grafana, TimescaleDB, Kubernetes, multi-tenancy, SaaS, AWS public
Marketplace listing, SAP Golden Path, Snowflake, Cold Chain, additional
Golden Paths, plant shift calendar, GxP validation.

## Outstanding Pilot Exit conditions

1. Grant GitHub App **Actions: Read-only**.
2. Complete one interactive Create (GitHub OAuth as approved Developer).
3. Execute the OEE GitHub integration test (`GITHUB_LIVE_PROOF_NOT_RUN` today).
4. Measure authenticated Sign In → first product only after those proofs.
5. Plant TLS/credentials before any non-local MQTT broker.

See [versioning-policy.md](versioning-policy.md) and
[compatibility-matrix.md](compatibility-matrix.md).
