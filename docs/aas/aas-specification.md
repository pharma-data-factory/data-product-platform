# AAS Specification Overview

**Status:** CERTIFIED  
**Standards:** IEC 63278-1:2024 / IDTA-01001 v3.0  
**Audience:** Technical / Architecture  

---

## What is AAS?

The **Asset Administration Shell (AAS)** is a standardized digital representation that provides uniform access to asset information and services.

### Purpose

Enable software applications to:
- **Exchange** asset information in a trusted, secure way
- **Mutually use** exchanged information across system boundaries
- **Interoperate** in a vendor-neutral manner
- **Extend** with domain-specific submodels

### Scope

Applies to:
- Any type of industrial process (discrete, continuous, batch, hybrid)
- Any industrial sector with measurement, control, automation
- Full asset lifecycle (idea → design → production → operation → maintenance → end-of-life)
- Physical assets, digital assets, intangible entities

---

## Core Concepts

### 1. Asset

**Physical or logical entity** with business value.

Examples:
- Equipment (pump, motor, compressor)
- Sensor or device
- Component or sub-assembly
- Product
- Facility or production area

### 2. Asset Administration Shell

**Digital representation** of an asset containing:
- **Administrative data** (name, ID, version, lifecycle)
- **Semantic identity** (type, classification, relationships)
- **Submodels** (properties, capabilities, relationships)

```yaml
Asset Administration Shell:
  id: "urn:pump-unit-001"
  asset: { id: "pump-001", type: "equipment" }
  submodels:
    - IdShort: "Nameplate"
      submodelElements:
        - manufacturer: "Bosch Rexroth"
        - productType: "Centrifugal Pump"
        - serialNumber: "BR-2024-001"
    - IdShort: "OperationalData"
      submodelElements:
        - status: "operational"
        - temperature: 45.2
        - pressure: 3.5
```

### 3. Submodel

**Semantic container** for related asset properties and relationships.

Purpose:
- Group related information logically
- Enable selective access
- Support versioning
- Provide domain-specific semantics

Common Submodels:
- **Digital Nameplate** — Manufacturer, product, serial number
- **Operational Data** — Current status, measurements
- **Maintenance** — History, schedules, alerts
- **Safety** — Hazards, procedures, compliance
- **Product & Production** — Bill of materials, genealogy

### 4. Submodel Element

**Individual property** or **relationship** within a submodel.

Types:
- **Property** — Single-valued data (string, number, boolean, etc.)
- **MultiLanguageProperty** — Property in multiple languages
- **ReferenceElement** — Link to another AAS or submodel
- **RelationshipElement** — Relationship between two submodel elements
- **AnnotatedRelationshipElement** — Relationship with annotation
- **SubmodelElementCollection** — Nested collection of elements
- **File** — Reference to external file
- **Blob** — Binary large object (image, document, etc.)

---

## Architecture Layers

### 1. Control Plane (Backstage)
- Asset catalog and registry
- Marketplace and discovery
- Governance and lifecycle

### 2. Data Product Foundation (Wave 1)
- Standard interfaces (REST API, MQTT)
- Contracts and quality
- CI/CD and deployment

### 3. Platform Components (AAS Foundation)
- **AAS Repository** — Store and retrieve AAS objects
- **AAS Registry** — Discover and resolve AAS identifiers
- **Submodel Repository** — Store and query submodel elements

### 4. Golden Path Data Products (AAS)
- **Asset Ingest** — Multi-source data collection
- **Asset Query** — Discovery and filtering
- **Semantic Enrichment** — Link assets across systems

### 5. Domain Applications (Downstream)
- MQTT Temperature enrichment
- REST Equipment hierarchy
- OEE asset context

---

## Nexora Implementation

### Compliance

| Standard | Component | Status |
|----------|-----------|--------|
| **IEC 63278-1** | AAS Structure | ✅ CERTIFIED |
| **IDTA-01001 v3.0** | Metamodel | ✅ CERTIFIED |
| **IDTA-01002 v3.0** | REST API | ✅ CERTIFIED |
| **IDTA-01005 v3.0** | AASX Format | 🔜 Phase 2 |

### Supported Features

**Metamodel (v3.0):**
- ✅ Asset Administration Shell
- ✅ Submodels
- ✅ Submodel Elements (Property, Collection, Reference, Relationship)
- ✅ Constraints and validation
- ✅ Multilingual metadata

**Serialization:**
- ✅ JSON/JSON-LD
- ✅ XML
- ✅ YAML (for configuration)
- 🔜 RDF (Phase 2)
- 🔜 AASX (Phase 2)

**API (v3.0):**
- ✅ AAS Repository operations (CRUD)
- ✅ Submodel Repository operations
- ✅ Registry operations (discovery)
- ✅ Filtering and pagination
- ✅ Error handling

---

## Identifiers

### Asset ID

**Unique identifier** for the physical/logical asset.

Formats:
- **UUID:** `550e8400-e29b-41d4-a716-446655440000`
- **URN:** `urn:pharma-data-factory:equipment:pump-001`
- **DNS:** `equipment.pharma-data-factory.local/pump-001`
- **IRI:** `https://pharma-data-factory.local/equipment/pump-001`

### AAS ID (AAS Identifier)

**Unique identifier** for the digital twin shell.

Convention in Nexora:
```
http://pharma-data-factory/aas/{assetId}
```

Example:
```
http://pharma-data-factory/aas/pump-001
```

### Submodel ID

**Unique identifier** for a semantic container.

Convention:
```
http://pharma-data-factory/submodels/{submodelType}/{version}
```

Example:
```
http://pharma-data-factory/submodels/OperationalData/1.0
```

---

## Data Model

### Asset Event (IDTA-01001 v3.0)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "equipment",
  "sourceSystem": "mqtt",
  "submodelElements": {
    "manufacturer": "Bosch Rexroth",
    "serialNumber": "BR-2024-001",
    "status": "operational",
    "temperature": 45.2,
    "pressure": 3.5
  },
  "metadata": {
    "version": "1.0.0",
    "contentType": "application/json"
  },
  "context": {
    "plantId": "PLANT-DE-01",
    "productionLine": "LINE-A",
    "batch": "BATCH-2024-0815"
  }
}
```

### Quality Report

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "passed": true,
  "checks": {
    "eventId_not_empty": true,
    "assetId_not_empty": true,
    "timestamp_iso8601": true,
    "assetType_valid": true,
    "submodelElements_present": true,
    "contract_schema": true
  },
  "errors": [],
  "warnings": [],
  "timestamp": "2026-08-24T14:30:00Z",
  "contract_version": "1.0.0"
}
```

---

## Lifecycle States

### Asset States

```
Design
  ↓
Production
  ↓
Installation
  ↓
Operation
  ├─ Active
  ├─ Idle
  ├─ Maintenance
  └─ Error
  ↓
Decommission
  ↓
Disposal
```

### Data Product States

```
DEVELOPMENT   (initial, no validation)
  ↓
TESTED        (validated against contracts)
  ↓
CERTIFIED     (technical baseline certified)
  ↓
RELEASED      (production-ready)
```

---

## Integration Patterns

### 1. Asset Ingest from MQTT

```
MQTT Topic: pharma/assets/{location}/{type}/{id}
    ↓
Asset Ingestion Service
    ↓
Validation (JSON Schema)
    ↓
AAS Repository Store
    ↓
Registry Update
```

### 2. Asset Query from REST

```
GET /api/v1/assets?assetType=equipment
    ↓
Query AAS Repository
    ↓
Filter results
    ↓
Return JSON-LD
```

### 3. Submodel Enrichment

```
Downstream Data Product
    ↓
Query AAS for asset metadata
    ↓
Enrich data product event
    ↓
Send enriched event
```

---

## Security Considerations

### Authentication
- GitHub OAuth for user identity
- Service-to-service credentials (future)

### Authorization
- RBAC via Backstage Permission Framework
- Asset ownership verification
- Role-based submodel access

### Data Protection
- No credentials in AAS repository
- Encrypted sensitive submodel elements (future)
- Audit logging of asset access

---

## Performance

### Scalability Targets

| Metric | Target |
|--------|--------|
| Assets (per instance) | 100,000+ |
| Events/second | 1,000+ |
| Query latency (p95) | < 500ms |
| Ingestion latency (p95) | < 1s |
| Repository uptime | > 99.9% |

### Optimization

- SQLite for dev, PostgreSQL for production
- Indexing on asset ID, type, source system
- Caching for frequently accessed assets
- Connection pooling
- Query optimization

---

## Roadmap

### Phase 1: Foundation (NOW) ✅
- Asset ingestion (MQTT, REST)
- Basic CRUD operations
- Quality validation
- Docker deployment

### Phase 2: Advanced (PLANNED) 🔜
- AASX Package Format
- Advanced submodel types
- Asset versioning
- Lifecycle tracking
- Graph queries

### Phase 3: Intelligence (FUTURE) 🔮
- Predictive analytics
- Asset relationships
- Change propagation
- Multi-site federation

---

## References

- **IEC 63278-1:2024** — https://webstore.iec.ch/en/publication/65628
- **IDTA AAS Spec** — https://industrialdigitaltwin.io/aas-specifications/
- **Eclipse BaSyx** — https://basyx.org/
- **Related Standards** — ISO/IEC 21823 (Interoperability)

---

**Wave 2 Technical Baseline — Nexora 2026**
