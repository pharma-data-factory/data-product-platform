# Standard Engineering Contract

Every official Data Product Platform template MUST generate a repository
that follows this contract. The contract is technical, not regulatory.

## Required artifacts

| Artifact | Path | Purpose |
| --- | --- | --- |
| Source code | `app/` or `src/` | Application implementation |
| README | `README.md` | How to run, test, and operate the service |
| Documentation | `docs/index.md` + `mkdocs.yml` | TechDocs / ownership context |
| Catalog entity | `catalog-info.yaml` | Backstage Software Catalog registration |
| Container | `Dockerfile` | Reproducible runtime image |
| Local compose | `docker-compose.yml` | Local run without Kubernetes |
| Tests | `tests/` or `src/**/*.test.ts` | Deterministic unit tests |
| CI pipeline | `.github/workflows/ci.yml` | PR quality gate |
| Ignore rules | `.gitignore` | Keep secrets and build output out of git |
| Version | project manifest + health payload | Predictable version reporting |

## Required runtime behavior

Every generated service MUST expose:

```
GET /health
```

Response:

```json
{
  "status": "UP",
  "service": "<service-name>",
  "version": "1.0.0"
}
```

`service` MUST match the component name entered in the template.
`version` MUST match the version recorded in the project manifest and
`catalog-info.yaml`.

## Required catalog metadata

`catalog-info.yaml` MUST describe a Backstage `Component` with:

- `metadata.name`
- `metadata.title`
- `metadata.description`
- `metadata.tags`
- `metadata.annotations.github.com/project-slug`
- `metadata.annotations.backstage.io/techdocs-ref`
- `metadata.annotations.dataprod.platform/kind: data-product`
- `metadata.annotations.dataprod.platform/version`
- `metadata.annotations.dataprod.platform/domain`
- `metadata.annotations.dataprod.platform/certification-status`
- `spec.type: data-product`
- `spec.lifecycle`
- `spec.owner`
- `spec.system`
- `spec.dependsOn` (array, may be empty)

Certification status MUST be one of:

- `DEVELOPMENT`
- `TESTED`
- `CERTIFIED`

This is platform technical certification only. It is not GxP, regulatory,
or legal validation.

## Required CI pipeline

Pull Request and `main` pushes MUST run:

1. Lint
2. Unit tests
3. Build
4. Docker build
5. Security scan
6. Success

Kubernetes, cloud deploy, and release promotion are out of scope for MVP.

## Predictable repository layout

```text
<service>/
├── catalog-info.yaml
├── README.md
├── Dockerfile
├── docker-compose.yml
├── mkdocs.yml
├── docs/index.md
├── src/
├── tests/            # or colocated *.test.ts for Node
└── .github/workflows/ci.yml
```

## Data Product fields

Templates collect and persist the following Data Product fields:

- name
- description
- owner
- version
- lifecycle
- domain
- source systems
- interfaces / APIs
- data contracts
- dependencies
- documentation
- repository
- deployment information

Backstage `Component` remains the catalog kind. Data Product is a
documented extension via `spec.type` and `dataprod.platform/*`
annotations. Data contracts are Catalog `API` entities. Topology uses
native `providesApis`, `consumesApis`, and `dependsOn` relations.

Official Data Product templates have a stricter contract:
[Data Product Template Standard](data-product-template-standard.md).
That standard does not apply to the Python Microservice general service
template.
