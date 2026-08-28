# ${{ values.name }}

> AAS Asset Administration Shell Data Product — IEC 63278 / IDTA-01001 v3.0 compliant asset registry and data ingestion service.

**Domain:** Manufacturing asset management and semantic integration  
**Template:** `aas-data-product` (Golden Path)  
**Status:** CERTIFIED (DEVELOPMENT lifecycle)

## Overview

This is a certified Golden Path Data Product for asset management using the **Asset Administration Shell** standard.

The AAS provides a standardized, vendor-neutral digital representation of manufacturing assets and equipment, enabling:

- **Semantic Standardization**: IDTA-01001 v3.0 compliant asset metadata and relationships
- **Multi-Source Ingestion**: MQTT, REST, file-based asset data collection
- **Quality Assurance**: Automated schema validation and quality gates
- **Discovery**: Asset registry and submodel element queries
- **Integration**: REST API for downstream data products and applications

**Key Standards:**
- **IEC 63278-1:2024** — Asset Administration Shell structure for industrial applications
- **IDTA-01001 v3.0** — AAS Metamodel specification
- **IDTA-01002 v3.0** — AAS REST API specification
- **IDTA-01005 v3.0** — AASX Package File Format

## Architecture

```
Source System (MQTT, REST, File)
           ↓
    Asset Ingestion API
           ↓
    Validation (Data Contract)
           ↓
    AAS Repository (Eclipse BaSyx)
           ↓
    Registry & Discovery
           ↓
    Downstream Data Products
```

### Technology Stack

- **Framework**: FastAPI (Python 3.12+)
- **AAS SDK**: Eclipse BaSyx Python SDK v2.1+
- **Database**: SQLite (development) / PostgreSQL (production)
- **Validation**: JSON Schema, Pydantic
- **Container**: Docker
- **CI/CD**: GitHub Actions
- **Documentation**: MkDocs

## Quick Start

### Prerequisites

- Python 3.12+
- pip
- Docker (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/pharma-data-factory/${{ values.name }}.git
   cd ${{ values.name }}
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run service**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

6. **Access API**
   - Swagger UI: http://localhost:8080/docs
   - Health: http://localhost:8080/api/v1/health

### Docker

```bash
# Build
docker build -t ${{ values.name }}:1.0.0 .

# Run
docker run -p 8080:8080 \
  -e AAS_REPOSITORY_URL=http://basyx:4000 \
  ${{ values.name }}:1.0.0
```

## API Endpoints

### Asset Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/assets` | Ingest new asset event |
| `GET` | `/api/v1/assets/{asset_id}` | Retrieve asset by ID |
| `GET` | `/api/v1/assets` | List assets with filtering |
| `GET` | `/api/v1/assets/{asset_id}/submodels` | Get submodel elements |

### Quality & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/quality` | Validate asset event |
| `GET` | `/api/v1/quality` | Retrieve quality metrics |
| `GET` | `/api/v1/health` | Health check (liveness) |
| `GET` | `/api/v1/ready` | Readiness probe |
| `GET` | `/api/v1/metrics` | Observability metrics |

## Data Contract

Asset events must conform to `contracts/asset-event.schema.json`:

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
  }
}
```

**Required fields:**
- `eventId` — Unique event identifier
- `assetId` — Unique asset identifier
- `timestamp` — ISO 8601 timestamp
- `assetType` — Equipment, sensor, component, product, facility, or other
- `submodelElements` — IDTA-01001 compliant property map

## Configuration

Environment variables:

```bash
# Service
SERVICE_NAME=aas-data-product
SERVICE_VERSION=1.0.0
HOST=0.0.0.0
PORT=8080

# AAS Repository
AAS_REPOSITORY_URL=http://localhost:4000
AAS_REGISTRY_URL=http://localhost:4001
AAS_PERSISTENCE=sqlite
AAS_SQLITE_PATH=.data/aas.sqlite

# Ingestion
SOURCE_SYSTEM=${{ values.assetSource }}
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_TOPIC=${{ values.mqttTopic }}
REST_ENDPOINT=${{ values.restEndpoint }}
```

See `.env.example` for all available options.

## Quality Gates

### Automated Checks

- **Schema Validation**: JSON Schema conformance
- **Required Fields**: eventId, assetId, timestamp, assetType, submodelElements
- **Type Checking**: Correct data types for all properties
- **ISO 8601 Timestamps**: Valid datetime format
- **Asset Type Enum**: Valid classification
- **Submodel Compliance**: IDTA-01001 v3.0 structure

### Quality Metrics

```bash
GET /api/v1/quality
```

Response:
```json
{
  "timestamp": "2026-08-24T14:30:00Z",
  "total_assets": 42,
  "ingestion_success_rate": 98.5,
  "average_quality_score": 97.2,
  "schema_compliance_rate": 100.0,
  "validation_errors_last_24h": 2,
  "assets_by_type": { "equipment": 25, "sensor": 17 },
  "assets_by_source": { "mqtt": 30, "rest": 12 }
}
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_asset_ingestion.py -v
```

## Documentation

- [AAS Specification](docs/aas-specification.md)
- [API Reference](docs/api-reference.md)
- [Configuration Guide](docs/configuration.md)
- [Troubleshooting](docs/troubleshooting.md)

Full documentation: [docs/index.md](docs/index.md)

## Integration with Data Products

AAS is a Platform Component (not a Golden Path Data Product). Downstream data products depend on it:

```yaml
spec:
  dependsOn:
    - component:default/aas-foundation
```

Examples:
- **MQTT Temperature** — Ingests sensor events and creates AAS assets
- **REST Equipment** — Queries equipment registry via AAS API
- **OEE Composition** — Enriches production events with asset metadata from AAS

## License

See [LICENSE](LICENSE)

## Support

- **Platform Team**: platform@pharma-data-factory.local
- **Documentation**: https://docs.pharma-data-factory.local
- **Specification**: https://industrialdigitaltwin.io/aas-specifications/
