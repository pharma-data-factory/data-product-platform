# Asset Administration Shell (AAS) — Public Documentation

> Standardized digital representation of manufacturing assets.  
> **Status:** CERTIFIED (Wave 2 Technical Baseline)  
> **Standards:** IEC 63278-1:2024 / IDTA-01001 v3.0  

---

## What is AAS?

The **Asset Administration Shell** is a standardized, vendor-neutral digital twin representation of manufacturing equipment, products, and infrastructure.

### Nexora AAS Implementation

**Wave 2 Certified Golden Path**

- **IEC 63278-1:2024** compliance ✅
- **IDTA-01001 v3.0** metamodel ✅
- **IDTA-01002 v3.0** REST API ✅
- Multi-source ingestion (MQTT, REST) ✅
- Asset registry & discovery ✅
- Quality assurance & metrics ✅
- Production-ready Docker deployment ✅

---

## Key Resources

### Understanding AAS

- [AAS Specification Overview](aas-specification.md) — What AAS is, why it matters
- [Domain Model](domain-model.md) — Asset types, submodel elements, lifecycles
- [Data Contracts](contracts.md) — Asset Event Schema v1.0.0
- [Quality Checks](quality.md) — Automated validation rules

### Using AAS

- [API Reference](api-reference.md) — Endpoints and examples
- [Asset Ingestion Guide](ingestion.md) — How to ingest asset data
- [Asset Discovery](discovery.md) — Querying and filtering assets
- [Integration Patterns](integration.md) — Connecting with other data products

### Operations & Deployment

- [Deployment Guide](deployment.md) — Docker, Kubernetes, cloud
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
- [FAQ](faq.md) — Frequently asked questions

### Golden Path Template

- [Golden Path Quickstart](../aas-golden-path-implementation.md) — Template-specific guide
- [Template Marketplace](../capability-matrix.md#aas-asset-administration-shell) — Create data products from template

---

## Compliance & Standards

| Standard | Version | Compliance |
|----------|---------|------------|
| **IEC 63278-1** | 2024 | ✅ Fully compliant |
| **IDTA-01001** (Metamodel) | 3.0 | ✅ Full support |
| **IDTA-01002** (REST API) | 3.0 | ✅ Full support |
| **IDTA-01005** (AASX Format) | 3.0 | 🔜 Phase 2 roadmap |

---

## Quick Example

### Ingest an Asset

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

### Query Assets

```bash
# List all equipment
curl "http://localhost:8080/api/v1/assets?assetType=equipment"

# Retrieve specific asset
curl "http://localhost:8080/api/v1/assets/pump-unit-001"

# Get submodel elements
curl "http://localhost:8080/api/v1/assets/pump-unit-001/submodels"
```

### Check Quality

```bash
# Validate asset event
curl -X POST http://localhost:8080/api/v1/quality \
  -H "Content-Type: application/json" \
  -d '{ "eventId": "...", "assetId": "...", ... }'

# Retrieve quality metrics
curl "http://localhost:8080/api/v1/quality"
```

---

## Integration with Other Golden Paths

AAS is a foundational Platform Component that downstream data products can depend on:

### MQTT Temperature Data Product
```yaml
dependsOn:
  - component:default/aas-foundation
# Can enrich temperature events with equipment metadata
```

### REST Equipment Data Product
```yaml
dependsOn:
  - component:default/aas-foundation
# Can query equipment hierarchy and classification
```

### OEE Data Product
```yaml
dependsOn:
  - component:default/aas-foundation
# Can contextualize OEE calculations with asset lifecycle
```

---

## Creating an AAS Data Product

Use the **Marketplace** to create a new asset registry:

1. Open **Backstage** → **Create**
2. Select **"AAS Asset Administration Shell Data Product"**
3. Configure:
   - Data Product Name (e.g., `equipment-registry-plant-1`)
   - Description
   - Owner (Team)
   - Asset Source (MQTT, REST, or File)
   - GitHub repository name
4. **Create** — Repository generated with full CI/CD

Result:
- GitHub repository in `pharma-data-factory` org
- Automatic catalog registration
- CI/CD pipeline configured
- TechDocs published

---

## Roadmap

### Wave 2 (NOW) ✅
- AAS Golden Path Template (CERTIFIED)
- IDTA-01001 v3.0 compliance
- Multi-source ingestion
- Quality assurance
- REST API

### Phase 2 (PLANNED) 🔜
- AASX Package File Format (.aasx)
- Advanced submodel types
- Asset versioning
- Lifecycle management
- Knowledge graph integration

### Phase 3+ (FUTURE) 🔮
- GxP validation
- Multi-site federation
- Real-time synchronization
- Predictive maintenance
- Product genealogy

---

## Support & References

**Official Standards:**
- [IEC 63278-1:2024](https://webstore.iec.ch/en/publication/65628) — Asset Administration Shell Structure
- [IDTA Specifications](https://industrialdigitaltwin.io/aas-specifications/) — Complete AAS documentation
- [Eclipse BaSyx](https://basyx.org/) — Open-source AAS runtime

**Platform Documentation:**
- [PRODUCT.md](../../PRODUCT.md) — Product overview
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — System architecture
- [ROADMAP.md](../../ROADMAP.md) — Release roadmap

**Questions?**
- Platform Team: platform@pharma-data-factory.local
- Issues: https://github.com/pharma-data-factory/
- Documentation: https://docs.pharma-data-factory.local

---

**Wave 2 Technical Baseline — Nexora 2026**
