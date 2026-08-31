# Architecture

Data Product Platform is a standalone Backstage application. Backstage is the
platform foundation. Custom product behavior lives in plugins and official
software templates.

```text
Developer
   │
   ▼
Backstage frontend
   │  Catalog · Home · Developer Hub · Marketplace · Create · TechDocs · Search · Data Products
   ▼
Backstage backend
   │  Catalog · Scaffolder · TechDocs · Search · Auth · Permissions
   │  GitHub user login (OAuth) · GitHub App publishing
   │  Data Products CI status and certification (server-side)
   ▼
GitHub
   └── generated repositories + GitHub Actions
```

## Design rules

- Do not fork Backstage core.
- Prefer official plugins and APIs.
- Keep Data Product as a documented extension of `Component`.
- Keep Unified Namespace as `spec.type: platform-component` on system
  `integration-platform`. Data Products may `dependsOn` it. Do not model
  UNS as a Data Product.
- Keep Asset Administration Shell Foundation as `spec.type: platform-component`
  on system `asset-semantics`. Catalog stores the component only. Sensors
  stay in the AAS Repository. AAS is not a Data Product and is not UNS.
- Register reusable building blocks as `spec.type: platform-component`.
  Compose Golden Paths with version-controlled `GoldenPathComposition`
  YAML. That kind is not a Catalog entity.
- Represent data contracts as Catalog `API` entities (`spec.type: contract`).
- Use `providesApis`, `consumesApis`, and `dependsOn` for topology.
- Store the authoritative contract version on the API as
  `dataprod.platform/contract-version`.
- Use catalog relations now; a graph service can be added later.
- Keep secrets in environment variables.
- Backstage is the control plane. Generated Data Products are the data plane
  and must run without a Backstage instance.
- Generic quality, contract, and compatibility helpers live in
  `packages/data-product-sdk` and are vendored into Data Product templates.
- Official Data Products report standard, SDK, template, and contract
  versions at `GET /api/v1/platform-metadata`.
- Data Product detail shows the latest GitHub Actions quality-gate result
  from `GET /api/data-products/ci-status`. Repository identity comes from
  Catalog metadata. Marketplace does not show CI status.
- GitHub user authentication is separate from GitHub App repository publishing.
- Production login requires an approved Catalog User. Unknown GitHub
  users are denied, not granted Viewer. See
  [identity-and-rbac.md](identity-and-rbac.md) and
  [identity-providers.md](identity-providers.md).
- Technical certification updates persist as a Catalog annotation overlay.
  Catalog remains the read source of truth.
- Authorization uses the Backstage Permission Framework. See
  [identity-and-rbac.md](identity-and-rbac.md).
- Current deployment is a single **internal** organization. See
  [saas-readiness.md](saas-readiness.md) and
  [deployment-models.md](deployment-models.md).
- AWS Marketplace is a future procurement adapter. The in-product
  Marketplace is technical discovery. Designed for future AWS
  Marketplace distribution; not listed. See
  [aws-marketplace-strategy.md](aws-marketplace-strategy.md),
  [commercial-architecture.md](commercial-architecture.md), and
  [commercial-model.md](commercial-model.md).
- Contract API identity is `{dataProductName}--{logicalContractName}`.
- See [versioning-policy.md](versioning-policy.md),
  [compatibility-matrix.md](compatibility-matrix.md),
  [api-identity.md](api-identity.md), and
  [mvp-1.0-baseline.md](mvp-1.0-baseline.md).

## Public architecture story

Unauthenticated visitors see a short Home story: keep the core standard,
how Data Products are assembled, certified Golden Path proof, developer
value, and editions. Depth lives on `/platform/architecture` and
`/platform/architecture/developer`.

`/platform/architecture` is the technical product explanation of:

- systems of record (ERP, MES, LIMS, EWM, Historian, CMO / other IT-OT)
- governed integration (API, events, MQTT, REST, files / streams)
- the Nexora control plane
- independently managed Data Products

It does not replace source systems, does not imply direct database access,
and does not claim that the control plane stores all enterprise data.

Authenticated developers start from **Developer Hub** (`/developer`). Those
pages are the same TechDocs site, not a second wiki. See
[architecture/platform.md](architecture/platform.md).

## User journey

Public Home: Connect → Understand → Compose → Build → Govern → Consume

Developer Control Plane: Discover → Create → Test → Govern → Publish → Consume
