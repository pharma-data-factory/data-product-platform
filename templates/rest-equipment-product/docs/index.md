# REST Equipment Data Product Template

## Welcome

This is the **REST Equipment Data Product** template — an officially certified Golden Path for publishing canonical equipment identity and state.

**Domain:** Manufacturing, equipment management  
**Status:** CERTIFIED  
**Specification:** Equipment Event Contract v1.0.0

## What is Equipment?

Equipment is a **first-class product**: a stable equipment ID, current state, and location context published over a versioned REST contract.

Equipment is:
- ✅ **Canonical** — One source of truth for equipment identity
- ✅ **Shared** — Used by OEE, monitoring, and other products
- ✅ **Versioned** — Tracked through time with full history
- ✅ **Governed** — Quality gates and catalog registration
- ✅ **Independent** — Runs without Backstage at runtime

Equipment is **not**:
- ❌ An EAM or MES system
- ❌ A database replacement
- ❌ A real-time state historian

## Key Features

✅ **CERTIFIED Golden Path** — Production-ready template  
✅ **REST Source Polling** — Configurable HTTP endpoint polling  
✅ **Equipment Identity Contract** — Versioned equipment-event schema  
✅ **Quality Gates** — Automated schema validation  
✅ **REST API** — Query equipment with full versioning  
✅ **Independence** — Runs without Backstage at runtime  
✅ **Docker & CI/CD** — Complete deployment pipeline  
✅ **Observability** — Health checks, metrics, logging  

## Golden Path Features

This is an **Official Data Product Golden Path** that generates:

- ✅ **Data Product Repository** — Independent GitHub repository
- ✅ **FastAPI Service** — Production-ready microservice
- ✅ **Equipment Contract** — Versioned equipment-event JSON Schema
- ✅ **Quality Checks** — Automated contract validation
- ✅ **CI/CD Pipeline** — GitHub Actions for test, build, and deploy
- ✅ **Docker Build** — Multi-stage containerization
- ✅ **Catalog Registration** — Backstage component metadata
- ✅ **TechDocs** — Full documentation site per generated product

## Getting Started

### 1. Create a New Equipment Data Product
Click **"Create"** in Backstage Marketplace:
1. Fill in Data Product Name (e.g., `pharma-line-equipment`)
2. Provide REST endpoint pattern for equipment polling
3. Choose GitHub repository location

### 2. What You'll Get
- Ready-to-run FastAPI service
- Pre-configured REST source polling
- Equipment identity storage
- Health checks and observability
- Automated GitHub Actions CI/CD
- Docker image build pipeline
- Full test suite (pytest)
- TechDocs documentation site
- Backstage Catalog registration

### 3. Deploy Locally
```bash
cd pharma-line-equipment
docker-compose up
```

### 4. Query Equipment
```bash
curl http://localhost:8080/api/v1/equipment
curl http://localhost:8080/api/v1/equipment/filler-01
```

## Data Contract

Equipment must conform to the **equipment-event.schema.json** contract:

```json
{
  "eventId": "string",      // Unique event ID
  "equipmentId": "string",  // Canonical equipment identity
  "timestamp": "ISO 8601",  // UTC timestamp
  "status": "string",       // operational, maintenance, down
  "location": "string",     // Line/area/site
  "equipmentType": "string" // filler, packager, labeler, etc.
}
```

## REST Source Configuration

Equipment is polled from a configured REST endpoint:

```env
EQUIPMENT_REST_URL=http://mes-api/equipment/{equipmentId}
EQUIPMENT_POLL_INTERVAL_SECONDS=60
```

## API Reference

### Health Check
```
GET /health
```

### List Equipment
```
GET /api/v1/equipment
```

### Get Equipment
```
GET /api/v1/equipment/{equipmentId}
```

### Upsert Equipment
```
POST /api/v1/equipment
Content-Type: application/json
```

## Independence from Backstage

At runtime, Equipment does **not** depend on Backstage:

- Runs as a standalone microservice
- Can be deployed to any Kubernetes cluster
- Does not require Control Plane connectivity
- Scales independently

## Integration

Equipment is typically consumed by:

- **OEE Data Product** — Links equipment to effectiveness metrics
- **Monitoring Systems** — Real-time dashboards
- **Analytics** — Equipment utilization analysis
- **Maintenance Planning** — Lifecycle tracking

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **Contract Schema**: See documentation in generated product
- **REST Polling**: Configured via environment variables
- **Dashboarding**: Query the REST API from any tool

---

**Certified Golden Path Template** · Pharma Data Factory 2026  
**Canonical Equipment Identity**
