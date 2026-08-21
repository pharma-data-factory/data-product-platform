# Keep Core Systems Standard

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

> **KEEP CORE SYSTEMS STANDARD.  
> INNOVATE THROUGH DATA PRODUCTS.**

ERP, MES, LIMS, EWM, Historian, CMO platforms, and other IT/OT remain
**systems of record** and operational platforms. Do not customize them
into an unbounded integration layer. Do not treat Pharma Data Factory as
a replacement for those systems.

## Four roles

| Role | What it is | What it is not |
| --- | --- | --- |
| **System of Record** | Authoritative operational system (ERP, MES, LIMS, EWM, Historian, CMO, other IT/OT) | A Data Product, a consumer app, or the Control Plane |
| **Data Product** | Independently evolving digital capability around a governed interface | A copy of the source database or a second system of record |
| **Pharma Data Factory Control Plane** | Engineering, catalog, identity, Marketplace, TechDocs, Search, certification | The runtime that stores all enterprise data |
| **Consumer** | Application, dashboard, or another Data Product that binds to a contract | Direct access to source-system internals |

## System of Record vs Data Product

Systems of record own operational truth and process execution.

Data Products subscribe to or fetch **governed interfaces** (API, events,
MQTT, REST, files/streams). They validate a Data Contract, apply quality
rules, store product-owned data, and publish a consumer API.

Do not connect Data Products to production databases of ERP/MES/LIMS.

Public explanation: `/platform/architecture`. Internal detail:
[Platform Architecture](../architecture/platform.md).
