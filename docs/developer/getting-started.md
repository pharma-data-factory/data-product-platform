# Getting started

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING / PLATFORM USER

Canonical first-day steps: [Developer Quick Start](quick-start.md).
This page is the longer platform introduction. Do not duplicate the
Quick Start command list here.

## Platform introduction

Nexora is the Control Plane for manufacturing Data Products.
Backstage is the framework. The product experience is Marketplace, Create,
Catalog, Data Products, TechDocs, Search, and Platform Components.

Keep core systems standard. Innovate through Data Products. Reusable
building blocks live at `/platform-components`. They are not Data Products.

## Developer prerequisites

- Approved Catalog User in `data-product-developers`, `data-product-owners`,
  or `platform-admins`
- GitHub login for the portal (`AUTH_GITHUB_*`)
- GitHub App installed on `pharma-data-factory` for repository publishing
- Python 3.12+, Docker, and Git for local Data Product work

Viewers can browse. They cannot create Data Products.

## Local environment setup

See [local-development.md](local-development.md) and
[GitHub setup](../github-setup.md).

## GitHub setup

Portal login and GitHub App publishing are separate credentials. See
[identity and RBAC](../identity-and-rbac.md).

## Create your first Data Product

Follow [Build Your First Data Product](first-data-product.md). The
reference Golden Path is MQTT Temperature. REST Equipment is the second
certified path.
