# OEE Data Product Template

## Welcome

This is the **OEE Data Product** template — an officially certified Golden Path for calculating and publishing Overall Equipment Effectiveness.

**Domain:** Manufacturing, equipment performance  
**Status:** CERTIFIED  
**Specification:** Availability × Performance × Quality

## What is OEE?

OEE (Overall Equipment Effectiveness) answers a single question for one named asset:

> Of the time we intended to produce, how effectively did this equipment deliver good units at the intended rate?

The result is:
- **Always** for one specific equipment
- **Always** for one explicit interval (hour, shift, order)
- **Not** a site roll-up
- **Not** an MES report
- **Not** a GxP claim

## Key Features

✅ **CERTIFIED Golden Path** — Production-ready template  
✅ **Multi-Source Ingestion** — MQTT for machine events + REST for production context  
✅ **Data Contracts** — Versioned equipment, machine state, and OEE result contracts  
✅ **Quality Gates** — Automated validation and completeness checks  
✅ **REST API** — Query OEE results with full versioning  
✅ **Independence** — Runs without Backstage at runtime  
✅ **Docker & CI/CD** — Complete deployment pipeline  
✅ **Observability** — Health checks, metrics, logging  

## Golden Path Features

This is an **Official Data Product Golden Path** that generates:

- ✅ **Data Product Repository** — Independent GitHub repository
- ✅ **FastAPI Service** — Production-ready microservice
- ✅ **Three Contracts** — Equipment, Machine State, OEE Result (versioned JSON Schemas)
- ✅ **Quality Checks** — Automated contract validation
- ✅ **CI/CD Pipeline** — GitHub Actions for test, build, and deploy
- ✅ **Docker Build** — Multi-stage containerization
- ✅ **Catalog Registration** — Backstage component metadata
- ✅ **TechDocs** — Full documentation site per generated product

## The OEE Formula

```
OEE = Availability × Performance × Quality
```

Where:

| Factor | Definition | Calculation |
|--------|-----------|-------------|
| **Availability** | Of planned production time, how long was equipment running? | Actual Runtime / Planned Time |
| **Performance** | Of running time, how close was output to ideal cycle time? | (Ideal Cycle × Total Count) / Runtime |
| **Quality** | Of units produced, how many were good vs. rejected? | Good Count / Total Count |

## Getting Started

### 1. Create a New OEE Data Product
Click **"Create"** in Backstage Marketplace:
1. Fill in Data Product Name (e.g., `pharma-line-01-oee`)
2. Choose GitHub repository location
3. Configure MQTT and REST sources

### 2. What You'll Get
- Ready-to-run FastAPI service
- Pre-configured equipment and machine-state ingestion
- OEE calculation engine
- Health checks and observability
- Automated GitHub Actions CI/CD
- Docker image build pipeline
- Full test suite (pytest)
- TechDocs documentation site
- Backstage Catalog registration

### 3. Deploy Locally
```bash
cd pharma-line-01-oee
docker-compose up
```

### 4. Query OEE Results
```bash
curl http://localhost:8080/api/v1/oee?equipment=filler-01&interval=shift
```

## Input & Output

### Inputs
- **Equipment Context** (REST): Equipment ID, location, ideal cycle time
- **Machine Events** (MQTT): Running, stopped, idle, maintenance states
- **Counts** (MQTT): Total count, good count, reject count per interval

### Output
```json
{
  "equipment": "filler-01",
  "interval": "2026-08-24T06:00:00Z/2026-08-24T14:00:00Z",
  "availability": 0.95,
  "performance": 0.98,
  "quality": 0.99,
  "oee": 0.9215,
  "status": "calculated"
}
```

## Data Contracts

Three versioned contracts:

1. **equipment-event** (v1.0.0) — Equipment identity and configuration
2. **machine-state-event** (v1.0.0) — Running/stopped states and counts
3. **oee-result** (v1.0.0) — OEE calculation result and metadata

All contracts use JSON Schema and are automatically validated.

## Independence from Backstage

At runtime, OEE does **not** depend on Backstage:

- Runs as a standalone microservice
- Can be deployed to any Kubernetes cluster
- Does not require Control Plane connectivity
- Scales independently

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **OEE Methodology**: See documentation in generated product
- **Time Series Storage**: Configured via environment variables
- **Dashboarding**: Query the REST API from any tool

---

**Certified Golden Path Template** · Nexora 2026  
**Availability × Performance × Quality**
