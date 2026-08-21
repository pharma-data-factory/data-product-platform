# Data Products

A Data Product is a Backstage `Component` with `spec.type: data-product` and
`dataprod.platform/*` annotations.

Unified Namespace is not a Data Product. It is
`spec.type: platform-component`. Future products such as OEE may
`dependsOn: component:default/unified-namespace`. See
[Platform Component Library](platform-components.md).

This is an extension of the Software Catalog, not a replacement.

Generated Data Products vendor a small `dataprod` SDK for quality reports,
JSON Schema helpers, and compatibility rules. Product-specific fields and
source logic stay in the generated `app/` package. See
[Data Product Template Standard](data-product-template-standard.md).

## Topology model

Contract identity is a Backstage `API` entity (`spec.type: contract`).
Sample catalog topology uses only native Catalog fields and relations:

| UI field | Native Catalog source |
| --- | --- |
| Provides | `spec.providesApis` / relation `providesApi` |
| Consumes | `spec.consumesApis` / relation `consumesApi` |
| Depends On | `spec.dependsOn` / relation `dependsOn` |
| Used By | Inverse `dependencyOf` and `apiConsumedBy` |

The MQTT Temperature Data Product provides
`api:default/sample-mqtt-temperature-product--temperature-event`.
The display name remains Temperature Event Contract. The Temperature
Dashboard Consumer consumes that unique API and depends on the MQTT
product. The REST Equipment Data Product provides
`api:default/sample-rest-equipment-product--equipment-event`, consumed by
`equipment-dashboard-consumer`. Catalog Graph visualizes those native
relationships.

See [API identity](api-identity.md).

The Data Product detail page is the operational control center:

- **Overview** — name, owner, domain, lifecycle, certification
- **Health** — quality, CI Quality Gate, platform compliance, upgrade status
- **Contract** — contract, version, compatibility
- **Dependencies** — Provides, Consumes, Depends On, Used By
- **Discover** — Repository, Documentation, Catalog Graph, API / Contract

Sample catalog entities are labeled **SAMPLE**. They are demonstration
entities, not generated GitHub repositories.

Search uses native Search (Catalog + TechDocs collators).
Do not add a second product-specific search index.

## Contract version

The authoritative contract version is the API annotation
`dataprod.platform/contract-version`.

The Data Products UI displays that value after resolving the related API.
Component annotation `dataprod.platform/dataContractVersion` remains a
legacy fallback for generated or older entities.

## Legacy fallback

The plugin still reads these annotations when native relations are absent:

- `dataprod.platform/providesContract`
- `dataprod.platform/consumesContract`
- `dataprod.platform/depends-on`
- `dataprod.platform/dataContractVersion`

Sample catalog entities no longer store those topology duplicates.
Newly generated MQTT and REST products no longer write
`providesContract` or component `dataContractVersion`. Do not remove
plugin fallback support.

## Product-specific metadata

These remain custom annotations (not Catalog relations):

- `compatibleVersions`
- `qualityStatus`
- `certificationStatus`
- `dataContractVersion` (legacy fallback)
- `dataprod.platform/contract-version` on the API entity (authoritative)
- `dataProductStandardVersion`
- `dataProductSdkVersion`
- `template`
- `templateVersion`

## Fields

- name, description, owner, version, lifecycle
- domain
- source systems
- interfaces and APIs
- protocol
- data contracts and data contract version
- quality status
- documentation
- repository
- deployment information
- certificationStatus: `DEVELOPMENT` | `TESTED` | `CERTIFIED`
- template name and template version
- Data Product Standard version
- SDK version
- upgrade status: `CURRENT` | `UPDATE_AVAILABLE` | `UPGRADE_REQUIRED` | `UNSUPPORTED`

The Data Product detail page has a **Platform Compliance** section:

- Standard Version
- SDK Version
- Template Version
- Contract Version
- Certification
- Upgrade Status

The Data Product detail page has a **CI Quality Gate** section. It reads
the latest GitHub Actions workflow run through the backend GitHub App
integration and maps it to `RUNNING`, `PASSED`, `FAILED`, `CANCELLED`, or
`UNKNOWN`. This is not shown on Marketplace or the Data Products list.

## Quality

The Data Products page shows quality badges and a **Quality** card on the
detail page:

- Data Contract
- Contract Version
- Quality Status
- Quality endpoint URL
- Required checks

Quality badges:

- `DEVELOPMENT`
- `TESTED`
- `CERTIFIED`

Quality and certification metadata are technical platform status only.
They are not GxP or regulatory validation.

### Certification persistence

The canonical status remains the Catalog annotation
`dataprod.platform/certification-status`.

`POST /api/data-products/certification` is permission-checked
(Owner/Admin). It writes a platform-owned overlay at
`catalog/certification-overrides.json` (runtime file, not committed).
A catalog processor applies that overlay during entity processing so
Catalog stays the only read source of truth. This is not a second
product database and not a workflow engine.

See `catalog/certification-overrides.example.json`.

MQTT Temperature Data Products additionally expose:

- contract version `1.1.0` (from the `temperature-event` API)
- `sourceSystem`: `mqtt`
- `protocol`: `MQTT`
- `interface`: `REST`
- `qualityStatus`: `TESTED`

REST Equipment Data Products additionally expose:

- contract version `1.0.0` (from the `equipment-event` API)
- `sourceSystem`: `rest`
- `interface`: `REST`
- `qualityStatus`: `TESTED`

## Dependencies

The Data Products detail page has a **Dependencies** section:

- Provides
- Consumes
- Depends On
- Used By

The sample consumer `temperature-dashboard-consumer` declares
`compatibleVersions: 1.x`.

Compatibility rules:

- Patch/minor changes inside a compatible major version are compatible
- A major version change is potentially breaking
- Removing a required field is breaking
- Changing a field type is breaking
- A new optional field is compatible
- A new required field is breaking

If a breaking change would affect an active consumer, CI fails.
This uses Catalog relationships and metadata, not Neo4j.
