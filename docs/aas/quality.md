# AAS Data Quality 1.0

**Status:** CERTIFIED (technical platform status only, not GxP)  
**Version:** 1.0.0  
**Audience:** INTERNAL ENGINEERING  

---

## Quality Framework

AAS-specific quality checks on top of the existing Data Product quality semantics.

**Quality Levels:**
- `DEVELOPMENT` / `TESTED` / `CERTIFIED` on the data product
- `PASSED` / `FAILED` on individual events

---

## Mandatory Checks

Events failing **MANDATORY** checks are **rejected** and **NOT stored**.

| Check | Fail When | Example |
|-------|-----------|---------|
| Event ID not empty | `eventId` is empty or null | `"eventId": ""` |
| Asset ID not empty | `assetId` is empty or null | `"assetId": ""` |
| Timestamp ISO 8601 | Timestamp not in ISO 8601 format | `"timestamp": "24-08-2026"` |
| Asset type valid | `assetType` not in enum | `"assetType": "invalid"` |
| Submodel elements present | No `submodelElements` or empty | `"submodelElements": {}` |
| Contract schema valid | Event violates JSON Schema | Missing required fields |

### Mandatory Check Details

**Event ID Validation**
- Must be non-empty string
- Recommended: UUID v4 format
- Accepted: UUID or alphanumeric with `-_`.

```json
✅ "eventId": "550e8400-e29b-41d4-a716-446655440000"
✅ "eventId": "pump-001-2026-08-24"
❌ "eventId": ""
❌ "eventId": null
```

**Asset ID Validation**
- Must be non-empty string
- Max 255 characters
- Used for asset registry lookup

```json
✅ "assetId": "pump-unit-001"
✅ "assetId": "PLANT-DE-01:equipment:pump-001"
❌ "assetId": ""
❌ "assetId": "x".repeat(300)  // Too long
```

**Timestamp Validation**
- Must be ISO 8601 format
- Timezone-aware (Z for UTC or ±HH:MM)
- Seconds precision minimum

```json
✅ "timestamp": "2026-08-24T14:30:00Z"
✅ "timestamp": "2026-08-24T14:30:00+02:00"
❌ "timestamp": "24-08-2026 14:30"
❌ "timestamp": "2026/08/24"
❌ "timestamp": "1693383000"  // Unix timestamp
```

**Asset Type Validation**
- Must be in allowed enumeration
- Case-sensitive

```json
✅ "assetType": "equipment"
✅ "assetType": "sensor"
✅ "assetType": "component"
✅ "assetType": "product"
✅ "assetType": "facility"
✅ "assetType": "other"
❌ "assetType": "Equipment"  // Wrong case
❌ "assetType": "machine"    // Not in enum
```

**Submodel Elements Validation**
- Must have at least 1 property
- Any JSON value type allowed (string, number, boolean, object, array, null)
- Property names: alphanumeric + underscore, max 255 chars

```json
✅ "submodelElements": { "status": "operational" }
✅ "submodelElements": { "temp": 45.2, "pressure": 3.5 }
✅ "submodelElements": { "manufacturer": "Bosch", "data": null }
❌ "submodelElements": {}  // Empty
❌ "submodelElements": null
```

**Contract Schema Validation**
- JSON Schema validation against `asset-event.schema.json`
- All required fields present
- Type constraints respected
- Enum values valid

---

## Informational Checks

Events passing mandatory checks but failing **INFORMATIONAL** checks are **stored with warnings**.

| Check | Class | Warning When |
|-------|-------|--------------|
| Duplicate event ID | INFORMATIONAL | Later copy of same `eventId` (first wins) |

### Duplicate Event ID Handling

```
Event 1: eventId = "550e8400-e29b-41d4-a716-446655440000", assetId = "pump-001"
  → Stored ✅
  → Registered in index

Event 2: eventId = "550e8400-e29b-41d4-a716-446655440000", assetId = "pump-001"
  → Duplicate detected
  → Logged as informational warning
  → NOT stored (first wins)
  → Original event used for calculations
```

**Configuration:**
```yaml
duplicateHandling: first-wins
deduplicationWindow: 24h  # Within 24 hours of original
```

---

## Quality Metrics

### Quality Endpoint

```bash
GET /api/v1/quality
```

**Response:**

```json
{
  "timestamp": "2026-08-24T14:30:00Z",
  "total_assets": 42,
  "ingestion_success_rate": 98.5,
  "average_quality_score": 97.2,
  "schema_compliance_rate": 100.0,
  "validation_errors_last_24h": 2,
  "validation_warnings_last_24h": 5,
  "assets_by_type": {
    "equipment": 25,
    "sensor": 17,
    "component": 0,
    "product": 0,
    "facility": 0,
    "other": 0
  },
  "assets_by_source": {
    "mqtt": 30,
    "rest": 12,
    "file": 0,
    "unknown": 0
  },
  "recent_errors": [
    {
      "timestamp": "2026-08-24T14:25:00Z",
      "eventId": "error-001",
      "assetId": "pump-002",
      "error": "Invalid timestamp format"
    }
  ]
}
```

### Metrics Definition

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| `ingestion_success_rate` | (stored_events / total_events) × 100 | % of events accepted |
| `schema_compliance_rate` | (valid_schemas / total_events) × 100 | % meeting contract |
| `average_quality_score` | avg(check_pass_count / total_checks) × 100 | Overall data quality |

### Quality Threshold

| Level | Success Rate | Compliance | Status |
|-------|--------------|-----------|--------|
| ✅ Excellent | > 99% | 100% | All checks pass |
| ⚠️ Good | > 95% | > 99% | Minor warnings |
| ⚠️ Acceptable | > 90% | > 95% | Several warnings |
| ❌ Poor | < 90% | < 95% | Many failures |

---

## Quality Gates (CI/CD)

### Test Stage

**Run Quality Contract Tests:**
```bash
pytest tests/test_contract.py -v
```

### Build Stage

**Validate Deployment Schemas:**
```bash
python -c "
import json
with open('contracts/asset-event.schema.json') as f:
    schema = json.load(f)
print('Contract valid: PASS')
"
```

### Quality Gate

**Pass/Fail Criteria:**
- ✅ All contract tests pass
- ✅ No secrets in code
- ✅ Security scan clean
- ✅ Docker build successful
- ✅ Integration tests pass (on MQTT test broker)

---

## Quality Report Structure

### Individual Event Report

```bash
POST /api/v1/quality
```

**Request:**
```json
{
  "eventId": "test-123",
  "assetId": "pump-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "equipment",
  "submodelElements": { "status": "operational" }
}
```

**Response (Passed):**
```json
{
  "eventId": "test-123",
  "assetId": "pump-001",
  "passed": true,
  "checks": {
    "eventId_not_empty": true,
    "assetId_not_empty": true,
    "timestamp_iso8601": true,
    "assetType_valid": true,
    "submodelElements_present": true,
    "contract_schema": true
  },
  "errors": [],
  "warnings": [],
  "timestamp": "2026-08-24T14:30:00Z",
  "contract_version": "1.0.0"
}
```

**Response (Failed):**
```json
{
  "eventId": "test-123",
  "assetId": "pump-001",
  "passed": false,
  "checks": {
    "eventId_not_empty": true,
    "assetId_not_empty": true,
    "timestamp_iso8601": false,
    "assetType_valid": false,
    "submodelElements_present": true,
    "contract_schema": false
  },
  "errors": [
    "timestamp_iso8601: Invalid timestamp format 'invalid-date'",
    "assetType_valid: 'invalid-type' not in enum [equipment, sensor, component, product, facility, other]",
    "contract_schema: Validation failed"
  ],
  "warnings": [],
  "timestamp": "2026-08-24T14:30:00Z",
  "contract_version": "1.0.0"
}
```

---

## Troubleshooting Quality Issues

### Issue: "Invalid timestamp format"

**Cause:** Timestamp not in ISO 8601 format

**Solutions:**
```python
# ❌ Wrong
timestamp = "24-08-2026 14:30"

# ✅ Correct
from datetime import datetime, timezone
timestamp = datetime.now(timezone.utc).isoformat()
# Result: "2026-08-24T14:30:00+00:00"

# ✅ Also acceptable
timestamp = "2026-08-24T14:30:00Z"
```

### Issue: "Asset type not in enum"

**Cause:** Asset type value not in allowed list

**Solutions:**
- Use: `equipment`, `sensor`, `component`, `product`, `facility`, or `other`
- Case-sensitive (not `Equipment`)

### Issue: "Contract schema validation failed"

**Cause:** Event violates data contract

**Debug:**
```bash
curl -X POST http://localhost:8080/api/v1/quality \
  -H "Content-Type: application/json" \
  -d @bad-event.json
# Response shows which field failed
```

### Issue: "Duplicate event ID"

**Cause:** Event with same `eventId` already ingested

**Impact:**
- Logged as warning (not an error)
- First event stored, subsequent copies ignored
- Deduplication window: 24 hours

**Prevention:**
- Use unique UUIDs for each event
- Generate: `import uuid; str(uuid.uuid4())`

---

## Quality Best Practices

### 1. Use Unique Event IDs
```python
import uuid
event_id = str(uuid.uuid4())  # "550e8400-e29b-41d4-a716-446655440000"
```

### 2. Always Use ISO 8601 Timestamps
```python
from datetime import datetime, timezone
timestamp = datetime.now(timezone.utc).isoformat()  # "2026-08-24T14:30:00+00:00"
```

### 3. Validate Before Ingestion
```bash
# Test event before sending to production
curl -X POST http://localhost:8080/api/v1/quality \
  -H "Content-Type: application/json" \
  -d @my-event.json
```

### 4. Monitor Quality Metrics
```bash
# Check dashboard regularly
curl http://localhost:8080/api/v1/quality | jq '.ingestion_success_rate'
```

### 5. Log Failures for Investigation
```python
# Capture quality reports
if not quality_report['passed']:
    logger.error(f"Quality check failed: {quality_report['errors']}")
    # Retry or escalate
```

---

## References

- **Contract Schema** — `contracts/asset-event.schema.json`
- **API Endpoint** — `/api/v1/quality`
- **Tests** — `tests/test_contract.py`
- **IDTA-01001 v3.0** — Asset Administration Shell Metamodel

---

**Wave 2 Technical Baseline — Pharma Data Factory 2026**
