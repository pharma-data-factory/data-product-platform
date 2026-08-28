# AAS Asset Administration Shell Data Product

## Welcome

This is the **AAS Asset Administration Shell Data Product** — an IDTA-01001 v3.0 compliant asset registry and data ingestion service for manufacturing organizations.

**Domain:** Manufacturing, asset management, semantic integration  
**Status:** CERTIFIED (DEVELOPMENT lifecycle)  
**Specification:** IEC 63278 / IDTA-01001 v3.0

## What is AAS?

The **Asset Administration Shell (AAS)** is a standardized, vendor-neutral digital representation of manufacturing assets and equipment. It provides:

- **Semantic Standardization**: Uniform asset metadata and relationships
- **Interoperability**: Vendor-independent data exchange
- **Extensibility**: Submodels for domain-specific properties
- **Lifecycle Support**: Asset tracking from creation to end-of-life

### Standards

| Standard | Title | Version | Source |
|----------|-------|---------|--------|
| **IEC 63278-1:2024** | Asset Administration Shell Structure | 2024 | [IEC](https://webstore.iec.ch/en/publication/65628) |
| **IDTA-01001 v3.0** | AAS Metamodel Specification | 3.0 | [IDTA](https://industrialdigitaltwin.org/) |
| **IDTA-01002 v3.0** | AAS REST API Specification | 3.0 | [IDTA](https://industrialdigitaltwin.org/) |
| **IDTA-01005 v3.0** | AASX Package Format | 3.0 | [IDTA](https://industrialdigitaltwin.org/) |

**Standards & Compliance Notice:**

- **IEC 63278-1:2024** © International Electrotechnical Commission. All rights reserved. See [IEC Website](https://www.iec.ch/).
- **IDTA Specifications** © Industrial Digital Twin Association. Published under open standards. See [IDTA Website](https://industrialdigitaltwin.org/).
- **Eclipse BaSyx** © Fraunhofer Institute. Open-source under Apache 2.0 license. See [BaSyx GitHub](https://github.com/eclipse-basyx/basyx-java-sdk).

This implementation conforms to publicly available specifications. No proprietary or licensed content is embedded.

## Key Features

✅ **IDTA-01001 v3.0 Compliant** — Full metamodel support  
✅ **Multi-Source Ingestion** — MQTT, REST, file-based asset data  
✅ **Automated Validation** — JSON Schema data contracts  
✅ **REST API** — IDTA-01002 v3.0 compatible endpoints  
✅ **Discovery** — Asset registry and submodel queries  
✅ **Quality Assurance** — Automated quality checks and metrics  
✅ **Docker & CI/CD** — Production-ready deployment  
✅ **Observability** — Health checks, metrics, logging  

## Golden Path Features

This is an **Official Data Product Golden Path** that generates:

- ✅ **Data Product Repository** — Independent GitHub repository
- ✅ **FastAPI Service** — Production-ready microservice
- ✅ **Asset-Event Contract** — IDTA-01001 v3.0 compliant JSON Schema
- ✅ **Quality Checks** — Automated schema validation
- ✅ **CI/CD Pipeline** — GitHub Actions for test, build, and deploy
- ✅ **Docker Build** — Multi-stage containerization
- ✅ **Catalog Registration** — Backstage component metadata
- ✅ **TechDocs** — Full documentation site per generated product

## Getting Started

### 1. Create a New AAS Data Product
Click **"Create"** in Backstage Marketplace:
1. Fill in Data Product Name (e.g., `pharma-assets-registry`)
2. Select Asset Source (MQTT, REST, or file)
3. Configure endpoint or topic
4. Choose GitHub repository

### 2. What You'll Get
- A ready-to-run FastAPI service
- Pre-configured asset event ingestion
- Health checks and observability
- Automated GitHub Actions CI/CD
- Docker image build pipeline
- Full test suite (pytest)
- TechDocs documentation site
- Backstage Catalog registration

### 3. Deploy Locally
```bash
cd pharma-assets-registry
docker-compose up
```

### 4. Ingest Your First Asset
```bash
curl -X POST http://localhost:8080/api/v1/assets \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "assetId": "pump-unit-001",
    "timestamp": "2026-08-24T14:30:00Z",
    "assetType": "equipment",
    "submodelElements": {
      "manufacturer": "Bosch Rexroth",
      "status": "operational"
    }
  }'
```

## Data Contract

All assets must conform to the **asset-event.schema.json** contract:

```json
{
  "eventId": "string",           // Unique event ID
  "assetId": "string",           // Unique asset ID  
  "timestamp": "ISO 8601",       // UTC timestamp
  "assetType": "enum",           // equipment, sensor, component, product, facility, other
  "submodelElements": "object",  // IDTA-01001 properties
  "sourceSystem": "string",      // MQTT, REST, SAP, etc.
  "metadata": "object",          // Optional
  "context": "object"            // Optional
}
```

## API Reference

### Health Check
```
GET /health
```

### Ingest Asset
```
POST /api/v1/assets
Content-Type: application/json
```

### List Assets
```
GET /api/v1/assets?assetType=equipment
```

### Get Asset
```
GET /api/v1/assets/{assetId}
```

### Quality Status
```
GET /quality
```

## Platform Component

AAS is both:

1. **Platform Component** — Reusable foundation for downstream products
2. **Golden Path Data Product** — Standalone template for asset registries

Downstream Data Products (MQTT Temperature, REST Equipment, OEE) can depend on AAS for semantic asset enrichment.

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **Official Spec**: https://industrialdigitaltwin.io/
- **IEC 63278**: https://webstore.iec.ch/
- **IDTA**: https://industrialdigitaltwin.org/
- **Eclipse BaSyx**: https://basyx.org/

---

**Certified Golden Path Template** · Pharma Data Factory 2026  
**IEC 63278-1:2024 · IDTA-01001 v3.0 · IDTA-01002 v3.0**
