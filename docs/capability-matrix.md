# Product capability matrix

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PLATFORM USER  
Version: MVP 1.0

Authoritative mapping of what the running product is. Marketplace, Developer
Hub, Catalog, and this matrix must use the same terms.

Do not collapse implementation, release, commercial, and validation
status. See [Status model](status-model.md) and
[MVP 1.0 baseline](mvp-1.0-baseline.md).

CERTIFIED means technical conformance to the Pharma Data Factory standard.
It is not GxP, commercial approval, or an AWS Marketplace listing.

| Capability | Class | Implementation / release | Commercial | Notes |
| --- | --- | --- | --- | --- |
| MQTT Temperature | Official Data Product Golden Path | CERTIFIED / RELEASED | AVAILABLE (internal) | Marketplace Create |
| REST Equipment | Official Data Product Golden Path | CERTIFIED / RELEASED | AVAILABLE (internal; AWS test SKU only) | Marketplace Create |
| OEE Data Product | Official Data Product Golden Path | CERTIFIED / RELEASED | **FUTURE** | Marketplace Create technically; not a commercial SKU |
| Python Microservice | General service template | TESTED | n/a | Not a Data Product Golden Path |
| Node.js Microservice | General service template | TESTED | n/a | Not a Data Product Golden Path |
| MQTT Connector | Connector template | DEVELOPMENT | n/a | Not an official Golden Path |
| Machine State Consumer | Composition / reference proof | TESTED | n/a | Not an official RELEASED Golden Path |
| Unified Namespace | Platform Component | DEVELOPMENT | n/a | Canonical runtime: `uns/` |
| Wave 1 Platform Components | Certified reusable libraries | CERTIFIED 1.0.0 | n/a | Health, Observability, REST API, REST Source, MQTT Consumer, Time-Series |
| Machine Metrics | Composition proof | TESTED | n/a | Proves Wave 1 composition |
| AAS Foundation | Platform Component | DEVELOPMENT / PROTOTYPE UI | n/a | Control Plane adapter is in-memory |
| Kafka / RAG / Knowledge Graph | Placeholders | PLANNED / FUTURE | n/a | Not implemented |
| Template Edition | Commercial edition | n/a | AVAILABLE FOR PILOT | Not commercially distributable while legal gates are OPEN |
| Platform Edition | Commercial edition | n/a | PLANNED | |
| SaaS Edition | Commercial edition | n/a | FUTURE | |

OEE FUTURE commercial status does **not** mean OEE is unimplemented.
OEE CERTIFIED does **not** mean customers can buy it.

## Source of truth

| Concern | Source |
| --- | --- |
| Technical entity state | Catalog |
| Golden Path release / certification of official paths | `catalog/releases` / `golden-path-releases.json` |
| Marketplace presentation | Curated static list, enriched from Catalog and release metadata |
| Commercial SKU mapping | `config/commercial-products.yaml` |
| Instance certification write | Catalog annotation, with MVP file overlay documented in [source of truth](engineering/source-of-truth.md) |

## Composition honesty

Wave 1 Platform Components are certified reusable libraries.

MQTT Temperature and REST Equipment currently predate full component
composition. They contain equivalent runtime capabilities and are **not**
refactored in this freeze to import those libraries.

Machine Metrics proves Wave 1 component composition. OEE Data Product
composes the same CERTIFIED 1.x libraries; OEE formulas stay in the
generated Data Product, not in those components.

Post-pilot architecture improvement: refactor MQTT Temperature and REST
Equipment onto the Wave 1 libraries without changing product contracts.
