# Authorization Profile Schema Reference

## Standard AuthorizationProfile CRD

This document defines the reusable authorization schema used by all Golden Paths and components.

---

## YAML Schema: AuthorizationProfile

```yaml
apiVersion: platform.nexora.io/v1alpha1
kind: AuthorizationProfile
metadata:
  name: <domain>
  title: <Title> Authorization Profile
  namespace: default
  annotations:
    description: Authorization profile for <domain> domain
    platform: data-product-factory
spec:
  # Domain identifier (lowercase, no spaces)
  domain: <domain>
  
  # Human-readable title
  title: <Title> Authorization Profile
  
  # Permissions defined for this domain
  permissions:
    - name: <domain>.<action>
      title: <Display Title>
      description: <Detailed description of what this permission allows>
      category: <Category: read|operate|configure|admin>
      runtimeEnforcement: <IMPLEMENTED|EXTERNAL|NOT_REQUIRED>
      
      # For permissions that require external enforcement
      enforcement:
        location: <where enforcement happens: runtime|platform|catalog>
        mechanism: <how it's enforced: rbac|api-gateway|policy|manual>
  
  # Suggested domain-specific roles (local to this product)
  suggestedRoles:
    - name: <Role Name>
      title: <Display Title>
      description: <Purpose of this role>
      permissions:
        - <domain>.<action1>
        - <domain>.<action2>
      principalType: <user|group>
      
  # Mapping to central Platform RBAC roles
  platformRoleMappings:
    - platformRole: <central-role>
      suggestedDomainRole: <domain-role>
      rationale: <why this mapping makes sense>
  
  # Catalog entity this profile applies to
  appliesTo:
    - kind: <Component|API>
      selector:
        matchLabels:
          nexora.io/authorization-profile: <domain>
```

---

## Schema Sections Explained

### Metadata
- `name`: Domain identifier (e.g., "oee", "mqtt", "equipment")
- `title`: Human-readable title with "Authorization Profile" suffix
- `namespace`: Always `default` (single namespace for platform)

### Spec.Domain
Lowercase domain identifier matching template domain.

### Spec.Permissions
Array of permissions in `<domain>.<action>` naming pattern.

**Permission Fields:**
- `name`: Unique identifier in format `<domain>.<action>`
- `title`: Human-readable permission name
- `description`: What this permission allows (operational context)
- `category`: Classification (read, operate, configure, admin)
- `runtimeEnforcement`: 
  - `IMPLEMENTED`: Already enforced in generated product
  - `EXTERNAL`: Enforced by Backstage permission framework
  - `NOT_REQUIRED`: No runtime enforcement needed

**Enforcement Details (for external permissions):**
- `location`: Where enforcement happens
  - `runtime`: In the generated microservice
  - `platform`: In Backstage plugin
  - `catalog`: In catalog registration
- `mechanism`: How it's enforced (RBAC, API gateway, policy, etc.)

### Spec.SuggestedRoles
Domain-local roles combining permissions.

**Role Fields:**
- `name`: Lowercase role identifier (e.g., "viewer", "operator", "engineer")
- `title`: Display name
- `description`: Role purpose
- `permissions`: List of permission names granted
- `principalType`: Who can have this role (user/group)

### Spec.PlatformRoleMappings
Maps central Platform RBAC roles to domain-local roles.

**Mapping Fields:**
- `platformRole`: Central role (e.g., "viewer", "developer", "owner", "admin")
- `suggestedDomainRole`: Local role that aligns with platform role
- `rationale`: Why this mapping exists

### Spec.AppliesToC
References Backstage entities this profile applies to.

---

## Permission Naming Convention

All permissions follow strict `<domain>.<action>` pattern:

```
<domain>.<action>

Where:
  domain   = lowercase domain identifier (oee, mqtt, equipment, aas, etc.)
  action   = lowercase action verb (read, operate, configure, admin)
  
Examples:
  oee.read           - View OEE results
  oee.operate        - Trigger OEE calculations
  oee.configure      - Configure OEE parameters
  oee.admin          - Administer OEE data product
  
  mqtt.read          - Read MQTT topics
  mqtt.operate       - Publish/Subscribe MQTT
  mqtt.configure     - Configure MQTT settings
  
  equipment.read     - View equipment master data
  equipment.operate  - Query equipment
  equipment.configure- Configure equipment catalog
```

---

## Permission Categories

### Read Permissions
- **Pattern:** `<domain>.read`
- **Function:** Viewing, querying, retrieving data
- **Enforcement:** Usually catalog-level (Backstage permissions)
- **Examples:**
  - `oee.read` - View OEE results
  - `mqtt.read` - Read from MQTT topics
  - `equipment.read` - Query equipment data

### Operate Permissions
- **Pattern:** `<domain>.operate`
- **Function:** Triggering actions, executing workflows
- **Enforcement:** API-level in generated service or Backstage
- **Examples:**
  - `oee.operate` - Trigger OEE calculations
  - `mqtt.operate` - Publish to MQTT
  - `equipment.operate` - Execute equipment queries

### Configure Permissions
- **Pattern:** `<domain>.configure`
- **Function:** Modifying settings, integrations, parameters
- **Enforcement:** Platform admin or data product admin
- **Examples:**
  - `oee.configure` - Configure OEE parameters, MQTT topics
  - `mqtt.configure` - Configure broker settings
  - `equipment.configure` - Configure equipment sources

### Admin Permissions
- **Pattern:** `<domain>.admin`
- **Function:** Full product administration
- **Enforcement:** Platform admin level
- **Examples:**
  - `oee.admin` - Full OEE product administration
  - `mqtt.admin` - Full MQTT component administration

---

## Suggested Domain Roles

Each domain should define 3-5 standard roles:

### Viewer / Consumer
- **Permissions:** `<domain>.read`
- **Use Case:** View-only access to data and results
- **Example:** `oee-viewer` - can view OEE metrics but not configure

### Operator / Analyst
- **Permissions:** `<domain>.read`, `<domain>.operate`
- **Use Case:** Can view and execute operational tasks
- **Example:** `oee-operator` - can view and trigger OEE calculations

### Engineer / Administrator
- **Permissions:** `<domain>.read`, `<domain>.operate`, `<domain>.configure`
- **Use Case:** Full operational and configuration access
- **Example:** `oee-engineer` - can view, operate, and configure OEE

### Admin
- **Permissions:** All domain permissions
- **Use Case:** Full administrative control
- **Example:** `oee-admin` - full OEE product administration

---

## Platform Role Mapping

Central Platform RBAC roles map to domain roles:

| Platform Role | Mapping | Domain Examples |
|--------------|---------|-----------------|
| `viewer` | Consumer role | `oee-viewer`, `mqtt-viewer`, `equipment-viewer` |
| `developer` | Operator/Engineer | `oee-operator`, `mqtt-operator`, `equipment-engineer` |
| `owner` | Engineer/Admin | `oee-engineer`, `mqtt-admin`, `equipment-admin` |
| `admin` | Full admin | `oee-admin`, `mqtt-admin`, `equipment-admin` |

---

## Runtime Enforcement Classification

### IMPLEMENTED
Permission is actively enforced in the generated product code.

**Example:**
```yaml
permissions:
  - name: oee.read
    runtimeEnforcement: IMPLEMENTED
    enforcement:
      location: runtime
      mechanism: fastapi-permission-decorator
      description: REST API endpoint checks user permissions before returning data
```

### EXTERNAL
Permission is enforced by Backstage permission framework, external policy engine, or API gateway.

**Example:**
```yaml
permissions:
  - name: equipment.configure
    runtimeEnforcement: EXTERNAL
    enforcement:
      location: platform
      mechanism: backstage-permission-framework
      description: Backstage platform enforces permission before allowing product modification
```

### NOT_REQUIRED
No runtime enforcement is needed (best effort, informational).

**Example:**
```yaml
permissions:
  - name: aas.read
    runtimeEnforcement: NOT_REQUIRED
    enforcement:
      location: catalog
      mechanism: informational
      description: Purely informational; data is publicly readable from REST API
```

---

## Example: Complete Authorization Profile

```yaml
apiVersion: platform.nexora.io/v1alpha1
kind: AuthorizationProfile
metadata:
  name: oee
  title: OEE Authorization Profile
  namespace: default
  annotations:
    description: Authorization profile for OEE Data Product
    platform: data-product-factory

spec:
  domain: oee
  title: OEE (Overall Equipment Effectiveness) Authorization Profile
  
  permissions:
    - name: oee.read
      title: Read OEE Data
      description: View OEE results, metrics, and time-series data
      category: read
      runtimeEnforcement: IMPLEMENTED
      enforcement:
        location: runtime
        mechanism: fastapi-permission-check
    
    - name: oee.operate
      title: Operate OEE
      description: Trigger OEE calculations and query results
      category: operate
      runtimeEnforcement: IMPLEMENTED
      enforcement:
        location: runtime
        mechanism: fastapi-permission-check
    
    - name: oee.configure
      title: Configure OEE
      description: Configure OEE parameters, MQTT topics, REST endpoints
      category: configure
      runtimeEnforcement: EXTERNAL
      enforcement:
        location: platform
        mechanism: backstage-permission-framework
    
    - name: oee.admin
      title: Administer OEE
      description: Full OEE data product administration
      category: admin
      runtimeEnforcement: EXTERNAL
      enforcement:
        location: platform
        mechanism: backstage-permission-framework
  
  suggestedRoles:
    - name: oee-viewer
      title: OEE Viewer
      description: Read-only access to OEE metrics and results
      permissions:
        - oee.read
      principalType: user
    
    - name: oee-operator
      title: OEE Operator
      description: Operational access to OEE data and calculations
      permissions:
        - oee.read
        - oee.operate
      principalType: user
    
    - name: oee-engineer
      title: OEE Engineer
      description: Full configuration and operational access
      permissions:
        - oee.read
        - oee.operate
        - oee.configure
      principalType: user
    
    - name: oee-admin
      title: OEE Administrator
      description: Full OEE product administration
      permissions:
        - oee.read
        - oee.operate
        - oee.configure
        - oee.admin
      principalType: group
  
  platformRoleMappings:
    - platformRole: viewer
      suggestedDomainRole: oee-viewer
      rationale: Platform viewers map to read-only OEE consumers
    
    - platformRole: developer
      suggestedDomainRole: oee-operator
      rationale: Platform developers map to OEE operators/analysts
    
    - platformRole: owner
      suggestedDomainRole: oee-engineer
      rationale: Platform owners map to full OEE engineers
    
    - platformRole: admin
      suggestedDomainRole: oee-admin
      rationale: Platform admins map to OEE admins
  
  appliesTo:
    - kind: Component
      selector:
        matchLabels:
          nexora.io/authorization-profile: oee
```

---

## Schema Versioning

Current schema version: `platform.nexora.io/v1alpha1`

**Note:** This is an alpha schema. As the authorization framework matures:
- v1alpha1 → v1beta1 → v1 (stable)
- New fields may be added
- Deprecated fields will maintain backwards compatibility

---

## Implementation Notes

1. **One schema per domain:** Each Golden Path gets exactly one `AuthorizationProfile` YAML file
2. **Catalog annotation:** Generated `catalog-info.yaml` references profile via annotation
3. **Discovery:** Authorization Profile Registry loads all profiles and registers permissions
4. **Central mapping:** Platform RBAC registers domain roles in central permission catalog
5. **No duplicates:** Single source of truth per domain (no permission duplication)

---

**Schema version:** v1alpha1  
**Last updated:** 2026-08-26  
**Status:** READY FOR IMPLEMENTATION
