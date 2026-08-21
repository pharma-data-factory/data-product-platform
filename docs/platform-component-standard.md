# Platform Component Standard

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Canonical engineering page for reusable Platform Components. Product
summary: [Component Standard](platform-components/component-standard.md).

A Platform Component must declare, where applicable:

- version (SemVer)
- owner
- documentation
- configuration contract (no secrets)
- tests
- health behavior (only if the component has a process to probe)
- error behavior
- security configuration
- observability
- compatibility with the Data Product Standard
- Docker support (only if the component ships a runtime)
- example usage
- release notes

Not every component exposes HTTP endpoints. Do not force REST semantics
onto Kafka, storage, or similar building blocks.

CERTIFIED means technical conformance to this standard. It is not GxP
validation. Use the [Certification Checklist](platform-components/certification-checklist.md)
before setting `dataprod.platform/certification-status: CERTIFIED`.
