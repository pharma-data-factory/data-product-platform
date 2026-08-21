# Control Plane vs Data Plane

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

## Control Plane

Pharma Data Factory (Backstage) is the Control Plane:

- Identity and RBAC
- Marketplace / Golden Paths
- Create and GitHub publishing
- Software Catalog
- TechDocs
- Search
- Platform Compliance, CI Quality Gate display, certification

The Control Plane does not run MQTT ingestion or equipment REST sync.

## Data Plane

A generated Data Product is the Data Plane. It must run without Backstage:

- ingest from a governed interface
- validate the contract
- apply quality rules
- store product-owned records
- serve `/health` and the product API

See [Data Product Architecture](../architecture/data-product.md) and
[architecture.md](../architecture.md).
