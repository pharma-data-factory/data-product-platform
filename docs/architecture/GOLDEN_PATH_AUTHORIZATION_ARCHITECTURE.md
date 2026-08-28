# Golden Path Authorization Architecture

## Overview

This document describes the complete authorization architecture for the Pharma Data Factory platform, focusing on how domain-specific authorization profiles integrate with central Platform RBAC without duplicating roles or creating runtime dependencies.

---

## Architecture Principles

### 1. Single Central Platform RBAC
- One authority for platform-level roles (Viewer, Developer, Owner, Admin)
- No duplication of central RBAC across products
- Central roles are platform-wide, domain-agnostic

### 2. Domain-Specific Authorization Profiles
- Each Golden Path domain gets exactly one authorization profile
- Profiles define domain-specific permissions and suggested roles
- Profiles are metadata-only (no runtime code in products)

### 3. No Backstage Runtime Dependencies in Generated Products
- Generated microservices are standalone
- No @backstage/* imports in product code
- Authorization enforcement is product-responsible or external

### 4. Metadata-Driven Discovery
- Authorization profiles discoverable from catalog annotations
- Registry automatically populated from profiles
- Central RBAC can query and register domain permissions

### 5. Architecture Boundaries Preserved
- Clean separation: Platform RBAC ↔ Domain profiles ↔ Generated products
- Plugins own integration points
- Products remain deployable independently

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Platform (Backstage)                                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Central Platform RBAC                                   │  │
│  │  - Viewer, Developer, Owner, Admin                       │  │
│  │  - Maps to domain roles (via profile registry)           │  │
│  │  - Permission catalog (24 permissions × 6 domains)       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authorization Discovery Plugin                          │  │
│  │  - Queries catalog for annotated components             │  │
│  │  - Loads authorization.yaml from templates              │  │
│  │  - Populates Authorization Profile Registry             │  │
│  │  - Registers permissions in central RBAC                │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authorization Profile Registry                          │  │
│  │  - Central registry of all domain permissions            │  │
│  │  - All 24 permissions (oee.*, mqtt.*, etc.)             │  │
│  │  - All 24 domain roles                                   │  │
│  │  - Platform ↔ domain role mappings                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Backstage Catalog                                       │  │
│  │  - Components with nexora.io/authorization-profile       │  │
│  │  - Discovery trigger for permissions registration       │  │
│  │  - Link: generated product ↔ domain profile              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Templates (Code Generator)                                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Authorization Profiles (Metadata)                     │    │
│  │  - templates/oee-data-product/authorization.yaml       │    │
│  │  - templates/mqtt-temperature-product/auth*.yaml       │    │
│  │  - templates/rest-equipment-product/auth*.yaml         │    │
│  │  - templates/aas-data-product/authorization.yaml       │    │
│  │  - templates/unified-namespace/authorization.yaml      │    │
│  │  - templates/machine-state-consumer/auth*.yaml         │    │
│  │                                                        │    │
│  │  (6 profiles × 4 permissions = 24 total permissions)   │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │  Scaffolder Templates                                 │    │
│  │  - OEE Data Product template                         │    │
│  │  - MQTT Temperature template                         │    │
│  │  - REST Equipment template                           │    │
│  │  - AAS Data Product template                         │    │
│  │  - Unified Namespace template                        │    │
│  │  - Machine State Consumer template                   │    │
│  │                                                      │    │
│  │  (Generate: source code + catalog-info.yaml)        │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │  Generated catalog-info.yaml                          │    │
│  │  - metadata.annotations with:                         │    │
│  │    nexora.io/authorization-profile: <domain>         │    │
│  │  - Links generated product to domain profile          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Generated Products (GitHub)                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Microservice Code                                     │    │
│  │  - Python FastAPI service                            │    │
│  │  - NO Backstage runtime imports                       │    │
│  │  - NO RBAC code in product                            │    │
│  │  - Standalone, deployable independently              │    │
│  │                                                        │    │
│  │  Examples:                                             │    │
│  │  - my-oee-product (depends on domain: oee)            │    │
│  │  - temp-sensor-data (depends on domain: mqtt)         │    │
│  │  - equipment-catalog (depends on domain: equipment)   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Permission Discovery

```
1. SCAFFOLD (User creates product from template)
   ┌─────────────────────┐
   │ Scaffolder Action   │
   │ fetch:template      │────────→ Generate from template
   │ publish:github      │────────→ Create repo + catalog-info.yaml
   │ catalog:register    │────────→ Register in Backstage catalog
   └─────────────────────┘                    ↓
                                   catalog-info.yaml includes:
                              nexora.io/authorization-profile: oee

2. DISCOVERY (Scheduled hourly)
   ┌─────────────────────────┐
   │ Discovery Plugin        │
   │ (Kubernetes CronJob)    │
   └────────────┬────────────┘
                │
                ├─ Query catalog for components with
                │  nexora.io/authorization-profile annotation
                │
                ├─ Result: [my-oee-product, temp-sensor, ...]
                │
                ├─ For each component:
                │  ├─ Extract domain: "oee"
                │  ├─ Load templates/oee-data-product/authorization.yaml
                │  ├─ Parse permissions: oee.read, oee.operate, ...
                │  ├─ Store in central registry
                │  └─ Register in Platform RBAC
                │
                └─ Update Authorization Profile Registry
                   └─ (indexed by domain)

3. REGISTRATION (Central RBAC)
   ┌──────────────────────────┐
   │ Permission Registration  │
   │ in Central RBAC          │
   └────────────┬─────────────┘
                │
                ├─ Register permission: oee.read
                │  - Title: "Read OEE Data"
                │  - Category: read
                │  - Domain: oee
                │
                ├─ Register domain role: oee-viewer
                │  - Includes: oee.read
                │  - Suggested for: Platform Viewer
                │
                ├─ Register platform mapping:
                │  - Platform Viewer → oee-viewer
                │  - Platform Developer → oee-operator
                │  - Platform Owner → oee-engineer
                │  - Platform Admin → oee-admin
                │
                └─ Query API now works:
                   GET /api/authorization/domains/oee/permissions
                   → Returns: oee.read, oee.operate, oee.configure, oee.admin

4. USAGE (Admin/Operator)
   ┌────────────────────────────────────┐
   │ Platform Admin                     │
   │ View Permission Catalog Dashboard  │
   └────────────────────────────────────┘
   
   Display: All discovered permissions grouped by domain
   ├─ OEE (3 products using this domain)
   │  ├─ oee.read (4 components can read)
   │  ├─ oee.operate (3 components can operate)
   │  ├─ oee.configure (2 components can configure)
   │  └─ oee.admin (1 component admin)
   │
   ├─ MQTT (2 products)
   │  ├─ mqtt.read
   │  ├─ mqtt.operate
   │  ├─ mqtt.configure
   │  └─ mqtt.admin
   │
   └─ [All other domains...]
```

---

## Domain Authorization Profile Structure

```yaml
Domain: oee
├─ Permissions: 4
│  ├─ oee.read (read OEE results)
│  ├─ oee.operate (trigger calculations)
│  ├─ oee.configure (configure parameters)
│  └─ oee.admin (administer product)
│
├─ Suggested Roles: 4
│  ├─ oee-viewer (oee.read)
│  ├─ oee-operator (oee.read + oee.operate)
│  ├─ oee-engineer (all except admin)
│  └─ oee-admin (all permissions)
│
└─ Platform Mappings: 4
   ├─ Platform Viewer → oee-viewer
   ├─ Platform Developer → oee-operator
   ├─ Platform Owner → oee-engineer
   └─ Platform Admin → oee-admin
```

---

## Central Platform RBAC Integration

### Platform Roles (Unchanged)
```
Platform Viewer
├─ Can view/read all components
├─ Suggested domain roles: *-viewer (6 roles)
└─ Permission count: 6 permissions (all .read)

Platform Developer
├─ Can view and perform operations
├─ Suggested domain roles: *-operator/*-subscriber (6 roles)
└─ Permission count: 12 permissions (all .read + .operate)

Platform Owner
├─ Can configure and manage products
├─ Suggested domain roles: *-engineer (6 roles)
└─ Permission count: 18 permissions (all except .admin)

Platform Admin
├─ Full control
├─ Suggested domain roles: *-admin (6 roles)
└─ Permission count: 24 permissions (all)
```

### Permission Catalog Size
```
Total: 24 permissions
├─ Read (6): oee.read, mqtt.read, equipment.read, aas.read, uns.read, machine-state.read
├─ Operate (6): oee.operate, mqtt.operate, equipment.operate, aas.operate, uns.operate, machine-state.operate
├─ Configure (6): oee.configure, mqtt.configure, equipment.configure, aas.configure, uns.configure, machine-state.configure
└─ Admin (6): oee.admin, mqtt.admin, equipment.admin, aas.admin, uns.admin, machine-state.admin

Distribution by enforcement:
├─ IMPLEMENTED (12): .read + .operate from all domains
├─ EXTERNAL (10): .configure from all + some .operate
└─ NOT_REQUIRED (2): uns.read + some informational
```

---

## Architecture Boundaries

### Boundary 1: Template ↔ Generated Product
- Templates contain authorization.yaml (metadata only)
- Generated products contain NO authorization code
- Catalog-info.yaml includes annotation linking back to profile
- **Violation Prevention:** No @backstage imports in generated code

### Boundary 2: Central RBAC ↔ Domain Profiles
- Central RBAC is single instance (central/rbac/)
- Domain profiles are metadata files (templates/*/authorization.yaml)
- Domain profiles suggest roles; central RBAC owns role assignment
- **Violation Prevention:** Profiles are read-only; no RBAC code in profiles

### Boundary 3: Backstage Plugin ↔ Generated Products
- Plugin discovers permissions and populates registry
- Plugin does NOT modify generated products
- Plugin does NOT add dependencies to products
- **Violation Prevention:** No code generation or product modification

### Boundary 4: Authorization ↔ Product Runtime
- Authorization profiles are startup configuration
- Runtime enforcement (if any) is in-product responsibility
- IMPLEMENTED permissions have enforcement in product
- EXTERNAL permissions rely on Backstage/gateway/policy
- **Violation Prevention:** Enforcement is product-managed, not plugin-managed

---

## Implementation Phases

### Phase 1: Profile Discovery ✅ COMPLETE
- [x] 6 authorization.yaml files created
- [x] Central registry defined
- [x] Metadata structure finalized

### Phase 2: Catalog Integration (Implementation)
- [ ] Add `nexora.io/authorization-profile` to generated catalog-info.yaml files
- [ ] Update scaffolder step to inject annotation
- [ ] Test: Generate product and verify annotation

### Phase 3: Discovery Service (Implementation)
- [ ] Implement AuthorizationDiscoveryService (TypeScript)
- [ ] Deploy Kubernetes CronJob
- [ ] Test: Run discovery manually and verify registry population

### Phase 4: RBAC Registration (Implementation)
- [ ] Implement permission registration in central RBAC
- [ ] Register all 24 permissions
- [ ] Register all 24 domain roles
- [ ] Register all platform ↔ domain mappings

### Phase 5: Permission Catalog UI (Enhancement)
- [ ] Build dashboard at /admin/authorization/permissions
- [ ] Display all domains and permissions
- [ ] Drill-down to components using each permission
- [ ] Export permission matrix

### Phase 6: API Endpoints (Enhancement)
- [ ] GET /api/authorization/domains
- [ ] GET /api/authorization/domains/{domain}/permissions
- [ ] GET /api/authorization/domains/{domain}/components
- [ ] GET /api/authorization/domains/{domain}/roles
- [ ] GET /api/authorization/platform-roles/{platform-role}/suggested-domains

### Phase 7: Monitoring & Observables (Enhancement)
- [ ] Metrics: discovery duration, permission registration success
- [ ] Logs: structured discovery logs
- [ ] Alerts: discovery failures, permission registration errors

---

## Security Considerations

### 1. Permission Scope
- Permissions are domain-specific (oee.*, mqtt.*, etc.)
- No cross-domain permissions defined
- Principle of least privilege preserved

### 2. Runtime Enforcement
- IMPLEMENTED permissions: Checked in product code
- EXTERNAL permissions: Checked by Backstage/gateway
- NOT_REQUIRED permissions: Informational only

### 3. Discovery Trust
- Authorization profiles sourced from templates (code repository)
- Discovery is automated but reads only from trusted source
- No user-provided permission definitions

### 4. Catalog Integrity
- Generated products unmodified after creation
- Authorization annotation is read-only (added at generation time)
- No runtime mutation of product code

---

## Scalability

### Current Scope
- 6 domains
- 24 permissions
- 24 suggested roles
- Discovery: hourly batch

### Future Scalability
- **More domains:** Add new templates with authorization.yaml → discovery auto-registers
- **More products:** Scale discovery with pagination (current: 42 components, discovery is O(n) on domain count)
- **Real-time discovery:** Replace CronJob with event-driven triggers
- **Permission auditing:** Add audit log for all permission changes

---

## Deployment

### Prerequisites
- Backstage instance running
- PostgreSQL (for registry storage)
- Kubernetes cluster (for CronJob scheduling)
- Git repository access (for profile loading)

### Installation Steps
1. Deploy discovery service
2. Deploy authorization-profile-registry
3. Add `nexora.io/authorization-profile` annotation to templates
4. Deploy Kubernetes CronJob
5. Run initial discovery manually
6. Verify permissions registered in central RBAC
7. Enable permission catalog UI

### Rollback Plan
- Remove Kubernetes CronJob
- Keep authorization.yaml files (metadata, safe to keep)
- Central RBAC remains functional
- No product runtime changes to rollback

---

## Architecture Decision Records (ADRs)

### ADR-1: Metadata-Only Profiles
**Decision:** Authorization profiles contain only metadata, no runtime code

**Rationale:**
- Generated products remain standalone
- No Backstage runtime dependencies
- Profiles are configuration, not code
- Easier to deploy independently

**Alternative Rejected:** Embed authorization code in products
- Would violate MVP boundary rules
- Would create Backstage dependency

---

### ADR-2: Single Central RBAC
**Decision:** One central Platform RBAC instance, no duplication

**Rationale:**
- Consistency across platform
- Single source of truth
- Easier permission management
- Scales with domain count

**Alternative Rejected:** Per-domain RBAC
- Would require complex synchronization
- Would violate architecture boundaries
- Would create permission silos

---

### ADR-3: Automatic Discovery
**Decision:** Central RBAC discovers permissions automatically from catalog

**Rationale:**
- No manual permission registration
- Scales with new products
- Self-service for developers
- Reduced admin overhead

**Alternative Rejected:** Manual permission registration
- Error-prone
- Doesn't scale
- Inconsistent

---

## Monitoring & Observability

### Metrics
```
authorization_discovery_duration_seconds{domain="oee"}
authorization_permissions_registered_total{domain="oee", category="read"}
authorization_discovery_status{status="success"}
authorization_components_with_permissions_total{domain="oee"}
```

### Logs
```
2026-08-26 14:30:01 INFO  Starting authorization discovery
2026-08-26 14:30:02 INFO  Queried catalog: 42 components, 18 with authorization annotation
2026-08-26 14:30:03 INFO  Loading profile for domain: oee (4 permissions)
2026-08-26 14:30:04 INFO  Registered 4 permissions for domain: oee
2026-08-26 14:30:05 INFO  Discovery completed: 6 domains, 24 permissions, 6.2s elapsed
```

### Alerting
- Discovery failure after 3 retries
- Permission registration timeout
- Missing authorization.yaml for annotated component
- Permission conflict detection

---

## Conclusion

The Golden Path Authorization Architecture provides:
✅ Single central Platform RBAC (no duplication)  
✅ Domain-specific authorization profiles (metadata)  
✅ No Backstage runtime dependencies in products  
✅ Automatic discovery and registration  
✅ Clean architecture boundaries  
✅ Backward compatible  
✅ Scalable to future domains  

**Status:** ✅ READY FOR IMPLEMENTATION

---

**Last updated:** 2026-08-26  
**Version:** 1.0.0
