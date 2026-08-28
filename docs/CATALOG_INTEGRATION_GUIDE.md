# Catalog Integration Guide: Authorization Profiles

## Overview

Golden Path templates integrate authorization profiles with Backstage catalog through standardized annotations. Generated `catalog-info.yaml` files reference authorization profiles, enabling central RBAC discovery.

---

## Catalog Annotation

Add this annotation to generated `catalog-info.yaml` Component metadata:

```yaml
metadata:
  annotations:
    nexora.io/authorization-profile: <domain>
```

### Annotation Format

| Field | Value | Example |
|-------|-------|---------|
| Namespace | `nexora.io` | Platform domain |
| Key | `authorization-profile` | Standard annotation key |
| Value | Domain name | `oee`, `mqtt`, `equipment`, `aas`, `uns`, `machine-state` |

---

## Integration in Generated Templates

### OEE Data Product

**Template:** `templates/oee-data-product/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: oee
```

**Full annotation example:**
```yaml
metadata:
  annotations:
    # ... existing annotations ...
    nexora.io/authorization-profile: oee
    dataprod.platform/kind: data-product
    dataprod.platform/domain: manufacturing
    # ... more annotations ...
```

### MQTT Temperature Data Product

**Template:** `templates/mqtt-temperature-product/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: mqtt
```

### REST Equipment Data Product

**Template:** `templates/rest-equipment-product/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: equipment
```

### AAS Data Product

**Template:** `templates/aas-data-product/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: aas
```

### Unified Namespace

**Template:** `templates/unified-namespace/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: uns
```

### Machine State Consumer

**Template:** `templates/machine-state-consumer/content/catalog-info.yaml`

Add to `metadata.annotations`:
```yaml
nexora.io/authorization-profile: machine-state
```

---

## How Discovery Works

### 1. Template Generation
When a user creates a data product from a Golden Path template:
- Scaffolder generates `catalog-info.yaml`
- **Now includes:** `nexora.io/authorization-profile: <domain>`
- Publishes to GitHub repository

### 2. Catalog Registration
Scaffolder registers catalog-info.yaml in Backstage:
```yaml
- id: register
  name: Register Data Product
  action: catalog:register
  input:
    repoContentsUrl: ${{ steps['publish'].output.repoContentsUrl }}
    catalogInfoPath: /catalog-info.yaml
```

Component appears in Backstage catalog with authorization annotation.

### 3. Authorization Discovery
Backstage plugin discovers authorization profiles:

**Discovery workflow:**
1. Query catalog for all Components
2. Filter Components with `nexora.io/authorization-profile` annotation
3. Load corresponding `authorization.yaml` from template
4. Register domain permissions in central authorization registry
5. Map to central Platform RBAC roles

**Query example:**
```yaml
selector:
  matchLabels:
    nexora.io/authorization-profile: oee
```

### 4. Central RBAC Integration
Platform Admin views discovered permissions:
- Component name: `my-oee-product`
- Domain: `oee`
- Permissions: `oee.read`, `oee.operate`, `oee.configure`, `oee.admin`
- Suggested roles: `oee-viewer`, `oee-operator`, `oee-engineer`, `oee-admin`
- Platform mapping: `viewer → oee-viewer`, `developer → oee-operator`, etc.

---

## Update Instructions for Templates

### For Each Golden Path Template

**File to modify:** `templates/<path>/content/catalog-info.yaml`

**Action:** Add annotation after line with existing `dataprod.platform/*` annotations

**Before:**
```yaml
metadata:
  name: ${{ values.name }}
  title: ${{ values.title }}
  description: ${{ values.description }}
  tags:
    - data-product
    - oee
  annotations:
    github.com/project-slug: ${{ values.destination.owner }}/${{ values.destination.repo }}
    backstage.io/techdocs-ref: dir:.
    dataprod.platform/kind: data-product
    # ... more annotations ...
```

**After:**
```yaml
metadata:
  name: ${{ values.name }}
  title: ${{ values.title }}
  description: ${{ values.description }}
  tags:
    - data-product
    - oee
  annotations:
    github.com/project-slug: ${{ values.destination.owner }}/${{ values.destination.repo }}
    backstage.io/techdocs-ref: dir:.
    nexora.io/authorization-profile: oee  # ← ADD THIS
    dataprod.platform/kind: data-product
    # ... more annotations ...
```

---

## Annotation Placement

**Rule:** Add `nexora.io/authorization-profile` immediately after `backstage.io/*` annotations and before `dataprod.platform/*` annotations, for readability.

**Logical order:**
1. Standard Backstage annotations (`backstage.io/*`)
2. **Authorization annotation** (`nexora.io/authorization-profile`)
3. Platform-specific annotations (`dataprod.platform/*`)
4. Custom annotations

---

## Verification

### Step 1: Check template catalog-info.yaml
```bash
grep "nexora.io/authorization-profile" templates/oee-data-product/content/catalog-info.yaml
# Should output: nexora.io/authorization-profile: oee
```

### Step 2: Generate test product
Create test data product from template and verify generated `catalog-info.yaml`:
```bash
grep "nexora.io/authorization-profile" generated-repo/catalog-info.yaml
# Should output: nexora.io/authorization-profile: oee
```

### Step 3: Query catalog
```bash
curl -s http://backstage:7000/api/catalog/entities \
  ?filter=metadata.annotations.nexora.io/authorization-profile=oee
# Should return all OEE data products
```

---

## Multi-Domain Products (Future)

If a product references multiple domains:

```yaml
metadata:
  annotations:
    nexora.io/authorization-profile: "oee,mqtt"  # Comma-separated
```

For now, all Golden Paths map to a single domain.

---

## Impact on Existing Products

### Already Generated Products
Previously generated products DO NOT have the annotation.

**Options:**
1. **Automatic migration:** Backstage admin tool updates catalog-info.yaml in existing repos
2. **Manual update:** Update repos one by one
3. **No action:** Only new products get annotation (discovery is incremental)

**Recommended:** Implement automatic migration to ensure all products register permissions.

---

## Backward Compatibility

**Annotation is optional** for existing products:
- Without annotation: Product appears in catalog normally
- With annotation: Product's domain permissions register in central RBAC
- No breaking changes to existing products

---

## Related Files

| File | Purpose |
|------|---------|
| `templates/oee-data-product/authorization.yaml` | OEE permissions definition |
| `templates/mqtt-temperature-product/authorization.yaml` | MQTT permissions definition |
| `templates/rest-equipment-product/authorization.yaml` | Equipment permissions definition |
| `templates/aas-data-product/authorization.yaml` | AAS permissions definition |
| `templates/unified-namespace/authorization.yaml` | UNS permissions definition |
| `templates/machine-state-consumer/authorization.yaml` | Machine State permissions definition |
| `docs/architecture/authorization-profile-registry.yaml` | Central registry (auto-populated) |
| `docs/architecture/AUTHORIZATION_SCHEMA_REFERENCE.md` | Schema documentation |

---

## API Integration (Future)

Backstage Authorization API can query discovered permissions:

```javascript
// Query all permissions for a domain
GET /api/authorization/domains/oee/permissions
// Returns: oee.read, oee.operate, oee.configure, oee.admin

// Query domain roles for a permission
GET /api/authorization/permissions/oee.read/roles
// Returns: oee-viewer, oee-operator, oee-engineer, oee-admin

// Query domain permissions for a catalog component
GET /api/authorization/components/my-oee-product/permissions
// Returns: Component's domain permissions from profile
```

---

## Summary

✅ Authorization profiles created for all 6 Golden Paths  
✅ Registry created with all domain permissions  
✅ Annotation format defined (`nexora.io/authorization-profile: <domain>`)  
✅ Integration into catalog-info.yaml templates  
✅ Discovery mechanism documented  
✅ Central RBAC mapping defined  

**Next steps:**
1. Update all catalog-info.yaml templates with annotation
2. Test template generation and catalog registration
3. Verify discovery mechanism in Backstage plugin
4. Implement central RBAC discovery API

---

**Last updated:** 2026-08-26  
**Status:** READY FOR IMPLEMENTATION
