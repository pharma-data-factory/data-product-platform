# MQTT Temperature Data Product Template

## Welcome

This is the **MQTT Temperature Data Product** template — an officially certified Golden Path for publishing versioned, governed temperature telemetry from shop-floor and utility sensors.

**Domain:** Manufacturing, temperature telemetry  
**Status:** CERTIFIED  
**Specification:** Temperature Event Contract v1.1.0

## What is Temperature?

Temperature is a **first-class data product**: readings from shop-floor or utility sensors become a governed offering with:

- ✅ **One Contract** — temperature-event 1.1.0 (versioned JSON Schema)
- ✅ **One Time Series** — SQLite storage with full history
- ✅ **One REST API** — Query temperature with versioning
- ✅ **Quality Gate** — Automated validation and completeness checks
- ✅ **Independence** — Runs without Backstage at runtime

Temperature is **not**:
- ❌ Directly from MQTT brokers or historian extracts
- ❌ A database replacement
- ❌ Real-time streaming dashboards

## Key Features

✅ **CERTIFIED Golden Path** — Production-ready template  
✅ **MQTT Source Ingestion** — Configurable topic subscription  
✅ **Temperature Contract** — Versioned temperature-event schema v1.1.0  
✅ **Quality Gates** — Automated schema validation  
✅ **REST API** — Query temperature with full versioning  
✅ **Idempotency** — Duplicate events are deduplicated via eventId  
✅ **Independence** — Runs without Backstage at runtime  
✅ **Docker & CI/CD** — Complete deployment pipeline  
✅ **Observability** — Health checks, metrics, logging  

## Golden Path Features

This is an **Official Data Product Golden Path** that generates:

- ✅ **Data Product Repository** — Independent GitHub repository
- ✅ **FastAPI Service** — Production-ready microservice
- ✅ **Temperature Contract** — Versioned temperature-event JSON Schema v1.1.0
- ✅ **Quality Checks** — Automated contract validation and quality metrics
- ✅ **CI/CD Pipeline** — GitHub Actions (lint → unit → contract → quality → compat → Docker)
- ✅ **Docker Build** — Multi-stage containerization
- ✅ **Catalog Registration** — Backstage component with qualityStatus: TESTED
- ✅ **TechDocs** — Full documentation site per generated product

## Getting Started

### 1. Create a New Temperature Data Product
Click **"Create"** in Backstage Marketplace:
1. Fill in Data Product Name (e.g., `pharma-filling-line-temperature`)
2. Provide MQTT topic pattern (e.g., `pharma/filling-line/+/temperature`)
3. Choose GitHub repository location

### 2. What You'll Get
- Ready-to-run FastAPI service
- Pre-configured MQTT subscription
- SQLite time series storage
- Health checks and observability
- Automated GitHub Actions CI/CD
- Docker image build pipeline
- Full test suite (pytest with contract & quality tests)
- TechDocs documentation site
- Backstage Catalog registration

### 3. Deploy Locally
```bash
cd pharma-filling-line-temperature
docker-compose up
```

### 4. Publish a Reading
```bash
mosquitto_pub -h localhost -t "pharma/filling-line/oven-01/temperature" -m '{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "sensorId": "temp-oven-01",
  "timestamp": "2026-08-24T14:30:00Z",
  "temperature": 215.5,
  "unit": "celsius",
  "status": "ok"
}'
```

### 5. Query Temperature
```bash
curl http://localhost:8080/api/v1/temperature
curl http://localhost:8080/api/v1/temperature?sensorId=temp-oven-01&limit=100
```

## Data Contract

Temperature must conform to the **temperature-event.schema.json** contract (v1.1.0):

```json
{
  "eventId": "string",      // Unique, globally unique event ID (UUID)
  "sensorId": "string",     // Canonical sensor identity
  "timestamp": "ISO 8601",  // UTC timestamp
  "temperature": "number",  // Temperature value (float)
  "unit": "celsius|fahrenheit", // Temperature unit
  "status": "ok|error|offline"  // Sensor status
}
```

## CI/CD Pipeline

Every commit runs:

1. **Lint** — ESLint / Black
2. **Unit Tests** — pytest
3. **Contract Tests** — Validate against temperature-event schema
4. **Data Quality Tests** — Freshness, completeness, uniqueness
5. **Compatibility Tests** — Ensure contract backward compatibility
6. **Docker Build** — Build and push image

All stages must pass before merge.

## API Reference

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "temperature-data-product",
  "uptime_seconds": 3600
}
```

### Get Latest Readings
```
GET /api/v1/temperature?limit=100&sensorId=temp-oven-01
```

### Get Reading by Event ID
```
GET /api/v1/temperature/{eventId}
```

### Quality Status
```
GET /quality
```

## Quality Checks

Automated quality metrics:

- **Freshness** — Latest reading < X minutes old
- **Completeness** — Required fields present
- **Schema Validation** — Conforms to contract v1.1.0
- **Uniqueness** — No duplicate eventIds
- **Timeliness** — Events arrive within expected window

## Configuration

```env
# MQTT Configuration
MQTT_BROKER_HOST=mqtt
MQTT_BROKER_PORT=1883
MQTT_TOPIC=pharma/filling-line/+/temperature
MQTT_CLIENT_ID=temperature-product

# Storage
DATABASE_URL=sqlite:///./temperature.db

# API
API_PORT=8080
API_HOST=0.0.0.0

# Quality
QUALITY_FRESHNESS_THRESHOLD_MINUTES=5
QUALITY_COMPLETENESS_REQUIRED_FIELDS=eventId,sensorId,timestamp,temperature
```

## Integration

Temperature is typically consumed by:

- **OEE Data Product** — Links temperature context to equipment effectiveness
- **Monitoring Systems** — Real-time temperature dashboards
- **Analytics** — Temperature trend analysis
- **Alerting** — Anomaly detection and notifications

## Independence from Backstage

At runtime, Temperature does **not** depend on Backstage:

- Runs as a standalone microservice
- Can be deployed to any Kubernetes cluster
- Does not require Control Plane connectivity
- Scales independently

## Testing

Generated test suite includes:

- **Unit Tests** — Business logic tests
- **Contract Tests** — Schema validation tests
- **Quality Tests** — Data quality checks
- **Compatibility Tests** — Backward compatibility verification
- **Integration Tests** — End-to-end MQTT to API flow

```bash
pytest
```

## Deployment

### Local Development
```bash
docker-compose up
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Docker Registry
```bash
docker build -t pharma-data-factory/pharma-filling-line-temperature:1.0.0 .
docker push pharma-data-factory/pharma-filling-line-temperature:1.0.0
```

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **Contract Schema**: See documentation in generated product
- **MQTT Configuration**: See environment variables section
- **Dashboarding**: Query the REST API from Grafana, Tableau, or similar
- **Archives**: Integrate with time-series databases (InfluxDB, TimescaleDB, etc.)

## Troubleshooting

### "MQTT Connection Refused"
- Check MQTT broker is running
- Verify `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT`

### "Schema Validation Failed"
- Verify event JSON matches temperature-event.schema.json
- Check all required fields are present

### "Duplicate Events"
- Events with same `eventId` are deduplicated
- Use unique UUIDs for each event

---

**Certified Golden Path Template** · Nexora 2026  
**MQTT Temperature Telemetry · Temperature Event v1.1.0**
