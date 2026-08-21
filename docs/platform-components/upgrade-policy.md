# Component Upgrade Policy

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Platform Components follow the same SemVer policy as the rest of the
platform. Do not create a second version scheme.

| Change | Version | Composition impact |
| --- | --- | --- |
| Bug fix, docs, certification metadata | PATCH | Compatible. Consumers should upgrade. |
| Backward-compatible capability | MINOR | Compatible on the declared standard range (`1.x`). |
| Breaking configuration, API, or payload contract | MAJOR | Consumers must update. Composition manifests pin the new major. |

Compatible Data Product Standard is declared on the Catalog entity
(`dataprod.platform/compatible-standard-versions`). Wave 1 components
declare `1.x`.

Rules:

- CERTIFIED components keep that status across PATCH when tests and the
  checklist still pass.
- A breaking MAJOR returns to TESTED until the checklist is re-run.
- Deprecated components must not be used in new compositions.
- Existing Golden Path runtimes (Python Microservice, MQTT Temperature,
  REST Equipment) are not auto-migrated onto new component versions.

See [Component Versioning](versioning.md) and
[versioning policy](../versioning-policy.md).
