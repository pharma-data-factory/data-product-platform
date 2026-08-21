# Templates

Python Microservice is a general service template, not an official Data
Product Golden Path. The form collects Service Name, Description, Owner,
and GitHub Repository Name. Generated services use an `app/` package,
pytest, Docker, and GitHub Actions for lint, tests, and image build.

The MQTT Temperature Data Product Golden Path generates a reusable data product
with MQTT ingestion, a versioned temperature data contract (`1.1.0`),
idempotent `eventId` ingest, SQLite storage, a REST API, a CI quality gate
(lint, unit tests, contract tests, data quality tests, compatibility tests,
Docker build), and a unique Catalog API entity
`{product}--temperature-event` with display title Temperature Event
Contract.

The REST Equipment Data Product Golden Path generates a reusable data product
that fetches equipment master data from a configurable REST source (or a
local mock ingest endpoint), validates the `equipment-event` contract
(`1.0.0`), upserts unique `equipmentId` records in SQLite, and uses the same
quality, compatibility, Catalog API, TechDocs, and CI conventions.

Official templates live in `templates/` and are registered in the Software
Catalog.

| Template | Catalog name | Purpose |
| --- | --- | --- |
| MQTT Temperature Data Product | `mqtt-temperature-data-product` | Official Golden Path (CERTIFIED / RELEASED) |
| REST Equipment Data Product | `rest-equipment-data-product` | Official Golden Path (CERTIFIED / RELEASED) |
| OEE Data Product | `oee-data-product` | Official Golden Path (CERTIFIED / RELEASED; commercial FUTURE) |
| Python Microservice | `python-microservice` | General FastAPI service template |
| Node.js Microservice | `nodejs-microservice` | General TypeScript Express service template |
| MQTT Data Connector | `mqtt-data-connector` | Demonstration MQTT connector |
| Unified Namespace | `unified-namespace` | Platform component, not a Data Product (DEVELOPMENT) |
| Machine State Consumer Data Product | `machine-state-consumer-data-product` | UNS composition proof; not an OEE Golden Path |

The Unified Namespace template collects Name, Description, Owner, Root
Namespace, Environment, and GitHub Repository. It does not expose broker
internals in the primary Create flow. Generated instances use
`spec.type: platform-component`.

The Machine State Consumer template collects Data Product Name,
Description, Owner, Domain, UNS Component (default
`component:default/unified-namespace`), Topic Pattern, and GitHub
Repository. Generated products declare native Catalog `dependsOn`
Unified Namespace and remain independently deployable.

All official templates follow `docs/engineering-contract.md`.
Official Data Product templates also follow
`docs/data-product-template-standard.md`. They vendor the shared
`dataprod` SDK and call the reusable Data Product quality workflow.

## Factory flow

The MQTT Temperature Data Product is the reference developer demo. See
[demo-guide.md](demo-guide.md).

1. Open **Create**.
2. Select a template.
3. Enter name, owner, and GitHub repository.
4. The platform fetches the skeleton, publishes to GitHub, and registers
   `catalog-info.yaml`.
5. GitHub Actions lints, tests, builds, builds the Docker image, and runs a
   security scan.
6. The component appears in Catalog, TechDocs, Data Products, and Marketplace
   template references.
