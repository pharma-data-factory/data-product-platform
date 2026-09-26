# Golden Path Authorization Matrix

## Complete Permission & Role Reference

**Last Updated:** 2026-08-26  
**Scope:** All 6 Golden Paths × 4 permissions each = 24 total permissions  
**Domains:** OEE, MQTT, Equipment, AAS, UNS, Machine State  

---

## PERMISSION MATRIX

### All 24 Permissions by Domain

| # | Domain | Permission | Title | Category | Runtime Enforcement | Description |
|---|--------|-----------|-------|----------|-------------------|-------------|
| 1 | oee | oee.read | Read OEE Data | read | IMPLEMENTED | View OEE results, metrics, time-series |
| 2 | oee | oee.operate | Operate OEE | operate | IMPLEMENTED | Trigger calculations, retrieve metrics |
| 3 | oee | oee.configure | Configure OEE | configure | EXTERNAL | Configure MQTT topics, REST endpoints |
| 4 | oee | oee.admin | Administer OEE | admin | EXTERNAL | Full OEE product administration |
| 5 | mqtt | mqtt.read | Read MQTT Data | read | IMPLEMENTED | View temperature data, historical readings |
| 6 | mqtt | mqtt.operate | Operate MQTT | operate | IMPLEMENTED | Query data, monitor ingestion |
| 7 | mqtt | mqtt.configure | Configure MQTT | configure | EXTERNAL | Configure topics, validation rules |
| 8 | mqtt | mqtt.admin | Administer MQTT | admin | EXTERNAL | Full MQTT product administration |
| 9 | equipment | equipment.read | Read Equipment Data | read | IMPLEMENTED | View master data, metadata |
| 10 | equipment | equipment.operate | Operate Equipment | operate | IMPLEMENTED | Query equipment, retrieve specs |
| 11 | equipment | equipment.configure | Configure Equipment | configure | EXTERNAL | Configure sources, validation |
| 12 | equipment | equipment.admin | Administer Equipment | admin | EXTERNAL | Full equipment product administration |
| 13 | aas | aas.read | Read Asset Data | read | IMPLEMENTED | View assets, semantic models (IEC 63278) |
| 14 | aas | aas.operate | Operate Assets | operate | IMPLEMENTED | Query registry, retrieve specs |
| 15 | aas | aas.configure | Configure Assets | configure | EXTERNAL | Configure sources, validation |
| 16 | aas | aas.admin | Administer Assets | admin | EXTERNAL | Full asset product administration |
| 17 | uns | uns.read | Read MQTT Topics | read | NOT_REQUIRED | View topic structure, contracts |
| 18 | uns | uns.operate | Subscribe to MQTT | operate | EXTERNAL | Publish/subscribe to MQTT topics (broker ACL) |
| 19 | uns | uns.configure | Configure Namespace | configure | EXTERNAL | Define topics, contracts, governance |
| 20 | uns | uns.admin | Administer Namespace | admin | EXTERNAL | Full namespace administration |
| 21 | machine-state | machine-state.read | Read Machine State | read | IMPLEMENTED | View state events, transitions |
| 22 | machine-state | machine-state.operate | Operate Machine State | operate | IMPLEMENTED | Query state, retrieve history |
| 23 | machine-state | machine-state.configure | Configure Machine State | configure | EXTERNAL | Configure consumer parameters |
| 24 | machine-state | machine-state.admin | Administer Machine State | admin | EXTERNAL | Full state product administration |

---

## RUNTIME ENFORCEMENT DISTRIBUTION

### By Type

| Enforcement | Count | Permissions |
|------------|-------|------------|
| **IMPLEMENTED** | 12 | .read (6) + .operate (6) |
| **EXTERNAL** | 10 | .configure (6) + .admin (4) |
| **NOT_REQUIRED** | 2 | uns.read (1) + uns.operate (1) |

**Note:** Runtime enforcement status indicates where permission checking happens:
- **IMPLEMENTED:** Checked in generated product code
- **EXTERNAL:** Checked by Backstage/API gateway/policy engine
- **NOT_REQUIRED:** Purely informational (best-effort)

---

## DOMAIN ROLE MATRIX

### All 24 Roles (4 per domain)

| Domain | Viewer Role | Operator Role | Engineer Role | Admin Role |
|--------|------------|--------------|---------------|-----------|
| **OEE** | oee-viewer | oee-operator | oee-engineer | oee-admin |
| **MQTT** | mqtt-viewer | mqtt-operator | mqtt-engineer | mqtt-admin |
| **Equipment** | equipment-viewer | equipment-operator | equipment-engineer | equipment-admin |
| **AAS** | aas-viewer | aas-operator | aas-engineer | aas-admin |
| **UNS** | uns-viewer | uns-subscriber | uns-engineer | uns-admin |
| **Machine State** | machine-state-viewer | machine-state-operator | machine-state-engineer | machine-state-admin |

---

## DOMAIN ROLE PERMISSIONS TABLE

### OEE Roles

| Role | oee.read | oee.operate | oee.configure | oee.admin | Use Case |
|------|----------|------------|--------------|-----------|----------|
| oee-viewer | ✅ | ❌ | ❌ | ❌ | Read-only access to results |
| oee-operator | ✅ | ✅ | ❌ | ❌ | Operational access |
| oee-engineer | ✅ | ✅ | ✅ | ❌ | Full technical configuration |
| oee-admin | ✅ | ✅ | ✅ | ✅ | Administrative control |

### MQTT Roles

| Role | mqtt.read | mqtt.operate | mqtt.configure | mqtt.admin | Use Case |
|------|-----------|-------------|----------------|-----------|----------|
| mqtt-viewer | ✅ | ❌ | ❌ | ❌ | Read-only access |
| mqtt-operator | ✅ | ✅ | ❌ | ❌ | Operational queries |
| mqtt-engineer | ✅ | ✅ | ✅ | ❌ | Configuration access |
| mqtt-admin | ✅ | ✅ | ✅ | ✅ | Full administration |

### Equipment Roles

| Role | equipment.read | equipment.operate | equipment.configure | equipment.admin | Use Case |
|------|----------------|-------------------|-------------------|----------------|----------|
| equipment-viewer | ✅ | ❌ | ❌ | ❌ | Data consumer |
| equipment-operator | ✅ | ✅ | ❌ | ❌ | Analyst |
| equipment-engineer | ✅ | ✅ | ✅ | ❌ | Integration owner |
| equipment-admin | ✅ | ✅ | ✅ | ✅ | Product admin |

### AAS Roles

| Role | aas.read | aas.operate | aas.configure | aas.admin | Use Case |
|------|----------|-----------|--------------|-----------|----------|
| aas-viewer | ✅ | ❌ | ❌ | ❌ | Asset consumer |
| aas-operator | ✅ | ✅ | ❌ | ❌ | Asset analyst |
| aas-engineer | ✅ | ✅ | ✅ | ❌ | Asset engineer (IEC 63278) |
| aas-admin | ✅ | ✅ | ✅ | ✅ | Asset admin |

### UNS Roles

| Role | uns.read | uns.operate | uns.configure | uns.admin | Use Case |
|------|----------|-----------|--------------|-----------|----------|
| uns-viewer | ✅ | ❌ | ❌ | ❌ | Read topic structure |
| uns-subscriber | ✅ | ✅ | ❌ | ❌ | MQTT publisher/subscriber |
| uns-engineer | ✅ | ✅ | ✅ | ❌ | Topic governance |
| uns-admin | ✅ | ✅ | ✅ | ✅ | Namespace admin |

### Machine State Roles

| Role | machine-state.read | machine-state.operate | machine-state.configure | machine-state.admin | Use Case |
|------|------------------|---------------------|----------------------|-------------------|----------|
| machine-state-viewer | ✅ | ❌ | ❌ | ❌ | State consumer |
| machine-state-operator | ✅ | ✅ | ❌ | ❌ | State analyst |
| machine-state-engineer | ✅ | ✅ | ✅ | ❌ | State engineer |
| machine-state-admin | ✅ | ✅ | ✅ | ✅ | State admin |

---

## PLATFORM ROLE MAPPING MATRIX

### Central Platform Roles → Suggested Domain Roles

| Platform Role | OEE | MQTT | Equipment | AAS | UNS | Machine State |
|---------------|-----|------|-----------|-----|-----|---------------|
| **Viewer** | oee-viewer | mqtt-viewer | equipment-viewer | aas-viewer | uns-viewer | machine-state-viewer |
| **Developer** | oee-operator | mqtt-operator | equipment-operator | aas-operator | uns-subscriber | machine-state-operator |
| **Owner** | oee-engineer | mqtt-engineer | equipment-engineer | aas-engineer | uns-engineer | machine-state-engineer |
| **Admin** | oee-admin | mqtt-admin | equipment-admin | aas-admin | uns-admin | machine-state-admin |

**Key Point:** Platform role automatically grants suggested domain role for each domain

---

## COMPONENT AUTHORIZATION MAPPING

### Generated Products & Their Domains

| Component Name | Template | Domain | Suggested Role | Viewer Can | Operator Can | Engineer Can | Admin Can |
|----------------|----------|--------|----------------|-----------|------------|-------------|-----------|
| my-oee-product | OEE Data Product | oee | oee-operator | Read | Read+Operate | +Configure | +Admin |
| temp-sensor | MQTT Temperature | mqtt | mqtt-operator | Read | Read+Operate | +Configure | +Admin |
| equipment-catalog | REST Equipment | equipment | equipment-operator | Read | Read+Operate | +Configure | +Admin |
| asset-registry | AAS Data Product | aas | aas-operator | Read | Read+Operate | +Configure | +Admin |
| topic-contracts | Unified Namespace | uns | uns-subscriber | Read | Read+Subscribe | +Configure | +Admin |
| state-consumer | Machine State Consumer | machine-state | machine-state-operator | Read | Read+Operate | +Configure | +Admin |

---

## PERMISSION COMBINATIONS BY USE CASE

### Data Scientist (Read-Only Analysis)
```
Platform Role: Viewer
Grants:
├─ oee.read
├─ mqtt.read
├─ equipment.read
├─ aas.read
├─ uns.read
└─ machine-state.read

Can: View all data, run reports, no modifications
```

### Data Engineer (Operational Tasks)
```
Platform Role: Developer
Grants:
├─ oee.read, oee.operate
├─ mqtt.read, mqtt.operate
├─ equipment.read, equipment.operate
├─ aas.read, aas.operate
├─ uns.read, uns.operate
└─ machine-state.read, machine-state.operate

Can: Query, analyze, trigger operations, no configuration changes
```

### Data Product Owner (Full Configuration)
```
Platform Role: Owner
Grants:
├─ oee.read, oee.operate, oee.configure
├─ mqtt.read, mqtt.operate, mqtt.configure
├─ equipment.read, equipment.operate, equipment.configure
├─ aas.read, aas.operate, aas.configure
├─ uns.read, uns.operate, uns.configure
└─ machine-state.read, machine-state.operate, machine-state.configure

Can: Configure all parameters, operations, manage products (except deletion)
```

### Platform Administrator (Full Control)
```
Platform Role: Admin
Grants:
├─ oee.* (all)
├─ mqtt.* (all)
├─ equipment.* (all)
├─ aas.* (all)
├─ uns.* (all)
└─ machine-state.* (all)

Can: Full control, deletion, lifecycle management
```

---

## PERMISSION CATEGORIES

### Read Permissions (6 total)
```
├─ oee.read: View OEE results and metrics
├─ mqtt.read: View temperature data
├─ equipment.read: View master data
├─ aas.read: View asset registry
├─ uns.read: View topic structure
└─ machine-state.read: View state events

Pattern: Viewer can perform all .read operations across all domains
```

### Operate Permissions (6 total)
```
├─ oee.operate: Trigger calculations, query results
├─ mqtt.operate: Query data, monitor ingestion
├─ equipment.operate: Query equipment
├─ aas.operate: Query asset registry
├─ uns.operate: Publish/subscribe to MQTT
└─ machine-state.operate: Query state history

Pattern: Developer can perform all .operate operations
```

### Configure Permissions (6 total)
```
├─ oee.configure: Configure MQTT topics, REST endpoints
├─ mqtt.configure: Configure topics, validation
├─ equipment.configure: Configure sources, validation
├─ aas.configure: Configure asset sources, validation
├─ uns.configure: Define topics, contracts
└─ machine-state.configure: Configure consumer params

Pattern: Owner/Engineer can perform .configure on their domain
```

### Admin Permissions (6 total)
```
├─ oee.admin: Full OEE administration
├─ mqtt.admin: Full MQTT administration
├─ equipment.admin: Full equipment administration
├─ aas.admin: Full asset administration
├─ uns.admin: Full namespace administration
└─ machine-state.admin: Full state administration

Pattern: Admin can perform .admin operations
```

---

## AGGREGATED PERMISSION STATISTICS

### By Category
- **Read:** 6 permissions (25%)
- **Operate:** 6 permissions (25%)
- **Configure:** 6 permissions (25%)
- **Admin:** 6 permissions (25%)

### By Enforcement
- **IMPLEMENTED:** 12 permissions (50%) - Checked in product
- **EXTERNAL:** 10 permissions (42%) - Checked by platform
- **NOT_REQUIRED:** 2 permissions (8%) - Informational only

### By Domain
- **OEE:** 4 permissions (manufacturing, primary golden path)
- **MQTT:** 4 permissions (manufacturing, primary golden path)
- **Equipment:** 4 permissions (manufacturing, primary golden path)
- **AAS:** 4 permissions (manufacturing, primary golden path)
- **UNS:** 4 permissions (integration, supporting component)
- **Machine State:** 4 permissions (manufacturing, composition proof)

### By Role Level
- **Viewer:** 6 permissions (all .read)
- **Operator:** 12 permissions (all .read + .operate)
- **Engineer:** 18 permissions (all .read + .operate + .configure)
- **Admin:** 24 permissions (all)

---

## PERMISSION DISCOVERY & REGISTRATION

### Discovery Flow
```
Template Authorization Profile
  ↓
  │─ Contains: Domain name, permissions, roles, mappings
  │
  ▼
Catalog-info.yaml annotation
  ↓
  │─ nexora.io/authorization-profile: <domain>
  │
  ▼
Discovery Service (hourly)
  ├─ Query catalog for annotations
  ├─ Load authorization.yaml from template
  ├─ Parse permissions and roles
  └─ Register in central RBAC
  
  ▼
Central Authorization Registry
  ├─ 24 permissions registered
  ├─ 24 roles registered
  ├─ 24 platform↔domain mappings
  └─ Available via API
```

### API Endpoints for Querying

#### Get all permissions for a domain
```
GET /api/authorization/domains/oee/permissions

Response:
[
  {
    "name": "oee.read",
    "title": "Read OEE Data",
    "category": "read",
    "runtimeEnforcement": "IMPLEMENTED"
  },
  // ... more permissions ...
]
```

#### Get all roles for a domain
```
GET /api/authorization/domains/oee/roles

Response:
[
  {
    "name": "oee-viewer",
    "permissions": ["oee.read"]
  },
  // ... more roles ...
]
```

#### Get all components using a domain
```
GET /api/authorization/domains/oee/components

Response:
[
  {
    "name": "my-oee-product",
    "owner": "user:default/john",
    "permissions": ["oee.read", "oee.operate"]
  },
  // ... more components ...
]
```

---

## SUMMARY & QUICK REFERENCE

### Total Permissions: 24
- 6 domains × 4 permissions per domain
- 4 categories (read, operate, configure, admin)
- Distribution: 12 IMPLEMENTED, 10 EXTERNAL, 2 NOT_REQUIRED

### Total Roles: 24
- 6 domains × 4 roles per domain
- Role types: Viewer, Operator/Subscriber, Engineer, Admin
- All aligned to central platform roles

### Central Platform Roles: 4
- Viewer: Read-only (6 .read permissions)
- Developer: Operational (6 .read + 6 .operate)
- Owner: Engineering (6 .read + 6 .operate + 6 .configure)
- Admin: Full control (all 24 permissions)

### Mapping Strategy
- 1:1 mapping from each platform role to domain roles
- Automatic assignment when developer joins platform role
- Suggested roles can be customized per organization

---

**Status:** ✅ COMPLETE  
**Last Updated:** 2026-08-26  
**Version:** 1.0.0
