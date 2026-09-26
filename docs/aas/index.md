# Asset Administration Shell (AAS) — Public Documentation

> Standardized digital representation of manufacturing assets.  
> **Status:** **DEVELOPMENT** — the Control Plane adapter is an in-memory
> prototype (`plugins/aas-backend/src/repository.ts` stores assets in a
> `Map`) and `templates/aas-asset` publishes and registers nothing.
> Corrected 2026-09-26; this header previously read "CERTIFIED (Wave 2
> Technical Baseline)". Authoritative status:
> [subsystem status](../subsystem-status.md).  
> **Standards:** IEC 63278-1:2024 / IDTA-01001 v3.0 — the model is
> implemented against these; conformance is not certified.

---

## What is AAS?

The **Asset Administration Shell** is a standardized, vendor-neutral digital twin representation of manufacturing equipment, products, and infrastructure.

### Nexora AAS Implementation

**Wave 2 — DEVELOPMENT.** What the implementation covers:

- **IEC 63278-1:2024** metamodel implemented
- **IDTA-01001 v3.0** metamodel implemented
- **IDTA-01002 v3.0** REST API implemented
- Multi-source ingestion (MQTT, REST)
- Asset registry & discovery — **in memory**, not persisted
- Quality assurance & metrics
- Docker deployment of the Control Plane

The check marks were removed with the status correction: they read as
certification against the standards named beside them, which has not been
performed.

---

## Key Resources

### Understanding AAS

- [AAS Specification Overview](aas-specification.md) — What AAS is, why it matters
- [Submodels](submodels.md) and [Semantic IDs](semantic-ids.md) — asset types,
  submodel elements and their identification
- [Data Contracts](contracts.md) — Asset Event Schema v1.0.0
- [Quality Checks](quality.md) — Automated validation rules

### Using AAS

- [Connectivity](connectivity.md) — ingesting asset data over MQTT and REST
- [Using AAS from a Data Product](using-from-data-product.md) — integration patterns
- [Administration](administration.md) — managing the asset registry
- [AAS vs Catalog](vs-catalog.md) and [AAS vs UNS](vs-uns.md) — when to use which

### Operations & Deployment

- [Deployment](../deployment/docker-production.md) — running the Control Plane

> **Not written.** An API reference, a dedicated ingestion guide, a discovery
> guide, a troubleshooting page and an FAQ were linked here and never existed.
> The AAS Control Plane adapter is **DEVELOPMENT** (in-memory prototype) per
> [subsystem status](../subsystem-status.md); the pages will be written when
> it is more than that. Endpoints are defined in
> `plugins/aas-backend/src/router.ts`.

### Golden Path Template

- [Golden Path Quickstart](../aas-golden-path-implementation.md) — Template-specific guide
- [Subsystem status](../subsystem-status.md) — current AAS implementation status

---

## Compliance & Standards

| Standard                     | Version | Compliance         |
| ---------------------------- | ------- | ------------------ |
| **IEC 63278-1**              | 2024    | ✅ Fully compliant |
| **IDTA-01001** (Metamodel)   | 3.0     | ✅ Full support    |
| **IDTA-01002** (REST API)    | 3.0     | ✅ Full support    |
| **IDTA-01005** (AASX Format) | 3.0     | 🔜 Phase 2 roadmap |

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

- [Nexora Vision](../vision/NEXORA_VISION.md) — product overview
  (replaces the never-written `PRODUCT.md`)
- [Architecture](../architecture.md) and
  [Target Operating Model](../architecture/TARGET_OPERATING_MODEL.md) — system
  architecture (replace the never-written `ARCHITECTURE.md`)
- [ROADMAP.md](../../ROADMAP.md) — Release roadmap

**Questions?**

- Platform Team: platform@pharma-data-factory.local
- Issues: https://github.com/pharma-data-factory/
- Documentation: https://docs.pharma-data-factory.local

---

**Wave 2 Technical Baseline — Nexora 2026**
