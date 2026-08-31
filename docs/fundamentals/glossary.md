# Glossary

Owner: Platform Team
Documentation Version: 1.0
Applicable Platform: Data Product Standard 1.0.x
Last Reviewed: 2026-08
Audience: PLATFORM USER

Shared vocabulary for the Nexora control plane.

## Core concepts

| Term | Definition |
| --- | --- |
| **Data Product** | A governed, independently versioned service that exposes a domain capability around a system of record (ERP, MES, LIMS, …). |
| **Golden Path** | A reviewed, certified template that generates a complete Data Product repository (source, tests, CI, Docker, contract, catalog-info). |
| **Control Plane** | The Nexora portal (Backstage) that discovers, creates, delivers, and operates Data Products. |
| **Data Plane** | The generated Data Products and their runtime infrastructure, running independently of the Control Plane. |
| **System of Record** | The authoritative source system (ERP, MES, LIMS, EWM, historian) that the Control Plane does not replace. |
| **Platform Component** | A governed, reusable technical building block (REST API, MQTT Consumer, Time-Series Storage, …) used inside Data Products and Golden Paths. |
| **Unified Namespace (UNS)** | A convention for MQTT topic naming and event envelopes that gives operational data a consistent address space. |
| **Asset Administration Shell (AAS)** | A standardized digital-twin model for assets and sensors (administration, submodels, semantic IDs). |
| **Data Contract** | A versioned specification of the API and events a Data Product provides or consumes. |
| **OEE** | Overall Equipment Effectiveness — the first industrial domain model (availability × performance × quality). |
| **Catalog** | Backstage Catalog — the registry of entities (components, APIs, users, groups) that makes the platform discoverable. |
| **TechDocs** | The documentation system that publishes the `docs/` markdown as versioned pages. |
| **Scaffolder** | The Backstage feature that executes Golden Path templates and publishes repositories via the GitHub App. |
| **CERTIFIED** | A Golden Path or Platform Component conforms to Data Product Standard 1.0.x. Not GxP validation. |
| **Composer** | The UI that assembles a new Data Product from Platform Components (design-first route). |
| **URS** | User Requirements Specification — captured in the URS Composer and baselined immutably. |
| **RBAC** | Role-based access control via Catalog Users/Groups and the Permission Framework. |
| **Entitlement** | A commercial right (edition, marketplace listing) tracked separately from RBAC. |

## See also

- [What is Nexora?](data-products.md)
- [System of Record vs Data Product](system-of-record.md)
- [Control Plane vs Data Plane](control-plane.md)
