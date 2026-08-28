# AAS Data Contracts

**Status:** CERTIFIED (Wave 2 Technical Baseline)  
**Contract Version:** 1.0.0  
**Standard:** IDTA-01001 v3.0  
**Audience:** INTERNAL ENGINEERING  

---

## Asset Event Contract

### Purpose

Define the structure and validation rules for asset events ingested into the AAS registry.

### Schema

**File:** `contracts/asset-event.schema.json`

**JSON Schema Draft-07** compliant.

### Required Fields

| Field | Type | Format | Constraints |
|-------|------|--------|-------------|
| `eventId` | string | UUID or identifier | 1-255 chars, pattern: `^[a-f0-9\-]{36}$\|^[a-zA-Z0-9\-_.]+$` |
| `assetId` | string | Asset identifier | 1-255 chars |
| `timestamp` | string | ISO 8601 UTC | Format: `date-time` |
| `assetType` | string | Enumeration | equipment, sensor, component, product, facility, other |
| `submodelElements` | object | Key-value pairs | Min 1 property, any JSON value type |

### Optional Fields

| Field | Type | Purpose |
|-------|------|---------|
| `sourceSystem` | string | Origin system (mqtt, rest, sap, etc.) |
| `metadata` | object | Event-level metadata (version, contentType, encoding) |
| `context` | object | Business context (plantId, productionLine, batch, workOrder) |

### Example (Valid Event)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "equipment",
  "sourceSystem": "mqtt",
  "submodelElements": {
    "manufacturer": "Bosch Rexroth",
    "productType": "Centrifugal Pump",
    "serialNumber": "BR-2024-001",
    "status": "operational",
    "temperature": 45.2,
    "pressure": 3.5,
    "maintenanceStatus": "scheduled"
  },
  "metadata": {
    "version": "1.0.0",
    "contentType": "application/json",
    "encoding": "UTF-8"
  },
  "context": {
    "plantId": "PLANT-DE-01",
    "productionLine": "LINE-A",
    "batch": "BATCH-2024-0815",
    "workOrder": "WO-123456"
  }
}
```

### Example (Invalid Events)

**Missing Required Field:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  // Missing: timestamp
  "assetType": "equipment",
  "submodelElements": { "status": "operational" }
}
```
❌ **Validation Error:** `timestamp` is required

**Invalid Asset Type:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "invalid-type",  // Not in enum
  "submodelElements": { "status": "operational" }
}
```
❌ **Validation Error:** `assetType` must be one of: equipment, sensor, component, product, facility, other

**Invalid Timestamp Format:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "timestamp": "24-08-2026 14:30",  // Not ISO 8601
  "assetType": "equipment",
  "submodelElements": { "status": "operational" }
}
```
❌ **Validation Error:** `timestamp` must be ISO 8601 format

**Empty Submodel Elements:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "pump-unit-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "equipment",
  "submodelElements": {}  // Empty
}
```
❌ **Validation Error:** `submodelElements` must have at least 1 property

---

## Submodel Element Constraints

### Property Types

**Supported JSON value types:**
- `string` — Text (manufacturer name, serial number)
- `number` — Float or integer (temperature, pressure, count)
- `integer` — Whole number (unit count, batch number)
- `boolean` — True/false (status flags)
- `null` — Null value (optional, unknown)
- `array` — List of values (tags, history)
- `object` — Nested properties (complex data)

### Naming Conventions

- **camelCase** preferred (e.g., `serialNumber`, `maintenanceStatus`)
- Max 255 characters per property name
- Alphanumeric and underscore only
- No spaces or special characters in names

### Value Constraints

| Type | Constraint |
|------|-----------|
| `string` | Max 1024 characters |
| `number` | IEEE 754 floating-point |
| `integer` | 64-bit signed |
| `array` | Max 100 items |
| `object` | Max 50 nested properties |
| `boolean` | true or false |
| `null` | null (unknown/optional) |

---

## Quality Checks

### Validation Rules

| Check | Severity | Description |
|-------|----------|-------------|
| `eventId_not_empty` | MANDATORY | Event ID cannot be empty |
| `assetId_not_empty` | MANDATORY | Asset ID cannot be empty |
| `timestamp_iso8601` | MANDATORY | Timestamp must be ISO 8601 format |
| `assetType_valid` | MANDATORY | Asset type must be in allowed enum |
| `submodelElements_present` | MANDATORY | At least 1 submodel element required |
| `contract_schema` | MANDATORY | Must pass JSON Schema validation |
| `eventId_unique` | INFORMATIONAL | Duplicate event IDs logged (first wins) |

### Severity Levels

- **MANDATORY** — Event is rejected and NOT stored
- **WARNING** — Event is stored but flagged; visible in quality metrics
- **INFORMATIONAL** — Logged only; does not affect ingestion

---

## Versioning

### Current Version

**Version:** 1.0.0

### Compatibility

- **Breaking Changes** — Major version bump (1.0.0 → 2.0.0)
- **Backward Compatible** — Minor/patch versions (1.0.0 → 1.1.0 or 1.0.1)

### Migration Path

When releasing v2.0.0:
1. Both versions accepted for 6 months
2. Platform generates migration warnings
3. Customers update their systems
4. v1.0.0 support deprecated
5. v1.0.0 support removed in v3.0.0

---

## Contract Testing

### Validation in Code

**Python (Pydantic):**
```python
from app.models import AssetEvent

event = AssetEvent(
    eventId="test-123",
    assetId="pump-001",
    timestamp="2026-08-24T14:30:00Z",
    assetType="equipment",
    submodelElements={"status": "operational"}
)
# Pydantic validates automatically
```

**JSON Schema:**
```python
import jsonschema

schema = {
    "required": ["eventId", "assetId", "timestamp", "assetType", "submodelElements"],
    # ... full schema ...
}

event = { "eventId": "test-123", ... }

try:
    jsonschema.validate(instance=event, schema=schema)
    print("Valid")
except jsonschema.ValidationError as e:
    print(f"Invalid: {e.message}")
```

### Test Suite

**File:** `tests/test_contract.py`

**Coverage:**
- Schema structure validation
- Required fields
- Property definitions
- Enum values
- Type checking
- Example validation

**Run Tests:**
```bash
pytest tests/test_contract.py -v
```

---

## API Validation Endpoint

### Validate Before Ingestion

```bash
POST /api/v1/quality
Content-Type: application/json

{
  "eventId": "test-123",
  "assetId": "pump-001",
  "timestamp": "2026-08-24T14:30:00Z",
  "assetType": "equipment",
  "submodelElements": { "status": "operational" }
}
```

**Response (Valid):**
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

**Response (Invalid):**
```json
{
  "eventId": "test-123",
  "assetId": "pump-001",
  "passed": false,
  "checks": {
    "eventId_not_empty": true,
    "assetId_not_empty": true,
    "timestamp_iso8601": false,
    "assetType_valid": true,
    "submodelElements_present": true,
    "contract_schema": false
  },
  "errors": [
    "timestamp_iso8601: Invalid timestamp format",
    "contract_schema: Additional properties are not allowed"
  ],
  "warnings": [],
  "timestamp": "2026-08-24T14:30:00Z",
  "contract_version": "1.0.0"
}
```

---

## Integration with Quality Gates

### CI/CD Validation

**GitHub Actions** validates contracts in CI:

```yaml
- name: Validate contract schema
  run: |
    pip install jsonschema
    python -m pytest tests/test_contract.py -v
```

### Quality Gate Status

**Marketplace visibility:**
- ✅ `TESTED` — Contract validated
- ✅ `CERTIFIED` — Meets standards
- 🔄 `DEVELOPMENT` — Under review

---

## Future Enhancements (Phase 2)

- 🔜 AASX Package Format support
- 🔜 Multi-language property support
- 🔜 Unit and measurement specifications
- 🔜 Namespace and identifier resolution
- 🔜 Schema versioning lifecycle

---

## References

- **IDTA-01001 v3.0** — AAS Metamodel specification
- **JSON Schema Draft-07** — https://json-schema.org/draft-07
- **Contract Testing Guide** — tests/test_contract.py
- **API Validation** — /api/v1/quality endpoint

---

**Wave 2 Technical Baseline — Pharma Data Factory 2026**
