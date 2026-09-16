# Nexora Target Architecture

## Layering

```text
NEXORA EXPERIENCE
  Marketplace | Product Studio | Develop | Govern | Operate
                         |
NEXORA DOMAIN SERVICES
  Product Registry
  Artifact Registry
  Publisher Registry
  Composition Engine
  Data Contract / Dependency / Lineage
  Requirements / URS
  Validation / Evidence / Release
                         |
BACKSTAGE KERNEL
  Catalog | Scaffolder | Identity | Permissions | Search | Docs
                         |
PROVIDERS
  GitHub/GitLab | AI Providers | Analytics | Data Exchange | Runtime
```

## Core domain
The target shared domain converges on Product, ProductVersion, Artifact, ArtifactVersion, Publisher, ProductDependency, DataContract, ProductBaseline and ValidationContext.

Do not duplicate existing equivalent concepts. Extend and consolidate.

## Product vs Artifact
A Product is something developed, versioned, operated and released.

An Artifact is a reusable, versioned building block discovered and reused through Marketplace.

A Product may depend on exact Artifact and DataContract versions.

## Dependency semantics
ProductDependency supports at least INSTALLATION, SUBSCRIPTION, DATA_CONSUMPTION and API_CONSUMPTION.

## Source of truth
Backstage Catalog remains the topology/discovery layer.

Nexora domain stores remain authoritative for Nexora lifecycle data.

GitHub is a source provider, not the Product or Artifact identity model.

## Migration architecture
Legacy implementation → Compatibility Adapter → New Domain Model → Parity Verification → Consumer Migration → Legacy Removal.

Never remove working legacy behavior before parity is proven.
