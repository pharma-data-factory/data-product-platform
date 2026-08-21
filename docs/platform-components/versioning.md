# Component Versioning

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Platform Components use the same SemVer policy as the rest of the
platform. Do not create a second version scheme.

| Change | Version |
| --- | --- |
| Bug fix | PATCH |
| Backward-compatible capability | MINOR |
| Breaking component contract | MAJOR |

Example: Kafka Consumer `1.0.0`, REST API `1.2.0`, Observability `1.0.0`.

Compatibility with the Data Product Standard is declared on the component
(`1.x` in this phase). Composition manifests constrain component versions
the same way (`1.x`, exact, or `*`).

See [versioning policy](../versioning-policy.md) and
[engineering versioning](../engineering/versioning.md).
