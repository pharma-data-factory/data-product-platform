# Platform RBAC Roles Configuration

**Generated:** August 26, 2026  
**Purpose:** Define role-to-permission mappings for the central platform RBAC capability  
**Administration:** RBAC Admin UI (Admin → Access Control → Roles)

---

## Core Platform Roles

These roles define the fundamental access tiers available to all users on the platform.

### Platform Viewer

**Permissions:**
- `catalog.entity.read` (Backstage)
- `catalog.location.read` (Backstage)
- `urs.read`
- `validation.read`
- `requirement.read`
- `traceability.read`
- `data-product.view`
- `data-product.consume`
- `data-product.viewQuality`
- `data-product.viewValidation`
- `marketplace.view`
- `pluginDirectory.read`
- `aas.read`
- `modelCompany.read`
- `entitlement.view`

**Use Case:** Read-only access to all platform artifacts, documentation, and data products.

**Recommended Groups:** `platform-viewers`

---

### Platform Developer

**Inherits:** Platform Viewer

**Additional Permissions:**
- `catalog.entity.create` (Backstage)
- `catalog.entity.refresh` (Backstage)
- `scaffolder.task.create` (Backstage)
- `scaffolder.task.read` (Backstage)
- `scaffolder.action.execute` (Backstage)
- `scaffolder.template.parameter.read` (Backstage)
- `urs.create`
- `validation.run.start`
- `validation.test.execute`
- `data-product.create`
- `modelCompany.runScenario`
- `modelCompany.control`

**Use Case:** Create and experiment with platform resources, run validation, manage data products.

**Recommended Groups:** `data-product-developers`, `urs-authors`, `validation-reviewers`

---

### Platform Owner

**Inherits:** Platform Developer

**Additional Permissions:**
- `data-product.governance`
- `data-product.certification.manage`
- `urs.manage`
- `urs.approve`
- `validation.review`
- `aas.manage`

**Use Case:** Own, govern, and approve platform resources; manage certifications.

**Recommended Groups:** `data-product-owners`, `urs-owners`

---

### Platform Admin

**Includes All Permissions:**
- All Platform Owner permissions
- `catalog.entity.delete` (Backstage)
- `catalog.location.create` (Backstage)
- `catalog.location.delete` (Backstage)
- `catalog.entity.validate` (Backstage)
- `catalog.entity.refresh` (Backstage)
- `scaffolder.template.management` (Backstage)
- `urs.admin`
- `validation.admin`
- `data-product.admin`
- `marketplace.admin`
- `pluginDirectory.admin`
- `template.admin`
- `platform.admin`
- `goldenPath.release.manage`
- `entitlement.admin`
- `modelCompany.admin`

**Use Case:** Full platform administration, policy management, plugin governance.

**Recommended Groups:** `platform-admins`

---

## Domain-Specific Roles

### URS Composer

#### URS Author

**Permissions:**
- `urs.read`
- `urs.create`
- `urs.manage`

**Excludes:**
- `urs.approve` (cannot approve own work)
- `urs.admin` (no template administration)

**Use Case:** Create and edit URS requirement sets, manage drafts.

**Recommended Groups:** `urs-authors`

---

#### URS Owner

**Permissions:**
- `urs.read`
- `urs.create`
- `urs.manage`

**Excludes:**
- `urs.approve` (separate approval role)
- `urs.admin`

**Use Case:** Own URS requirement sets, edit and manage.

**Recommended Groups:** `urs-owners`

---

#### Business Reviewer

**Permissions:**
- `urs.read`
- `urs.approve`

**Excludes:**
- `urs.create`, `urs.manage` (cannot edit)
- `urs.admin`

**Workflow Eligibility:**
- Can approve `BUSINESS_REVIEWER` workflow step (if configured in URS approval workflow)
- Does NOT automatically approve all steps

**Use Case:** Review and approve URS for business fit and requirements alignment.

**Recommended Groups:** `urs-business-reviewers`

---

#### Product Manager

**Permissions:**
- `urs.read`
- `urs.approve`

**Excludes:**
- `urs.create`, `urs.manage`
- `urs.admin`

**Workflow Eligibility:**
- Can approve `PRODUCT_MANAGER` workflow step (if configured)

**Use Case:** Review and approve URS from product and market perspective.

**Recommended Groups:** `urs-product-managers`

---

#### Quality Reviewer

**Permissions:**
- `urs.read`
- `urs.approve`

**Excludes:**
- `urs.create`, `urs.manage`
- `urs.admin`

**Workflow Eligibility:**
- Can approve `QUALITY_REVIEWER` workflow step (if configured)

**Use Case:** Review and approve URS for quality, GxP compliance, and technical requirements.

**Recommended Groups:** `urs-quality-reviewers`

---

### Validation Expert

#### Validation Reviewer

**Permissions:**
- `validation.read`
- `requirement.read`
- `traceability.read`
- `validation.review`

**Excludes:**
- `validation.run.start`, `validation.test.execute` (cannot execute)
- `validation.admin`

**Use Case:** Review validation evidence and findings without executing tests.

**Recommended Groups:** `validation-reviewers`

---

#### Validation Manager

**Permissions:**
- `validation.read`
- `requirement.read`
- `traceability.read`
- `validation.run.start`
- `validation.test.execute`
- `validation.review`
- `validation.admin`

**Excludes:**
- `validation.approve` (reserved, never granted)

**Use Case:** Manage validation runs, execute tests, administer runners and protocols.

**Recommended Groups:** `validation-managers`

---

### Data Products

#### Data Product Developer

**Permissions:**
- `data-product.view`
- `data-product.consume`
- `data-product.create`
- `data-product.viewQuality`
- `data-product.viewValidation`

**Excludes:**
- `data-product.governance`, `data-product.certification.manage`
- `data-product.admin`

**Use Case:** Create and consume data products, view quality/validation metadata.

**Recommended Groups:** `data-product-developers`

---

### Marketplace

#### Marketplace Publisher

**Permissions:**
- `marketplace.view`
- `marketplace.admin`
- `pluginDirectory.read`
- `pluginDirectory.admin`

**Use Case:** Publish and manage marketplace offerings and plugins.

**Recommended Groups:** `marketplace-publishers`

---

## Role Assignment Guidelines

### Do NOT:

- ❌ Assign `urs.approve` to `URS Author` (conflict of interest)
- ❌ Assign `urs.manage` to `Business Reviewer` (role confusion)
- ❌ Assign `validation.approve` to any group (reserved, never granted)
- ❌ Assign `risk.accept` to any group (reserved for future)
- ❌ Assign `baseline.modify` to any group (reserved for future)

### DO:

- ✅ Assign users to Catalog Groups (not directly to roles)
- ✅ Use role inheritance (Developer includes Viewer)
- ✅ Match workflow eligibility roles to RBAC approval roles
- ✅ Document custom roles if created
- ✅ Audit role assignments quarterly

---

## RBAC to URS Workflow Integration

**IMPORTANT:** Do NOT conflate RBAC roles with URS Approval Workflow roles.

**Example:**

```
1. User has RBAC urs.approve permission
   → Can call /approve-step endpoint (RBAC gate PASS)

2. URS Approval Workflow configured with step: QUALITY_REVIEWER
   → User must also be eligible for this specific step (Workflow gate)

3. Both gates must PASS:
   RBAC: User has urs.approve ✓
   Workflow: User eligible for QUALITY_REVIEWER step ✓
   → Approval succeeds

4. If only one gate passes:
   RBAC: User has urs.approve ✓
   Workflow: User NOT eligible for BUSINESS_REVIEWER step ✗
   → 403 Forbidden (wrong workflow step)
```

---

## Golden Path Authorization Profiles (Future)

Future Golden Paths (OEE, MQTT, Equipment, etc.) may define Authorization Profiles.

Golden Path Auth Profiles contain:
- Domain permissions (owned by the path)
- Suggested roles (descriptive, not prescriptive)
- Group recommendations

RBAC administrators remain responsible for:
- Creating actual RBAC roles
- Assigning users to groups
- Configuring role-to-permission mappings

---

## References

- **Central RBAC:** `@backstage-community/plugin-rbac`
- **Permissions:** `packages/platform-common/src/permissions.ts`
- **Catalog Groups:** `catalog/org.yaml`
- **Admin UI:** `Admin → Access Control → Roles`

---

**Last Updated:** 2026-08-26  
**Status:** Ready for RBAC Admin Configuration
