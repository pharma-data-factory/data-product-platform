# Compatibility Matrix

Simple compatibility model for Data Product Standard `1.0.x`.

No dependency-resolution service is required. This document and the
matching backend model are the source of truth.

## Standard 1.0.x

Compatible with:

| Artifact | Compatible versions |
| --- | --- |
| Data Product SDK | `1.x` |
| MQTT Temperature Data Product template | `1.x` |
| REST Equipment Data Product template | `1.x` |

## Rules

- A generated Data Product that reports standard `1.0.x` must vendor SDK `1.x`.
- Official `1.x` templates must generate standard `1.0.x` artifacts.
- Contract versions are independent (MQTT temperature-event `1.1.0`, REST
  equipment-event `1.0.0`) and follow the same SemVer rules as
  [versioning-policy.md](versioning-policy.md).

## Out of scope

Do not introduce a package registry, Kubernetes, Kafka, Neo4j, SAP,
Snowflake, billing, or multi-tenancy to express these relationships.
