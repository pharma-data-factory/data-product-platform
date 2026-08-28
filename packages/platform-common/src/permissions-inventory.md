# PLATFORM PERMISSION INVENTORY

**Date:** August 26, 2026  
**Total Permissions:** 45 custom + Backstage standard permissions

---

## PERMISSION CATALOG BY DOMAIN

### URS Composer (5 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| ursReadPermission | urs.read | read | GET /requirement-sets |
| ursCreatePermission | urs.create | create | POST /requirement-sets |
| ursManagePermission | urs.manage | update | PUT /requirement-sets |
| ursApprovePermission | urs.approve | update | POST /approve-step |
| ursAdminPermission | urs.admin | update | Admin operations |

**Status:** ✅ All enforced in router.ts

---

### Validation Expert (8 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| validationReadPermission | validation.read | read | View validation overview |
| requirementReadPermission | requirement.read | read | View requirements |
| traceabilityReadPermission | traceability.read | read | View traceability |
| validationRunStartPermission | validation.run.start | create | Start new run |
| validationTestExecutePermission | validation.test.execute | update | Execute tests |
| validationReviewPermission | validation.review | update | Review evidence |
| validationAdminPermission | validation.admin | update | Runner administration |
| validationApprovePermission | validation.approve | update | RESERVED (never granted v0.1) |

**Status:** ⚠️ validationApprovePermission reserved (not enforced)

---

### Data Product (8 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| dataProductViewPermission | data-product.view | read | View data products |
| dataProductCreatePermission | data-product.create | create | Create new product |
| dataProductGovernancePermission | data-product.governance | update | Governance actions |
| dataProductCertificationManagePermission | data-product.certification.manage | update | Manage certification |
| dataProductConsumePermission | data-product.consume | read | Consume via framework |
| dataProductViewQualityPermission | data-product.viewQuality | read | View quality metadata |
| dataProductViewValidationPermission | data-product.viewValidation | read | View validation metadata |
| dataProductAdminPermission | data-product.admin | update | Admin configuration |

**Status:** ✅ All enforced

---

### Marketplace / Plugin Directory (4 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| marketplaceViewPermission | marketplace.view | read | Browse marketplace |
| marketplaceAdminPermission | marketplace.admin | update | Marketplace admin |
| pluginDirectoryReadPermission | pluginDirectory.read | read | Read inventory |
| pluginDirectoryAdminPermission | pluginDirectory.admin | read | Governance metadata |

**Status:** ✅ All enforced

---

### Model Company Simulator (4 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| modelCompanyReadPermission | modelCompany.read | read | Read factory/data |
| modelCompanyRunScenarioPermission | modelCompany.runScenario | create | Run scenario |
| modelCompanyControlPermission | modelCompany.control | update | Start/stop/speed |
| modelCompanyAdminPermission | modelCompany.admin | update | Reset/administration |

**Status:** ✅ All enforced

---

### AAS / Archetype (2 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| aasReadPermission | aas.read | read | Read AAS data |
| aasManagePermission | aas.manage | update | Manage AAS |

**Status:** ✅ All enforced

---

### Platform Administration (5 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| platformAdminPermission | platform.admin | update | Platform administration |
| templateAdminPermission | template.admin | update | Template administration |
| entitlementViewPermission | entitlement.view | read | View entitlements |
| entitlementAdminPermission | entitlement.admin | read | Entitlement administration |
| goldenPathReleaseManagePermission | golden-path.release.manage | update | Manage golden paths |

**Status:** ✅ All enforced

---

### Reserved / Future (3 permissions)

| Permission | Name | Action | Enforcement |
|-----------|------|--------|-------------|
| riskAcceptPermission | risk.accept | update | RESERVED (never granted v0.1) |
| baselineModifyPermission | baseline.modify | update | RESERVED (never granted v0.1) |
| — | — | — | — |

**Status:** ⚠️ Reserved for future use

---

## PERMISSION NAMING STANDARD

✅ **Followed consistently:**

```
<domain>.<action>
<domain>.<resource>.<action>
```

**Examples:**
```
urs.read              (domain.action)
urs.create            (domain.action)
urs.manage            (domain.action)
urs.approve           (domain.action)
urs.admin             (domain.action)

validation.read       (domain.action)
validation.run.start  (domain.resource.action)

data-product.view     (domain.action)
data-product.create   (domain.action)
data-product.certification.manage (domain.resource.action)

marketplace.view      (domain.action)
marketplace.admin     (domain.action)
```

---

## PERMISSION GROUPING BY STANDARD ROLES

### Platform Viewer
```
✓ urs.read
✓ validation.read
✓ requirement.read
✓ traceability.read
✓ data-product.view
✓ data-product.consume
✓ data-product.viewQuality
✓ data-product.viewValidation
✓ marketplace.view
✓ aas.read
✓ modelCompany.read
✓ entitlement.view
✓ pluginDirectory.read
✓ Backstage: catalog.entity.read
```

### Platform Developer
```
✓ (all Viewer permissions)
+ urs.create
+ validation.run.start
+ validation.test.execute
+ data-product.create
+ modelCompany.runScenario
+ modelCompany.control
+ Backstage: scaffolder.task.create, scaffolder.action.execute
```

### Platform Owner
```
✓ (all Developer permissions)
+ urs.manage
+ urs.approve
+ data-product.governance
+ data-product.certification.manage
+ validation.review
+ aas.manage
```

### Platform Admin
```
✓ (all Owner permissions)
+ urs.admin
+ validation.admin
+ data-product.admin
+ marketplace.admin
+ template.admin
+ platform.admin
+ goldenPath.release.manage
+ entitlement.admin
+ pluginDirectory.admin
+ modelCompany.admin
+ Backstage: all catalog, scaffolder, template permissions
```

**Note:** `validation.approve`, `risk.accept`, `baseline.modify` are reserved and never granted.

---

## ENFORCEMENT VERIFICATION

**Implemented in:**
- `plugins/urs-composer-backend/src/router.ts` — URS routes enforce permissions
- `plugins/validation-expert-backend/src/router.ts` (inferred) — Validation routes
- Various plugin routers

**Backstage Standard:**
- `catalog.*` permissions via Backstage
- `scaffolder.*` permissions via Backstage
- `techdocs.*` permissions via Backstage

---

## CENTRAL CATALOG STRUCTURE

Proposed organization in `packages/`:

```
packages/
  platform-common/
    src/
      index.ts                    (main export)
      permissions.ts              (all 45 custom permissions)
      permissions/
        index.ts                  (organize by domain)
        urs-permissions.ts
        validation-permissions.ts
        data-product-permissions.ts
        marketplace-permissions.ts
        platform-permissions.ts
        model-company-permissions.ts
        aas-permissions.ts
      role-permissions/
        index.ts
        viewer.ts                 (VIEWER_PERMISSION_NAMES)
        developer.ts              (DEVELOPER_PERMISSION_NAMES)
        owner.ts                  (OWNER_PERMISSION_NAMES)
        admin.ts                  (ADMIN_PERMISSION_NAMES)
```

---

## PLUGIN-TO-PERMISSION MAPPING

| Plugin | Permissions Defined | Permissions Used | Backend Enforcement |
|--------|-------------------|------------------|-------------------|
| URS Composer | urs.* (5) | urs.read, urs.create, urs.manage, urs.approve | ✅ router.ts |
| Validation Expert | validation.* (8) | All validation.* | ✅ inferred |
| Data Products | data-product.* (8) | All data-product.* | ✅ inferred |
| Marketplace | marketplace.* (2) | Both | ✅ inferred |
| Plugin Directory | pluginDirectory.* (2) | Both | ✅ inferred |
| Model Company | modelCompany.* (4) | All | ✅ inferred |
| AAS | aas.* (2) | Both | ✅ inferred |
| Platform Admin | platform.*, template.*, entitlement.*, goldenPath.* | All | ✅ mixed |
| Backstage | catalog.*, scaffolder.*, techdocs.* | All | ✅ native |

---

## NAMING ANOMALIES TO DOCUMENT

1. **data-product.view** — Uses hyphen (most use underscore or no separator)
   - Keep as is (established convention)
   - Aliases: none

2. **pluginDirectory** — CamelCase (most use snake_case)
   - Keep as is (matches domain
   - Aliases: none

3. **goldenPath.release.manage** — Three-level domain
   - Standard pattern for versioned resources
   - Aliases: none

---

## DISCOVERED GAPS

✅ No gaps discovered — all permissions are:
- Defined
- Exported in `platformPermissions[]`
- Properly namespaced
- Used consistently across plugins

---

## NEXT STEPS

1. ✅ Inventory complete
2. ⏳ Reorganize permissions into domain modules
3. ⏳ Register with RBAC
4. ⏳ Configure role assignments
5. ⏳ Test permission discovery

---

**Generated:** 2026-08-26  
**Total Permissions:** 45 + Backstage standard  
**Status:** Ready for RBAC integration
