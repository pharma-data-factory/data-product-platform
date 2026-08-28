# AAS Asset Administration Shell 1.0.0

**Release Date:** 2026-08-24  
**Status:** CERTIFIED (Wave 2 Technical Baseline)  
**Standards:** IEC 63278-1:2024 / IDTA-01001 v3.0

---

## Release Summary

The **Asset Administration Shell (AAS) 1.0.0** is the fourth certified Golden Path data product for Pharma Data Factory.

AAS provides a standardized digital representation of manufacturing assets and equipment, enabling organizations to:
- Register and manage equipment hierarchies
- Ingest asset data from MQTT, REST, and file sources
- Query and discover assets via standardized REST APIs
- Validate asset events against data contracts
- Integrate with downstream data products (MQTT Temperature, REST Equipment, OEE)

### Key Capabilities

| Capability | Details |
|-----------|---------|
| **Standard Compliance** | IEC 63278-1:2024 ✅ / IDTA-01001 v3.0 ✅ / IDTA-01002 v3.0 ✅ |
| **Ingestion** | MQTT, REST, File-based sources |
| **Asset Types** | Equipment, Sensor, Component, Product, Facility, Other |
| **API** | REST (IDTA-01002 v3.0 compliant) |
| **Quality** | Automated schema validation, quality metrics |
| **Deployment** | Docker, docker-compose, GitHub Actions CI/CD |
| **Observability** | Health checks, metrics, logging |
| **Documentation** | MkDocs, API reference, integration guides |

---

## What's New

### Golden Path Template

**Scaffolder Template:** `aas-data-product`

Organizations can now create asset management data products from the marketplace:

1. Backstage → Create → "AAS Asset Administration Shell Data Product"
2. Configure asset source (MQTT, REST, file)
3. Generate repository with:
   - FastAPI backend (Python 3.12+)
   - Eclipse BaSyx SDK integration
   - Data contract (JSON Schema)
   - CI/CD pipeline (GitHub Actions)
   - Docker deployment
   - Comprehensive documentation

### Asset Event Contract

**Version:** 1.0.0

Standardized schema for asset events with:
- Mandatory fields: `eventId`, `assetId`, `timestamp`, `assetType`, `submodelElements`
- Optional fields: `sourceSystem`, `metadata`, `context`
- JSON Schema validation
- Quality checks

### REST API

**Version:** 1.0.0 (IDTA-01002 v3.0 compliant)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/assets` | POST | Ingest asset event |
| `/api/v1/assets/{asset_id}` | GET | Retrieve asset |
| `/api/v1/assets` | GET | List/query assets |
| `/api/v1/assets/{asset_id}/submodels` | GET | Get submodel elements |
| `/api/v1/quality` | POST | Validate asset event |
| `/api/v1/quality` | GET | Quality metrics |
| `/api/v1/health` | GET | Liveness probe |
| `/api/v1/ready` | GET | Readiness probe |

### Platform Component

**Catalog ID:** `component:default/aas-foundation`

Reusable platform component for centralized asset management that downstream data products can depend on.

---

## Technical Details

### Architecture

```
Backstage Marketplace
  ↓
AAS Golden Path Template
  ↓
GitHub Repository (auto-generated)
  ↓
FastAPI Backend Service (Python 3.12+)
  ├─ BaSyx SDK (IDTA-01001 v3.0)
  ├─ Pydantic Models
  ├─ JSON Schema Validation
  └─ SQLite/PostgreSQL Backend
  ↓
AAS Repository & Registry
  ↓
Data Product Catalog Registration
  ↓
Marketplace Discovery & Query
```

### Dependencies

- **Runtime:**
  - Python 3.12+
  - FastAPI
  - Pydantic
  - Eclipse BaSyx Python SDK v2.1+
  - SQLite (dev) / PostgreSQL (prod)

- **CI/CD:**
  - GitHub Actions
  - Docker / Docker Compose
  - pytest (testing)
  - pylint, black, mypy (linting)
  - Bandit (security)

### Testing

**Coverage:** 85%+ (pytest)

- Unit tests for asset ingestion, validation, retrieval
- Contract validation tests
- Quality check tests
- Integration tests with MQTT broker (docker-compose)

**Test Command:**
```bash
pytest tests/ -v --cov=app --cov-report=html
```

---

## Deployment Options

### Local Development

```bash
docker-compose up
# AAS available at http://localhost:8080
# Includes: AAS service, Mosquitto, BaSyx
```

### Docker

```bash
docker build -t pharma-data-factory/aas-data-product:1.0.0 .
docker run -p 8080:8080 \
  -e AAS_REPOSITORY_URL=http://basyx:4000 \
  pharma-data-factory/aas-data-product:1.0.0
```

### Kubernetes (Ready)

Prepared for:
- Deployment manifests
- ConfigMaps for configuration
- PersistentVolumeClaims for storage
- Service mesh integration
- Horizontal pod autoscaling

---

## Standards Compliance

| Standard | Document | Version | Compliance |
|----------|----------|---------|-----------|
| **IEC 63278-1** | Asset Administration Shell Structure | 2024 | ✅ CERTIFIED |
| **IDTA-01001** | AAS Metamodel | 3.0 | ✅ CERTIFIED |
| **IDTA-01002** | AAS REST API | 3.0 | ✅ CERTIFIED |
| **IDTA-01005** | AASX Package Format | 3.0 | 🔜 Phase 2 |

### Certification Status

- **Technical Status:** CERTIFIED ✅
- **GxP Status:** Not GxP certified (for regulated environments, see roadmap)
- **Commercial Status:** Available for pilot (legal gates apply)

---

## Integration with Existing Data Products

### MQTT Temperature Data Product

```yaml
# mqtt-temperature-product/catalog-info.yaml
spec:
  dependsOn:
    - component:default/aas-foundation
```

**Use Case:** Enrich MQTT temperature events with equipment metadata from AAS registry.

### REST Equipment Data Product

```yaml
# rest-equipment-product/catalog-info.yaml
spec:
  dependsOn:
    - component:default/aas-foundation
```

**Use Case:** Query equipment hierarchy and classification from AAS.

### OEE Data Product

```yaml
# oee-data-product/catalog-info.yaml
spec:
  dependsOn:
    - component:default/aas-foundation
```

**Use Case:** Contextualize OEE calculations with asset lifecycle and classification.

---

## Documentation

### For Users

- [AAS Overview](../docs/aas/index.md) — What is AAS?
- [Quick Start](../templates/aas-data-product/content/README.md) — Get up and running
- [API Reference](../docs/aas/api-reference.md) — Complete endpoint documentation
- [Integration Guide](../docs/aas/integration.md) — How to use AAS in your products

### For Architects

- [AAS Specification](../docs/aas/aas-specification.md) — Deep dive into standards
- [Architecture](../ARCHITECTURE.md) — How AAS fits into platform
- [Data Contracts](../docs/aas/contracts.md) — Event schema and validation
- [Quality Framework](../docs/aas/quality.md) — Assurance and metrics

### For Operations

- [Deployment](../docs/aas/deployment.md) — Production deployment
- [Troubleshooting](../docs/aas/troubleshooting.md) — Common issues
- [Observability](../docs/aas/observability.md) — Monitoring and metrics
- [Security](../docs/aas/security.md) — Authentication, authorization

---

## Known Limitations

### Not Included in v1.0.0

- ❌ AASX Package File Format (.aasx) — Phase 2
- ❌ Advanced submodel types (Digital Nameplate, etc.) — Phase 2
- ❌ Asset versioning and lifecycle tracking — Phase 2
- ❌ Knowledge graph integration — Phase 3
- ❌ GxP validation — Future (Post-MVP)
- ❌ Multi-site federation — Phase 3

### Deferred to Future Phases

- 🔜 Real-time asset state synchronization
- 🔜 Predictive maintenance signals
- 🔜 Product genealogy tracking
- 🔜 Asset lineage and traceability
- 🔜 Integration with SAP/MES systems

---

## Breaking Changes

None. This is the initial release (v1.0.0).

---

## Migration Guide

Not applicable for v1.0.0.

When v2.0.0 releases, this will document:
- Backward compatibility strategy
- Deprecation notices
- Migration path for existing data products
- Timeline for v1.0.0 support removal

---

## Upgrade Path

### To Upgrade from Development Version

If you were running AAS DEVELOPMENT version, migrate to v1.0.0:

1. **Backup your AAS data:**
   ```bash
   cp .data/aas.sqlite .data/aas.sqlite.backup-$(date +%Y%m%d)
   ```

2. **Update template:**
   ```bash
   git fetch origin
   git checkout v1.0.0
   ```

3. **Run tests:**
   ```bash
   pytest tests/ -v
   ```

4. **Restart service:**
   ```bash
   docker-compose down && docker-compose up
   ```

---

## Acknowledgments

Developed in compliance with:
- **IEC 63278-1:2024** — International electrotechnical commission standard
- **IDTA Specifications** — Industrial Digital Twin Association
- **Pharma Data Factory AGENTS.md** — Platform development guidelines
- **Wave 1 Baseline** — MQTT Temperature, REST Equipment, OEE patterns

---

## Support

### Documentation

- **Comprehensive Docs:** https://docs.pharma-data-factory.local/aas/
- **API Docs (Swagger):** http://service:8080/docs

### Community

- **Platform Team:** platform@pharma-data-factory.local
- **GitHub Issues:** https://github.com/pharma-data-factory/issues
- **Slack:** #data-products channel

### References

- [IDTA Specifications](https://industrialdigitaltwin.io/aas-specifications/)
- [IEC 63278-1:2024](https://webstore.iec.ch/en/publication/65628)
- [Eclipse BaSyx](https://basyx.org/)
- [Platform Roadmap](../../ROADMAP.md)

---

## Roadmap

### Phase 2 (2026-Q4) 🔜

- AASX Package File Format (.aasx)
- Digital Nameplate submodel template
- Asset versioning with branching
- Batch genealogy tracking
- Knowledge graph integration

### Phase 3 (2027-Q1+) 🔮

- Predictive maintenance integration
- Real-time asset synchronization
- Product genealogy
- Multi-site federation
- GxP validation (regulated environments)

---

## Release Checklist

- ✅ Specification compliance verified
- ✅ All tests passing (85%+ coverage)
- ✅ Security scan clean (Bandit)
- ✅ Docker build verified
- ✅ CI/CD pipeline operational
- ✅ Documentation complete
- ✅ Golden Path template tested
- ✅ Platform integration tested
- ✅ Quality gates passed
- ✅ Catalog registration verified

---

**Wave 2 Technical Baseline Release**  
**Pharma Data Factory 2026**

Status: ✅ RELEASED
