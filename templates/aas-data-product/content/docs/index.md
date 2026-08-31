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

| Standard | Title | Version |
|----------|-------|---------|
| **IEC 63278-1** | Asset Administration Shell Structure | 2024 |
| **IDTA-01001** | AAS Metamodel | 3.0 |
| **IDTA-01002** | AAS REST API | 3.0 |
| **IDTA-01005** | AASX Package Format | 3.0 |

## Key Features

✅ **IDTA-01001 v3.0 Compliant** — Full metamodel support  
✅ **Multi-Source Ingestion** — MQTT, REST, file-based asset data  
✅ **Automated Validation** — JSON Schema data contracts  
✅ **REST API** — IDTA-01002 v3.0 compatible endpoints  
✅ **Discovery** — Asset registry and submodel queries  
✅ **Quality Assurance** — Automated quality checks and metrics  
✅ **Docker & CI/CD** — Production-ready deployment  
✅ **Observability** — Health checks, metrics, logging  

## Getting Started

### 1. Quick Start
[→ 5-minute quickstart guide](getting-started/quickstart.md)

### 2. Understand Architecture
[→ Architecture overview](getting-started/architecture.md)

### 3. API Reference
[→ Complete API documentation](user-guide/api-reference.md)

### 4. Ingest Your First Asset
[→ Ingest asset events](user-guide/api-reference.md#ingest-asset-event)

## Platform Component

AAS is a **Platform Component** (not a Golden Path Data Product):

```yaml
kind: Component
spec:
  type: platform-component
  category: asset-semantic
  dependsOn: [health, observability, rest-api]
```

Downstream Data Products depend on AAS:

```yaml
dependsOn:
  - component:default/aas-foundation
```

## Example: Ingest an Asset

```bash
curl -X POST http://localhost:8080/api/v1/assets \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'
```

**Response:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "asset_id": "pump-unit-001",
  "asset_ref": "http://pharma-data-factory/aas/pump-unit-001",
  "status": "stored",
  "timestamp": "2026-08-24T14:30:00Z"
}
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
  "metadata": "object",          // Optional: version, contentType, encoding
  "context": "object"            // Optional: business context
}
```

[→ Full contract documentation](user-guide/data-contract.md)

## Next Steps

- [Configure your environment](user-guide/configuration.md)
- [Deploy locally or in Docker](getting-started/quickstart.md)
- [Learn the API](user-guide/api-reference.md)
- [Understand quality gates](user-guide/quality.md)
- [Explore the specification](reference/aas-specification.md)

## References

- **Official AAS Spec**: https://industrialdigitaltwin.io/aas-specifications/
- **IEC 63278**: https://webstore.iec.ch/en/publication/65628
- **IDTA**: https://industrialdigitaltwin.org/
- **Eclipse BaSyx**: https://basyx.org/

## Support

- **Platform Team**: platform@pharma-data-factory.local
- **Issues**: https://github.com/pharma-data-factory/${{ values.name }}/issues
- **Documentation**: https://docs.pharma-data-factory.local

---

**Certified Golden Path Template** · Nexora 2026
