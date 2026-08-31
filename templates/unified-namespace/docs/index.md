# Unified Namespace

## Welcome

This is the **Unified Namespace** platform component — a reusable MQTT-based namespace management system for organizing shop-floor data streams.

**Purpose:** Canonical topic hierarchy and metadata registry  
**Status:** DEVELOPMENT / PROTOTYPE  
**Foundation:** Eclipse Mosquitto + Python SDK

## What is Unified Namespace?

The Unified Namespace (UNS) is a **centralized, structured MQTT topic hierarchy** that organizes all shop-floor data:

```
pharma/
  ├── sites/
  │   └── berlin/
  │       ├── areas/
  │       │   └── filling/
  │       │       └── lines/
  │       │           └── line-01/
  │       │               ├── equipment/temperature
  │       │               ├── equipment/pressure
  │       │               └── equipment/state
  │       └── support/
  └── contracts/
      ├── temperature-value
      ├── machine-state
      └── production-cycle
```

## Key Features

✅ **Canonical Topic Registry** — All topics registered and discoverable  
✅ **Multi-Level Hierarchy** — Site → Area → Line → Equipment  
✅ **Contract Library** — Standardized schemas for each topic  
✅ **Metadata Management** — Topic versioning and lifecycle tracking  
✅ **Independence** — Platform component (not a Golden Path)  
✅ **Docker & Compose** — Local development environment  

## Architecture

### Components

1. **MQTT Broker** — Eclipse Mosquitto
2. **Namespace Registry** — Python metadata store
3. **Contract Manager** — Schema validation
4. **Topic Validator** — Envelope and content validation
5. **REST API** — Discovery and registry queries

### Topic Structure

Topics follow a strict pattern:

```
pharma/{site}/{area}/{line}/{equipment}/{property}/{version}
```

Example:
```
pharma/berlin/filling/line-01/temperature/raw/v1
pharma/berlin/filling/line-01/state/machine/v1.2
```

## Data Contracts

Each topic type must conform to a contract:

### Temperature Value
```json
{
  "topic": "string",
  "timestamp": "ISO 8601",
  "value": "number",
  "unit": "celsius|fahrenheit",
  "status": "ok|error|offline"
}
```

### Machine State
```json
{
  "topic": "string",
  "timestamp": "ISO 8601",
  "state": "running|stopped|idle|maintenance",
  "reason": "string"
}
```

### Production Cycle
```json
{
  "topic": "string",
  "timestamp": "ISO 8601",
  "cycle_id": "string",
  "product": "string",
  "target_quantity": "number",
  "status": "planned|running|completed"
}
```

### Equipment Status
```json
{
  "topic": "string",
  "timestamp": "ISO 8601",
  "equipment_id": "string",
  "status": "operational|maintenance|down"
}
```

## Getting Started

### 1. Deploy Locally
```bash
docker-compose up
```

Broker runs at `mqtt://localhost:1883`

### 2. Register a Topic
```bash
curl -X POST http://localhost:8000/api/registry/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "pharma/berlin/filling/line-01/temperature/raw/v1",
    "contract": "temperature-value",
    "version": "1.0.0",
    "owner": "line-team"
  }'
```

### 3. Publish Data
```bash
mosquitto_pub -h localhost \
  -t "pharma/berlin/filling/line-01/temperature/raw/v1" \
  -m '{
    "timestamp": "2026-08-24T14:30:00Z",
    "value": 215.5,
    "unit": "celsius",
    "status": "ok"
  }'
```

### 4. Query Registry
```bash
curl http://localhost:8000/api/registry/topics?site=berlin&area=filling
```

## Integration

The Unified Namespace is consumed by:

- **MQTT Temperature** — Temperature data ingestion
- **Machine State Consumer** — Equipment state tracking
- **OEE Data Product** — Machine events for effectiveness calculation
- **Monitoring Systems** — Real-time dashboards
- **Analytics** — Historical data analysis

## Topic Validation

All published messages are validated:

1. **Envelope Validation** — Topic path conforms to structure
2. **Schema Validation** — Message content matches contract
3. **Versioning** — Contract version compatibility
4. **Metadata** — Owner and lifecycle tracking

## Management

### Discovery API
```
GET /api/registry/topics — List all registered topics
GET /api/registry/topics/{id} — Get topic details
GET /api/registry/contracts — List available contracts
```

### Validation Endpoint
```
POST /api/validate/envelope — Validate topic path
POST /api/validate/message — Validate message against contract
```

## Status

⚠️ **Prototype / Not Production**

The Unified Namespace is:
- ✅ A working MQTT broker with topic registry
- ✅ A local development environment
- ✅ A reference architecture for topic organization
- ❌ Not a production-grade system
- ❌ Not a commercial product

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **MQTT Documentation**: https://mosquitto.org/
- **Contract Examples**: See generated repository
- **Topic Registry**: Query via REST API

---

**Platform Component (Prototype)** · Nexora 2026  
**MQTT Unified Namespace · Topic Registry · Contract Management**
