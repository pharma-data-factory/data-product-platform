# Component Standard

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Minimum requirements for a reusable Platform Component. Also published as
[docs/platform-component-standard.md](../platform-component-standard.md).

## Required where applicable

| Requirement | Notes |
| --- | --- |
| Version | SemVer. PATCH / MINOR / MAJOR follow the platform versioning policy. |
| Owner | Catalog `spec.owner` |
| Documentation | TechDocs or Catalog documentation link |
| Configuration contract | Environment variables / files. No customer secrets in the composition. |
| Tests | Unit tests for the component contract |
| Health behavior | Only if the component has a running process |
| Error behavior | Documented failure modes |
| Security configuration | Least privilege, no hardcoded credentials |
| Observability | Logs/metrics as applicable |
| Compatibility declaration | `dataprod.platform/compatible-standard-versions` |
| Docker support | Only if a runtime image exists |
| Example usage | How a Golden Path composes the component |
| Release notes | On MINOR/MAJOR changes |

## What this standard is not

- Not GxP validation
- Not regulatory approval
- Not a Data Product Standard
- Not an HTTP-only API spec

Kafka, storage, and similar components may have no REST surface.
