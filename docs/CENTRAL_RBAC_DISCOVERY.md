# Central RBAC Discovery Implementation

## Overview

Central RBAC discovery enables the Platform Admin to discover, register, and manage permissions from all Golden Path domains automatically. This document specifies the discovery mechanism, API, and implementation patterns.

---

## Architecture

```
┌─────────────────────────────────────────┐
│   Generated Data Products               │
│   (Backstage Catalog Components)        │
│   + nexora.io/authorization-profile    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Catalog Query Service                 │
│   (Query catalog by annotation)          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Authorization Discovery Plugin        │
│   (Load authorization.yaml per domain)  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Authorization Profile Registry        │
│   (Central registry of permissions)     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Central Platform RBAC                 │
│   (Register domain permissions)         │
│   (Enable/disable per Platform Admin)   │
└─────────────────────────────────────────┘
```

---

## Discovery Process

### Phase 1: Catalog Scanning

**Trigger:** Scheduled (hourly) or manual (on-demand)

**Process:**
1. Query Backstage catalog for all Components
2. Filter Components with `nexora.io/authorization-profile` annotation
3. Extract domain name from annotation value

**SQL-like pseudocode:**
```sql
SELECT name, domain, repo_url 
FROM catalog_components
WHERE annotations['nexora.io/authorization-profile'] IS NOT NULL
ORDER BY domain
```

**Example result:**
```
name                  domain       repo_url
────────────────────────────────────────────
my-oee-product       oee          github.com/pharma/my-oee
temp-sensor-data     mqtt         github.com/pharma/temp-sensor
equipment-catalog    equipment    github.com/pharma/equipment
asset-registry       aas          github.com/pharma/assets
```

### Phase 2: Profile Loading

**For each unique domain:**

1. Locate authorization.yaml
   - **Source:** `templates/<template-name>/authorization.yaml`
   - **Where:** Central repository (data-product-platform)

2. Load AuthorizationProfile CRD
   - Parse YAML
   - Validate schema

3. Extract permissions
   - Permission name (e.g., `oee.read`)
   - Permission title and description
   - Category (read/operate/configure/admin)
   - Runtime enforcement status

**Example:**
```yaml
Domain: oee
Permissions:
  - oee.read (IMPLEMENTED)
  - oee.operate (IMPLEMENTED)
  - oee.configure (EXTERNAL)
  - oee.admin (EXTERNAL)
```

### Phase 3: Registry Population

**Central Authorization Registry:**

```yaml
apiVersion: platform.nexora.io/v1alpha1
kind: AuthorizationProfileRegistry
metadata:
  name: platform-authorization-registry

spec:
  profiles:
    - name: oee
      domain: oee
      permissions: [oee.read, oee.operate, oee.configure, oee.admin]
      componentCount: 3
      suggestedRoles: [oee-viewer, oee-operator, oee-engineer, oee-admin]
```

### Phase 4: Platform RBAC Registration

**Central Platform RBAC:**

```typescript
// Pseudo-code: Register discovered permissions
interface DiscoveredPermission {
  domain: string;           // "oee"
  permission: string;       // "oee.read"
  title: string;           // "Read OEE Data"
  category: string;        // "read"
  runtimeEnforcement: string; // "IMPLEMENTED"
}

interface DomainRole {
  domain: string;          // "oee"
  role: string;            // "oee-viewer"
  permissions: string[];   // ["oee.read"]
}

// Register in central RBAC
platformRbac.registerDomainPermissions([
  {
    domain: "oee",
    permission: "oee.read",
    title: "Read OEE Data",
    category: "read",
    runtimeEnforcement: "IMPLEMENTED"
  },
  // ... all permissions from all domains ...
]);

// Register domain roles
platformRbac.registerDomainRoles([
  {
    domain: "oee",
    role: "oee-viewer",
    permissions: ["oee.read"]
  },
  // ... all domain roles ...
]);
```

---

## Discovery API

### REST Endpoints

#### 1. Query Discovered Permissions

```
GET /api/authorization/domains/{domain}/permissions
```

**Response:**
```json
{
  "domain": "oee",
  "permissions": [
    {
      "name": "oee.read",
      "title": "Read OEE Data",
      "description": "View OEE results and metrics",
      "category": "read",
      "runtimeEnforcement": "IMPLEMENTED"
    },
    {
      "name": "oee.operate",
      "title": "Operate OEE",
      "description": "Trigger OEE calculations",
      "category": "operate",
      "runtimeEnforcement": "IMPLEMENTED"
    },
    // ... more permissions ...
  ]
}
```

#### 2. Query All Domains

```
GET /api/authorization/domains
```

**Response:**
```json
{
  "domains": [
    {
      "name": "oee",
      "title": "OEE",
      "status": "active",
      "permissions": 4,
      "roles": 4,
      "components": 3
    },
    {
      "name": "mqtt",
      "title": "MQTT",
      "status": "active",
      "permissions": 4,
      "roles": 4,
      "components": 2
    },
    // ... all domains ...
  ]
}
```

#### 3. Query Components by Domain

```
GET /api/authorization/domains/{domain}/components
```

**Response:**
```json
{
  "domain": "oee",
  "components": [
    {
      "name": "my-oee-product",
      "owner": "user:default/john",
      "lifecycle": "production",
      "repo": "github.com/pharma-data-factory/my-oee-product",
      "permissions": ["oee.read", "oee.operate"]
    },
    // ... more components ...
  ]
}
```

#### 4. Query Suggested Roles

```
GET /api/authorization/domains/{domain}/roles
```

**Response:**
```json
{
  "domain": "oee",
  "roles": [
    {
      "name": "oee-viewer",
      "title": "OEE Viewer",
      "permissions": ["oee.read"]
    },
    {
      "name": "oee-operator",
      "title": "OEE Operator",
      "permissions": ["oee.read", "oee.operate"]
    },
    // ... more roles ...
  ]
}
```

#### 5. Query Platform Role Mapping

```
GET /api/authorization/platform-roles/{platform-role}/suggested-domains
```

**Response:**
```json
{
  "platformRole": "developer",
  "suggestedDomainRoles": {
    "oee": "oee-operator",
    "mqtt": "mqtt-operator",
    "equipment": "equipment-operator",
    "aas": "aas-operator",
    "uns": "uns-subscriber",
    "machine-state": "machine-state-operator"
  }
}
```

---

## Implementation Pattern

### TypeScript/Node.js Discovery Service

```typescript
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import * as yaml from 'js-yaml';

interface DiscoveredProfile {
  domain: string;
  permissions: Permission[];
  suggestedRoles: DomainRole[];
}

class AuthorizationDiscoveryService {
  constructor(
    private catalogClient: CatalogClient,
    private templateRepository: TemplateRepository
  ) {}

  async discoverProfiles(): Promise<DiscoveredProfile[]> {
    // Phase 1: Query catalog
    const components = await this.getCatalogComponentsByAnnotation(
      'nexora.io/authorization-profile'
    );

    // Phase 2: Group by domain
    const domainComponents = this.groupByDomain(components);

    // Phase 3: Load profiles
    const profiles: DiscoveredProfile[] = [];
    for (const [domain, comps] of domainComponents.entries()) {
      const profile = await this.loadProfileForDomain(domain);
      profiles.push(profile);
    }

    return profiles;
  }

  private async getCatalogComponentsByAnnotation(
    annotation: string
  ): Promise<Entity[]> {
    // Query catalog filter API
    const result = await this.catalogClient.getEntities({
      filter: {
        'metadata.annotations': {
          [annotation]: undefined // Any value
        }
      }
    });
    return result.items;
  }

  private groupByDomain(components: Entity[]): Map<string, Entity[]> {
    const map = new Map<string, Entity[]>();
    for (const component of components) {
      const domain = (component.metadata.annotations as Record<string, any>)?.[
        'nexora.io/authorization-profile'
      ] as string;
      if (domain) {
        if (!map.has(domain)) {
          map.set(domain, []);
        }
        map.get(domain)!.push(component);
      }
    }
    return map;
  }

  private async loadProfileForDomain(
    domain: string
  ): Promise<DiscoveredProfile> {
    // Load authorization.yaml from template
    const profileYaml = await this.templateRepository.loadAuthorizationProfile(
      domain
    );

    const profileObj = yaml.load(profileYaml) as any;

    return {
      domain: profileObj.spec.domain,
      permissions: profileObj.spec.permissions,
      suggestedRoles: profileObj.spec.suggestedRoles
    };
  }
}
```

---

## Scheduling Discovery

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: authorization-discovery
  namespace: data-product-platform
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: authorization-discoverer
          containers:
          - name: discovery
            image: registry.example.com/discovery:1.0.0
            env:
            - name: BACKSTAGE_URL
              value: http://backstage:7007
            - name: TEMPLATE_REPO_URL
              value: https://github.com/pharma-data-factory/data-product-platform
          restartPolicy: OnFailure
      backoffLimit: 3
```

### Backstage Plugin Integration

```typescript
// Register discovery scheduler in Backstage backend
export const createBackend = createBackendModule({
  pluginId: 'authorization',
  register(reg) {
    reg.registerInit({
      deps: {
        scheduler: coreServices.scheduler,
        discovery: coreServices.discovery
      },
      async init({ scheduler, discovery }) {
        const service = new AuthorizationDiscoveryService(...);
        
        // Run discovery every hour
        scheduler.schedule({
          frequency: { minutes: 60 },
          fn: () => service.discoverProfiles()
        });
      }
    });
  }
});
```

---

## Permission Registration

### Register in Platform RBAC

```typescript
interface RegisterPermissionInput {
  domain: string;
  permission: string;
  title: string;
  category: string;
  runtimeEnforcement: string;
}

interface RegisterRoleInput {
  domain: string;
  role: string;
  permissions: string[];
}

class CentralRbacService {
  async registerDomainPermissions(
    permissions: RegisterPermissionInput[]
  ): Promise<void> {
    // Store in permission catalog
    for (const perm of permissions) {
      await this.permissionCatalog.register({
        id: `${perm.domain}.${perm.permission}`,
        title: perm.title,
        category: perm.category,
        runtimeEnforcement: perm.runtimeEnforcement
      });
    }
  }

  async registerDomainRoles(roles: RegisterRoleInput[]): Promise<void> {
    // Store domain roles
    for (const role of roles) {
      await this.roleCatalog.register({
        id: `${role.domain}:${role.role}`,
        domain: role.domain,
        role: role.role,
        permissions: role.permissions
      });
    }
  }

  async mapPlatformRoles(): Promise<void> {
    // Map platform roles to domain roles
    const mappings = [
      { platform: 'viewer', domain: 'oee', role: 'oee-viewer' },
      { platform: 'developer', domain: 'oee', role: 'oee-operator' },
      { platform: 'owner', domain: 'oee', role: 'oee-engineer' },
      { platform: 'admin', domain: 'oee', role: 'oee-admin' },
      // ... all mappings ...
    ];

    for (const mapping of mappings) {
      await this.roleCatalog.registerMapping(
        `platform:${mapping.platform}`,
        `${mapping.domain}:${mapping.role}`
      );
    }
  }
}
```

---

## Permission Catalog UI

### Permission Discovery Dashboard

Location: `/admin/authorization/permissions`

**Features:**
- List all discovered domains
- Drill down to domain permissions
- View permission details (title, category, enforcement)
- View domain roles and platform role mappings
- Search permissions across all domains
- Export permission matrix

**Example view:**

```
┌────────────────────────────────────────────────────────┐
│ Domain Permissions Catalog                              │
├────────────────────────────────────────────────────────┤
│ Domains: 6  │  Permissions: 24  │  Roles: 24           │
├────────────────────────────────────────────────────────┤
│                                                          │
│ Filter by domain:  [All] [OEE] [MQTT] [Equipment]      │
│                                                          │
│ OEE (Manufacturing)                        Certified    │
│ ├─ oee.read       (Read)      IMPLEMENTED              │
│ ├─ oee.operate    (Operate)   IMPLEMENTED              │
│ ├─ oee.configure  (Configure) EXTERNAL                 │
│ └─ oee.admin      (Admin)     EXTERNAL                 │
│                                                          │
│ MQTT (Manufacturing)                       Certified    │
│ ├─ mqtt.read      (Read)      IMPLEMENTED              │
│ ├─ mqtt.operate   (Operate)   IMPLEMENTED              │
│ ├─ mqtt.configure (Configure) EXTERNAL                 │
│ └─ mqtt.admin     (Admin)     EXTERNAL                 │
│                                                          │
│ Equipment (Manufacturing)                  Certified    │
│ ├─ equipment.read...                                    │
│                                                          │
│ (showing 6 of 6 domains)                               │
└────────────────────────────────────────────────────────┘
```

---

## Status Tracking

### Discovery Status

Track discovery status for auditing and monitoring:

```yaml
apiVersion: platform.nexora.io/v1alpha1
kind: DiscoveryStatus
metadata:
  name: latest-discovery
  namespace: default

status:
  discoveryTime: "2026-08-26T14:30:00Z"
  status: COMPLETED
  
  catalogScanned:
    total: 42
    withAnnotation: 18
  
  profilesLoaded:
    total: 6
    successful: 6
    failed: 0
  
  permissionsRegistered:
    total: 24
    successful: 24
    failed: 0
  
  rolesRegistered:
    total: 24
    successful: 24
    failed: 0
  
  components:
    - domain: oee
      count: 3
      status: REGISTERED
    - domain: mqtt
      count: 2
      status: REGISTERED
    - domain: equipment
      count: 2
      status: REGISTERED
    - domain: aas
      count: 2
      status: REGISTERED
    - domain: uns
      count: 1
      status: REGISTERED
    - domain: machine-state
      count: 1
      status: REGISTERED
```

---

## Failure Handling

### Discovery Failures

**Scenario 1:** Authorization.yaml missing

```
WARN: Profile not found for domain "oee"
      File: templates/oee-data-product/authorization.yaml
      Component: my-oee-product
      Action: Skipped (component not registered for permissions)
```

**Scenario 2:** Profile parsing error

```
ERROR: Failed to parse profile
       Domain: mqtt
       Error: Invalid YAML syntax in templates/mqtt-temperature-product/authorization.yaml
       Action: Manual review required
```

**Scenario 3:** Catalog query timeout

```
ERROR: Catalog query timeout after 30s
       Retrying in 5 minutes...
       Attempt: 1/3
```

---

## Monitoring & Observables

### Metrics

```
# Discovery duration
authorization_discovery_duration_seconds{domain="oee"}

# Permissions registered
authorization_permissions_registered_total{domain="oee", category="read"}

# Discovery status
authorization_discovery_status{status="success"}

# Components with permissions
authorization_components_with_permissions_total{domain="oee"}
```

### Logs

```
2026-08-26 14:30:01 INFO  Starting authorization discovery
2026-08-26 14:30:02 INFO  Queried catalog: 42 components, 18 with authorization annotation
2026-08-26 14:30:03 INFO  Loading profile for domain: oee
2026-08-26 14:30:04 INFO  Loaded permissions: oee.read, oee.operate, oee.configure, oee.admin
2026-08-26 14:30:05 INFO  Registering 4 permissions for domain: oee
2026-08-26 14:30:06 INFO  Registering 4 roles for domain: oee
2026-08-26 14:30:07 INFO  Discovery completed in 6.2s
```

---

## Summary

✅ Discovery mechanism documented  
✅ Multi-phase process defined (scan → load → register → map)  
✅ REST API endpoints specified  
✅ TypeScript implementation pattern provided  
✅ Kubernetes scheduling defined  
✅ Permission catalog dashboard outlined  
✅ Status tracking and monitoring configured  
✅ Failure handling documented  

**Next steps:**
1. Implement TypeScript service
2. Deploy Kubernetes CronJob
3. Register REST API endpoints in Backstage
4. Build permission catalog UI
5. Configure monitoring

---

**Last updated:** 2026-08-26  
**Status:** READY FOR IMPLEMENTATION
