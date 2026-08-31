# Machine State Consumer

## Welcome

This is the **Machine State Consumer** template — a composition proof that demonstrates consuming and processing machine-state events from the Unified Namespace.

**Purpose:** Reference composition consuming Unified Namespace events  
**Status:** TESTED / REFERENCE PROOF  
**Not an Official Golden Path**

## What is Machine State Consumer?

The Machine State Consumer is a **reference proof** showing how to:

1. **Subscribe** to machine-state events from Unified Namespace
2. **Validate** events against the machine-state contract
3. **Transform** raw states into business context
4. **Store** state history
5. **Expose** state queries via REST API

This is **NOT** an official Data Product Golden Path. It's a **composition proof** demonstrating pattern reuse.

## Key Features

✅ **Unified Namespace Integration** — Subscribes to MQTT topics  
✅ **Contract Validation** — Validates machine-state-event schema  
✅ **State History** — Stores state transitions over time  
✅ **REST API** — Query machine states and history  
✅ **Quality Checks** — Automated validation of ingest quality  
✅ **Docker & CI/CD** — Complete deployment pipeline  
✅ **TechDocs** — Full documentation  

## Architecture

### Components

1. **MQTT Subscriber** — Connects to Unified Namespace broker
2. **State Validator** — Validates against machine-state-event contract
3. **State Store** — SQLite history of state transitions
4. **REST API** — Query interface
5. **Health & Observability** — Status and metrics

### Data Flow

```
Unified Namespace (MQTT)
    ↓
machine-state event
    ↓
Validate (contract: v1.0.0)
    ↓
Store (SQLite)
    ↓
Query via REST API
```

## Machine State Contract

All machine-state events must conform to **machine-state-event v1.0.0**:

```json
{
  "topic": "string",           // Full MQTT topic path
  "timestamp": "ISO 8601",     // UTC timestamp
  "state": "enum",             // running | stopped | idle | maintenance
  "reason": "string",          // Why did state change?
  "duration_seconds": "number" // Optional: how long in this state
}
```

### Valid States

| State | Meaning | Typical Duration |
|-------|---------|------------------|
| `running` | Equipment actively producing | Hours |
| `stopped` | Unplanned downtime | Minutes to hours |
| `idle` | Not scheduled to run | Hours |
| `maintenance` | Planned downtime | Hours to days |

## Getting Started

### 1. Deploy Locally
```bash
docker-compose up
```

Backend runs at `http://localhost:8080`  
Unified Namespace MQTT at `mqtt://mqtt:1883`

### 2. Publish Machine States
```bash
mosquitto_pub -h mqtt \
  -t "pharma/berlin/filling/line-01/state/machine/v1" \
  -m '{
    "timestamp": "2026-08-24T14:30:00Z",
    "state": "running",
    "reason": "scheduled production"
  }'
```

### 3. Query States
```bash
curl http://localhost:8080/api/v1/state/current
curl http://localhost:8080/api/v1/state/history?limit=100
```

## API Reference

### Get Current State
```
GET /api/v1/state/current
```

**Response:**
```json
{
  "topic": "pharma/berlin/filling/line-01/state/machine/v1",
  "state": "running",
  "timestamp": "2026-08-24T14:30:00Z",
  "reason": "scheduled production"
}
```

### Get State History
```
GET /api/v1/state/history?limit=100&offset=0
```

### Get State by Topic
```
GET /api/v1/state/by-topic/{encoded_topic}
```

### Health Check
```
GET /health
```

## Integration Points

This composition proves:

- ✅ **Unified Namespace Integration** — MQTT subscriptions work
- ✅ **Contract Validation** — Schema validation is reliable
- ✅ **State Management** — Track state transitions over time
- ✅ **REST API** — Query state history programmatically
- ✅ **CI/CD Pipeline** — Tests and builds work end-to-end

This is consumed by:

- **OEE Data Product** — Feeds machine states for effectiveness calc
- **Monitoring Systems** — Real-time state dashboards
- **Analytics** — Historical state analysis

## Testing

Comprehensive test suite:

```bash
pytest
```

Tests cover:

- ✅ MQTT subscription and message receipt
- ✅ Contract validation (valid and invalid messages)
- ✅ State transitions and history
- ✅ REST API responses
- ✅ Data quality checks

## What This Is NOT

❌ **Not a Golden Path** — This is a reference proof  
❌ **Not production-ready** — For demonstration only  
❌ **Not a commercial product** — Use as a learning tool  

## Customization

To adapt this for your use case:

1. Update `MQTT_TOPIC` in `.env` to your topic
2. Modify state enum in `state-contract.schema.json`
3. Add custom business logic in `app/state_processor.py`
4. Update tests in `tests/`
5. Rebuild and deploy

## Status

✅ **TESTED** — All unit and integration tests pass  
✅ **WORKING** — Demonstrates correct patterns  
⚠️ **REFERENCE ONLY** — Not intended for production use

## Support & References

- **Platform Team**: platform@pharma-data-factory.local
- **Unified Namespace**: See platform documentation
- **Contract**: See schema in `contracts/`
- **OEE Data Product**: Depends on this composition

---

**Composition Proof (Reference Only)** · Nexora 2026  
**Machine State Events · Unified Namespace Integration**
