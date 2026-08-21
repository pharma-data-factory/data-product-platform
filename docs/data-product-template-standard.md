# Data Product Template Standard

Mandatory contract for official **Data Product** templates.

This is stricter than the generic [engineering contract](engineering-contract.md).
It applies to Data Product Golden Paths such as MQTT Temperature, REST
Equipment, and OEE. It does not change the Python Microservice general
service template.

The generated Data Product is the runtime / data plane. It must run without
a Backstage instance. Backstage is the control plane.

## Required artifacts

Every official Data Product template MUST generate:

| Artifact | Requirement |
| --- | --- |
| Component catalog entity | `catalog-info.yaml` `kind: Component`, `spec.type: data-product` |
| API contract entity | `kind: API`, `spec.type: contract` |
| Native topology | Component `spec.providesApis`; consumers later use `consumesApis` |
| Versioned JSON Schema | `contracts/<name>.schema.json` with a `version` field |
| Quality endpoint | `GET /api/v1/quality` |
| Platform metadata endpoint | `GET /api/v1/platform-metadata` |
| Quality tests | `tests/test_quality.py` |
| Compatibility tests | `tests/test_compatibility.py` |
| Health endpoint | `GET /health` |
| Docker | `Dockerfile` and `docker-compose.yml` |
| CI quality gate | reusable Data Product workflow |
| TechDocs | `mkdocs.yml` + `docs/` |
| README | how to run, test, and operate independently |
| `.env.example` | configuration without secrets |

Do not add custom topology annotations when native Catalog fields exist.

Keep custom metadata only where Backstage has no equivalent:

- `dataprod.platform/qualityStatus`
- `dataprod.platform/certification-status`
- `dataprod.platform/compatibleVersions`
- `dataprod.platform/contract-version` on the API entity
- `dataprod.platform/dataProductStandardVersion`
- `dataprod.platform/dataProductSdkVersion`
- `dataprod.platform/template`
- `dataprod.platform/templateVersion`
- `dataprod.platform/contract` on the API entity (logical contract name)

API entity `metadata.name` MUST be unique per Data Product. Use
`{dataProductName}--{logicalContractName}` and keep `metadata.title`
human-readable. See [api-identity.md](api-identity.md).

## Quality endpoint

`GET /api/v1/quality` MUST return:

```json
{
  "status": "PASS",
  "contractVersion": "1.0.0",
  "checks": [
    {
      "name": "example_check",
      "mandatory": true,
      "passed": true,
      "failedCount": 0,
      "message": "human-readable rule"
    }
  ]
}
```

`status` is `PASS` or `FAIL`. A failed mandatory check fails CI.

Use the vendored `dataprod` SDK for the report model and generic helpers.
Keep field-specific rules in the generated `app/` package.

## Platform metadata

`GET /api/v1/platform-metadata` MUST return:

```json
{
  "dataProductStandardVersion": "1.0.0",
  "sdkVersion": "1.0.0",
  "template": "example-template",
  "templateVersion": "1.0.0",
  "contractVersion": "1.0.0"
}
```

Implement this with `dataprod.metadata.platform_metadata`. Do not put
product-specific fields in the SDK.

Current versions:

- Data Product Standard: `1.0.0`
- Data Product SDK: `1.0.0`

See [versioning-policy.md](versioning-policy.md) and
[compatibility-matrix.md](compatibility-matrix.md).

## Template certification

Official templates use technical status `DEVELOPMENT`, `TESTED`, or
`CERTIFIED`.

`CERTIFIED` means only: the template conforms to this technical standard.
It does not mean GxP validated or regulatory approved.

A template may be `CERTIFIED` only when:

- the conformance test passes
- generated tests pass
- Docker build passes
- required CI stages exist

## Compatibility

Compatibility tests MUST consume the shared policy
`config/data-product-compatibility-policy.yaml` (vendored into generated
products as `dataprod/compatibility-policy.json`). The policy defines:

- removed required property → BREAKING_CHANGE
- changed field type → BREAKING_CHANGE
- new optional property → COMPATIBLE
- new required property → BREAKING_CHANGE
- major version change → potentially breaking

Results: `COMPATIBLE`, `BREAKING_CHANGE`, `UNKNOWN`.

CI fails when a breaking change would affect an active consumer.

## CI quality gate

Generated Data Products MUST call the reusable workflow
`.github/workflows/data-product-quality.yml`:

1. Lint
2. Unit tests
3. Contract tests
4. Data quality tests
5. Compatibility tests
6. Docker build

Product-specific pytest commands are inputs. Do not omit a mandatory stage.

## TechDocs structure

Document this standard in generated TechDocs. Do not invent a documentation
framework. Required pages:

- Overview
- Architecture
- API
- Data Contract
- Quality Rules
- Configuration
- Local Development
- Deployment
- Release Notes

Add extra pages only when the product needs them, for example REST Source
Integration.

## Shared foundation

Generic helpers live in `packages/data-product-sdk/` and are vendored into
generated repositories as `dataprod/`.

Do not put MQTT, REST source, storage, or product fields in the SDK.
Do not require Backstage, Kafka, Kubernetes, Neo4j, SAP, or Snowflake.
