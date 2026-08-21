# Deployment models

Pharma Data Factory supports one current deployment shape and two future
commercial deployment models. This document is architecture guidance. It
does not add Kubernetes, AWS production, or multi-tenant runtime.

## Current deployment

Single organization. One Control Plane. Existing Backstage identity and
RBAC. Configured capabilities are treated as entitled.

```text
Customer / operator
        │
        v
Pharma Data Factory Control Plane (Backstage)
        │
        ├── Identity / RBAC
        ├── Marketplace (technical catalog)
        ├── Golden Paths
        ├── Data Product Catalog
        └── GitHub App publishing
                │
                v
        Customer GitHub repositories + GitHub Actions
```

## Template Edition

For organizations that already operate their own engineering platform.

```text
AWS Marketplace          (future procurement source)
        │
        v
Customer entitlement
        │
        v
Template / package
        │
        v
Customer GitHub / Customer AWS
```

What ships today: certified Golden Path templates that generate
independent repositories. Designed for future AWS Marketplace
distribution; not listed.

## Platform Edition

A complete Control Plane in the customer's cloud. Planned, not a GA SKU.

```text
Customer Cloud
        │
        v
Pharma Data Factory Control Plane
        │
        ├── Customer Identity Provider
        ├── Customer GitHub
        └── Customer Data Products
```

The current MVP Control Plane is the architectural prototype for this
edition. Customer IdP beyond GitHub OAuth, production cloud packaging,
and annual license enforcement are not implemented.

## SaaS Edition

Fully managed Pharma Data Factory. Future only.

```text
Managed Pharma Data Factory
        │
        v
Organization Context
        │
        ├── Customer SSO
        ├── Entitlements
        └── Tenant-isolated platform resources
```

Do not imply this is available. There is no tenant isolation, no
customer-organization switcher, and no managed operations plane.

## What must not change

Golden Paths remain independently runnable Data Products. Deployment
edition must not couple generated services to the Control Plane.
