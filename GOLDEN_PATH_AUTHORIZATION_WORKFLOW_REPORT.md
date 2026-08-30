# GOLDEN PATH AUTHORIZATION WORKFLOW REPORT

**Audit date:** 2026-08-28
**Mode:** READ-ONLY inspection + live executable evidence against the actual repository.
**Head commit (checked):** `f087de4` (branch `main`)
**Status (golden-path workflow):** `GOLDEN_PATH_AUTHORIZATION_WORKFLOW_NOT_COMPLETE`
**Status (RBAC architecture correction, addendum §1A):** `BACKSTAGE_RBAC_ARCHITECTURE_CONFIRMED_WITH_MIGRATION_GAPS`

---

## ADDENDUM — ARCHITECTURE CORRECTION (2026-08-28)

This addendum re-evaluates the original workflow audit against the architectural rule

> Pharma Data Factory MUST NOT implement its own RBAC engine; authorization enforcement must use
> the existing standard Backstage authorization architecture.

It is **read-only** (no source changes, no migrations, no commits). The original findings stand; this
section re-classifies them by architecture responsibility, states the "BACKSTAGE RBAC ARCHITECTURE
DECISION" (section §1A below), and revises the recommendations. The authoritative principle:

> **Pharma Data Factory does not implement a proprietary RBAC engine. Authorization enforcement is
> delegated to the standard Backstage permission/RBAC architecture. Pharma Data Factory defines
> domain permissions, authorization profiles and Golden Path configuration.**

---

## 1. EXECUTIVE VERDICT

The platform invariant

> EVERY product created through a Golden Path must have a valid, discoverable and
> enforceable authorization profile — with **no silent "no authorization" path** —

is **NOT currently enforced** at the Golden Path creation → generation → catalog →
runtime boundary.

What **exists and is operational**:

- Authorization profiles (`authorization.yaml`, `kind: AuthorizationProfile`) for the
  6 Golden Path data products (oee, mqtt, equipment, aas, machine-state, uns).
- An **Authorization Profile Registry** backend plugin
  (`plugins/authorization-registry-backend`) that discovers/validates those 6 profiles
  and exposes them over `/api/authorization/*` (registered in `packages/backend/src/index.ts`).
- A **role-based Policy** (`PlatformPermissionPolicy` + `decidePermission`) that does
  real, framework-native RBAC for **platform-wide** permissions (catalog, scaffolder,
  data-product, validation, urs, model-company, etc.) driven by catalog groups.

What is **missing** (the enforcement gap):

1. No Golden Path `template.yaml` has an **Authorization / Roles** workflow step/parameter.
2. No generated product repository / `catalog-info.yaml` carries an **authorization-profile
   reference** (so there is no generated authorization artifact and no Catalog traceability).
3. The 24 **domain permissions** (e.g. `oee.read`, `mqtt.admin`) from the profiles are
   **NOT registered in the Permission Catalog** (`packages/platform-common/src/permissions.ts`),
   so they are **not resolvable by `decidePermission`** → not first-class, enforceable
   Backstage permissions.
4. There is **no shared creation gate** (`validateEffectiveAuthorization(...)` equivalent)
   that validates profile/permissions/roles before create/publish. A developer can create a
   product with **no** authorization semantics and the scaffolder will happily run
   `fetch:template → publish:github → catalog:register`.
5. The `enforcement.mechanism: fastapi-permission-check` declared for `*.read`/`*.operate`
   in the profiles is **documented but not implemented** in the generated Python runtimes.

Consequence (answering section 21, Q1): **YES — an internal developer can today create a
Golden Path product with no authorization profile.** There is no backend, gate, or workflow
step that prevents it.

Because the gaps are structural (spanning template workflow, generation artifacts, the
Permission Catalog, and enforcement) and not a "small" single-point fix, and because the
regression boundaries (working Golden Paths, Scaffolder) must not be touched with
**unvalidated** invasive edits in an environment where the backend test suites do not reliably
execute, this report **closes the loop with a precise minimal shared-fix plan (section 17)**
rather than deploying an unverified cross-cutting change. The intended target state and the
exact, smallest implementation are specified.

**Final verdict token (section 25):** `GOLDEN_PATH_AUTHORIZATION_WORKFLOW_NOT_COMPLETE`

---

## 1A. BACKSTAGE RBAC ARCHITECTURE DECISION

> **Pharma Data Factory does not implement a proprietary RBAC engine.
> Authorization enforcement is delegated to the standard Backstage
> permission/RBAC architecture. Pharma Data Factory defines domain
> permissions, authorization profiles and Golden Path configuration.**

### 1A.1 Which standard Backstage authorization components are installed & used

| Component | Package (installed) | Source | Role |
|---|---|---|---|
| Permission Framework (backend) | `@backstage/plugin-permission-backend@^0.7.14` | `packages/backend/src/index.ts` | Central authorize() service + policy dispatch |
| Permission definitions | `@backstage/plugin-permission-common@^0.9.9` (`createPermission`) | `packages/platform-common/src/permissions*.ts`, `permissions/*.ts` | Standard permission objects |
| Permission policy API | `@backstage/plugin-permission-node@^0.11.2` (`policyExtensionPoint`, `PermissionPolicy`) | `packages/backend/src/permission/module.ts` | Standard policy hook |
| Community RBAC (backend) | `@backstage-community/plugin-rbac-backend@^7.17.0` | `packages/backend/src/index.ts` | Central role admin / policy server (standard Backstage RBAC) |
| Community RBAC (frontend) | `@backstage-community/plugin-rbac@^2.1.2` | `packages/app/src/App.tsx` (`rbacPlugin`, `/admin/rbac`) | Role/group administration UI |
| Identity | `@backstage/plugin-auth-backend` + guest + github providers | `packages/backend/src/index.ts` | Backstage identity |
| Catalog Users/Groups | `catalog/org.yaml` | catalog | Group membership source of truth |

**Answer (Section 1 Q1):** The repository uses a **combination** (option 4):
1. Backstage Permission Framework (native) — authoritative decision service.
2. Standard/community Backstage RBAC plugin — role administration + policy server.
3. `PlatformPermissionPolicy` — a Backstage-standard `PermissionPolicy` carrying Pharma domain logic (entitlements, release gates, and a role→permission mapping).
All of the above are present and registered.

### 1A.2 Which files contain "custom" RBAC behavior (classification)

| File | Classification | Notes |
|---|---|---|
| `packages/platform-common/src/permissions.ts` | **BACKSTAGE_CONFIGURATION + PHARMA_DOMAIN_PERMISSION** | Standard `createPermission` objects (✅); the `{VIEWER,DEVELOPER,OWNER,ADMIN}_PERMISSION_NAMES` sets are Pharma domain configuration of role→permissions |
| `packages/platform-common/src/permissions/urs.ts`, `permissions/validation.ts` | **BACKSTAGE_STANDARD** | Owned `createPermission` definitions |
| `packages/platform-common/src/roles.ts` | **BACKSTAGE_CONFIGURATION + CUSTOM_RBAC_LOGIC** | Platform group names / role names (config ✅); `resolvePlatformRole`/`hasApprovedPlatformAccess` are a small hand-rolled group→role evaluator (⚠️ redundant with standard RBAC) |
| `packages/platform-common/src/policy.ts` | **CUSTOM_RBAC_LOGIC (PHARMA_DOMAIN_PERMISSION)** | `decidePermission`/`permissionsForRole` = hand-rolled role→permission evaluator; reuses standard permission names but implements its own evaluation |
| `packages/backend/src/permission/policy.ts` (`PlatformPermissionPolicy`) | **BACKSTAGE_STANDARD container + PHARMA_DOMAIN_PERMISSION business logic** | Implements standard `PermissionPolicy`; adds Pharma entitlements + release gates |
| `packages/backend/src/permission/module.ts` | **BACKSTAGE_STANDARD** | Registers policy via standard `policyExtensionPoint` |
| `packages/backend/src/index.ts` (permission + rbac region) | **BACKSTAGE_CONFIGURATION** | Wires standard `permission-backend` and community `rbac-backend` |
| `plugins/authorization-registry-backend/*` | **PHARMA_AUTHORIZATION_PROFILE** | Profiles/roles discovery + validation — knowledge layer, NOT a decision engine |
| `templates/*/authorization.yaml` | **PHARMA_AUTHORIZATION_PROFILE** | Domain authorization metadata |

**Answer (Section 2 + Q2):** `decidePermission`, `permissionsForRole`, `resolvePlatformRole`, `hasApprovedPlatformAccess`, and the `*_PERMISSION_NAMES` sets implement RBAC behavior that the **standard community RBAC plugin is designed to provide**. They are not deleted/modified here; they are the migration target of §1A.3.

### 1A.3 Migration path toward standard Backstage RBAC (Q3, Q4)

The community RBAC plugin is installed and mounted, but the actual allow/deny for platform permissions is currently decided inside `PlatformPermissionPolicy` via `decidePermission` (hard-coded role sets). The migration path (configuration/evolution, not a build task):

1. Register the domain permissions as published permission definitions (owning plugins own them; `platform-common/src/permissions*.ts` aggregates them). This is standard Backstage.
2. Configure the community RBAC backend policy server (add the `rbac.policies`/policy-server config) so RBAC-defined roles/policies drive the decision, delegating non-RBAC custom logic (entitlements, release gates) to a minimal conditional policy — matching ADR-004's "RBAC wraps PlatformPermissionPolicy" intent, which is currently **not** evidenced as wired in config.
3. Replace the hard-coded `*_PERMISSION_NAMES` role→permission sets with RBAC-administered role/policy configuration (via `/admin/rbac`), so `roles.ts`/`policy.ts` role-evaluation becomes a thin pass-through or is removed.
4. Keep Pharma-specific: permission definitions, authorization profile metadata, entitlements, release gates, Golden Path workflow UX, Catalog relationships.

**Genuine Pharma code that must remain (Q4):** domain permissions (`oee.*`, `mqtt.*`, `equipment.*`, `aas.*`, `machine-state.*`, `uns.*`, `validation.*`, `urs.*`, `data-product.*`, …), authorization profile (`authorization.yaml`) + registry, entitlements / release-gate business logic, and Golden Path configuration UX.

---

## 1A.4 Revised permission-catalog finding (Section 5)

The earlier audit finding "24 domain permissions absent from Permission Catalog" is **correct as a
gap** but must be positioned by Backstage architecture: domain permissions **should be standard
`createPermission` objects owned by their domain plugins** (definition + discovery metadata). The
Authorization Registry must remain a **discovery/validation layer that emits metadata** (so RBAC
admin can see suggested permissions/roles), **not** an authorization decision engine. No custom
permission evaluator is to be built.

## 1A.5 Revised creation-gate finding (Section 7)

The previously required gate is kept, but re-scoped as **configuration validation**, not RBAC:

`validateGoldenPathAuthorizationConfiguration(...)` verifies: profile exists; schema valid;
referenced permissions exist (in profile AND Permission Catalog); required role/group references are
resolvable; generated product contains the profile reference. It must **NOT** answer "is user X
allowed to perform Y?" — that remains the Backstage Permission Framework / RBAC decision.

## 1A.6 Target flow owner map (Section 11)

```
Internal Developer              (UX)
  → Golden Path                 (template.yaml + scaffolder)
  → Authorization Profile       (authorization.yaml → registry)
  → configuration validation    (validateGoldenPathAuthorizationConfiguration)
  → generated product           (fetch:template emits authorizationProfile ref + catalog annotation)
  → Catalog registration        (catalog:register)
  → Backstage identity/groups   (auth-backend + catalog/org.yaml)
  → standard Backstage RBAC     (@backstage-community/plugin-rbac-backend)
  → plugin permission           (createPermission definitions owned by plugins)
  → runtime ALLOW / DENY        (permission-backend / policy server)
```

Each arrow's owner is the platform component in parentheses; **no Pharma RBAC engine owns any arrow**.

---

## 1A.7 Revised gap re-classification (Section 9)

| Previous gap | Revised classification |
|---|---|
| Missing workflow Authorization step | **GOLDEN_PATH_GAP** (configuration UX, not RBAC) |
| Missing generated profile reference | **GOLDEN_PATH_GAP** (generation must emit `authorizationProfile: {id, version}`) |
| 24 domain permissions not registered | **BACKSTAGE_INTEGRATION_GAP** → register as standard `createPermission` owned by domain plugins |
| `PlatformPermissionPolicy` + `decidePermission` + `roles.ts` | **CUSTOM_RBAC_TECH_DEBT** (migrate role→permission decision to standard RBAC plugin; keep entitlements/release gates only) |
| Runtime `fastapi-permission-check` documented-only | **RUNTIME_ENFORCEMENT_GAP** (generated runtimes must integrate with Backstage authorization) |
| Registry duplicate-profile ID not detected | **CONFIGURATION_GAP** (registry validation improvement, not RBAC) |
| Registry baseDir `process.cwd()` | **CONFIGURATION_GAP** (pin monorepo root) |

## 1A.8 REQUIRED ANSWERS (Section 13)

1. **Which exact standard Backstage authorization/RBAC implementation is installed?**
   `@backstage/plugin-permission-backend@^0.7.14`, `@backstage/plugin-permission-common@^0.9.9`,
   `@backstage/plugin-permission-node@^0.11.2`, and the community RBAC
   `@backstage-community/plugin-rbac-backend@^7.17.0` (backend) / `@backstage-community/plugin-rbac@^2.1.2` (frontend), plus `@backstage/plugin-auth-backend` identity and Catalog Users/Groups.

2. **Which current repository files contain custom RBAC behavior?**
   `packages/platform-common/src/policy.ts` (`decidePermission`/`permissionsForRole`),
   `packages/platform-common/src/roles.ts` (`resolvePlatformRole`, `hasApprovedPlatformAccess`),
   `packages/platform-common/src/permissions.ts` (`*_PERMISSION_NAMES` role sets),
   `packages/backend/src/permission/policy.ts` (`PlatformPermissionPolicy`, custom wrapper),
   `packages/backend/src/permission/module.ts` (policy registration).
   `PlatformPermissionPolicy`/`module.ts` are **standard Backstage** containers; the *logic* they
   carry is Pharma domain configuration.

3. **Can that custom behavior be replaced/configured using the standard Backstage solution?**
   **YES.** Role→permission administration can be fully delegated to the community RBAC plugin
   (`/admin/rbac`, `rbac.policies` policy-server config). Only the domain-specific entitlements and
   release-gate business rules are retained as conditional policy logic.

4. **What custom Pharma Data Factory authorization code genuinely needs to remain?**
   Domain permissions (standard `createPermission` objects), authorization profiles + the profile
   registry (metadata), entitlements/release-gate business rules, and Golden Path configuration UX.
   The hard-coded role→permission evaluator (`decidePermission`/`permissionsForRole`) does **not**
   need to remain once RBAC is configured.

5. **What must every Golden Path generate/reference?**
   A stable `authorizationProfile: { id, version }` reference (and the existing Catalog annotation,
   e.g. `nexora.io/authorization-profile: <id>`), so the generated product resolves to exactly one
   effective Authorization Profile.

6. **Where is runtime ALLOW/DENY ultimately decided?**
   In the **Backstage Permission Framework** (`@backstage/plugin-permission-backend`) via the
   configured policy server, which under the target architecture is the standard RBAC plugin —
   invoked from plugin routers via `permissions.authorize([...], { credentials })`.

7. **Does the proposed architecture contain any second RBAC engine?**
   **NO.** Target architecture has no second RBAC engine. Current code's `decidePermission`/
   `resolvePlatformRole` is a mini role-evaluator inside the standard policy hook (migration debt),
   not a separate identity/decision engine outside Backstage.

---

## 2. GOLDEN PATH INVENTORY + MATRIX

**Discovery method (executed):** glob `templates/*/authorization.yaml` + `templates/*/template.yaml`
against the actual repo. **All template directories = 10.** Golden Path **Data Products with an
`authorization.yaml` = 6.** The 4 non-data-product templates (`aas-asset`, `mqtt-connector`,
`python-service`, `node-service`) have **no** authorization profile (they are general service /
component templates, consistent with the platform's "Data Product Golden Path" scoping).

### 2.1 Matrix

| Golden Path (template dir) | Domain | authz.yaml present | Registry discovery | Workflow authz step | Generated artifact ref | Catalog authz annotation | RBAC binding | Runtime enforcement |
|---|---|---|---|---|---|---|---|---|
| `oee-data-product` | oee | ✅ `templates/oee-data-product/authorization.yaml` | ✅ via registry (glob) | ❌ none | ❌ none in generated repo | ❌ none in `content/catalog-info.yaml` | ❌ domain perms not in Permission Catalog | ❌ `enforcement.mechanism` documented but not implemented |
| `mqtt-temperature-product` | mqtt | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (documented only) |
| `rest-equipment-product` | equipment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (documented only) |
| `aas-data-product` | aas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (documented only) |
| `machine-state-consumer` | machine-state | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (documented only) |
| `unified-namespace` | uns | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (uns.operate → mqtt broker ACL, EXTERNAL) |

**Non-data-product templates without profile (test fixtures only, NOT Golden Path data products):**
`aas-asset`, `mqtt-connector`, `python-service`, `node-service`.

### 2.2 Per-profile definition details (from `authorization.yaml`)

| Profile (name) | Permissions (4 each) | Suggested roles (4 each) | Platform role mappings | default groups | role bindings |
|---|---|---|---|---|---|
| `oee` | oee.read, oee.operate, oee.configure, oee.admin | oee-viewer, oee-operator, oee-engineer, oee-admin | viewer/developer/owner/admin | platform-viewers, data-product-developers, data-product-owners, platform-admins (implicit) | mappings declared but **no RBAC/role binding created** |
| `mqtt` | mqtt.read, mqtt.operate, mqtt.configure, mqtt.admin | mqtt-viewer, mqtt-operator, mqtt-engineer, mqtt-admin | same | same | none |
| `equipment` | equipment.read, operate, configure, admin | equipment-viewer/operator/engineer/admin | same | same | none |
| `aas` | aas.read, operate, configure, admin | aas-viewer/operator/engineer/admin | same | same | none |
| `machine-state` | machine-state.{read,operate,configure,admin} | machine-state-{viewer,operator,engineer,admin} | same (+ `dependsOn: uns`) | same | none |
| `uns` | uns.read, operate, configure, admin | uns-viewer, uns-subscriber, uns-engineer, uns-admin | same | same | none |

**Suggested roles are declarations only.** No Resource/PolicyBinding entity, no community-RBAC
`Policy`, `Role`, or `group` binding materializes from these `suggestedRoles`. The only groups
that grant anything are the 4 platform groups in `packages/platform-common/src/roles.ts`.

### 2.3 Executed discovery/validation evidence (mirror of committed registry logic)

```
total authorization.yaml files : 6
valid profiles                 : 6
invalid profiles               : 0
malformed/parse-failures       : 0
duplicate profile names        : none
total distinct domain perms    : 24
cross-profile duplicate perms  : none
```

---

## 3. AUTHORIZATION ARCHITECTURE (as built)

```
Identity (Guest/GitHub) → Catalog User/Group ownershipEntityRefs
  → PlatformPermissionPolicy.handle() (packages/backend/src/permission/policy.ts)
     → decidePermission(permission, role, resourceRef) (packages/platform-common/src/policy.ts)
        → permissionsForRole(role) → {VIEWER,DEVELOPER,OWNER,ADMIN}_PERMISSION_NAMES
     → (+ entitlement gate for commercial scaffolder templates)
  → plugin routers call permissions.authorize([...])
```

- **Permission Catalog** = `packages/platform-common/src/permissions.ts`
  (`platformPermissions[]` via `createPermission`). **38 platform permissions.**
- **Role → permission mapping** = `VIEWER/DEVELOPER/OWNER/ADMIN_PERMISSION_NAMES` sets (same file).
- **Groups → role** = `packages/platform-common/src/roles.ts`
  (`platform-viewers`, `data-product-developers`, `data-product-owners`, `platform-admins`).
- **Runtime policy** = `PlatformPermissionPolicy` (registered as `permissionModulePlatformPolicy`).
- **Admin/administration** = `@backstage-community/plugin-rbac` (registered) — community RBAC console.
- **Authorization Profile Registry** = `plugins/authorization-registry-backend`
  (discovery layer, NOT a second IAM engine) — registered in `packages/backend/src/index.ts`.

**Source-of-truth hierarchy (current vs required):**

| Layer | Required role | Current reality |
|---|---|---|
| `authorization.yaml` | Golden Path authorization definition | ✅ present for 6 Golden Paths |
| Authorization Profile Registry | discovery / validated normalized profiles | ✅ operational (filesystem glob) |
| Permission Catalog | platform permission definitions | ⚠️ only **platform** perms; **domain perms missing** |
| Backstage Permission Framework | runtime enforcement | ✅ authoritative policy exists |
| Catalog | discovery / relationship metadata | ⚠️ templates only; **no authz entities/relations** |
| Golden Path Workflow | developer configuration UX | ❌ **no authorization step** |

The **domain** `authorization.yaml` distributions are therefore currently **metadata-only** with
respect to the enforcement plane. This matches the conclusion already recorded in
`CURRENT_PRODUCT_STATUS_AUTHORIZATION_URS.md` (2026-08-26): domain YAML permissions are not
first-class `createPermission` catalog entries.

## 4. WORKFLOW UX (what a developer actually sees today)

Executed inspection of all 6 Golden Path `template.yaml` files:

- **Scaffolder steps (all 6):** `fetch:template → publish:github → catalog:register` only.
- **No** authorization/roles/permissions/access-profile parameter, `ui:field`, wizard step,
  scaffolder action, backend validation, or generated manifest.
- Parameter groups are only Product Info / Technical Configuration (name, desc, owner, domain,
  topics, repoUrl). **No "Authorization / Roles" step exists.**
- `packages/app` has a `CreateSuccessGate` (`modules/create/`) that only wraps the success page;
  it performs **no** authorization validation.
- The **Approval Workflow** implemented in the repo belongs to **URS Composer**
  (requirement-set approval state machine) — it is *not* a Golden Path authorization gate.

Hence the conceptual flow requested (Product Info → Technical → Dependencies → **Authorization/Roles** →
Review → Create) is **not realized**; there is no Authorization/Roles step.

## 5. DEFAULT VS OVERRIDE / INHERITANCE BEHAVIOR

Because no workflow step exists, the inheritance model is **implicit by absence**, not defined:

| Classification | State |
|---|---|
| FIXED_PROFILE (inherited, read-only) | ❌ not wired — profile exists but not injected into generation |
| DEFAULT_PROFILE_WITH_OVERRIDE | ❌ not wired |
| REQUIRED_EXPLICIT_PROFILE (must select) | ❌ not wired — no selection UI/gate |
| Free-text arbitrary permission/role input | ⚠️ only possible by editing repo; no gate blocks it |

There are **no** verified overrides, and **no** controls preventing arbitrary permission/role
input at creation (because there is no authorization input surface at all — the gap).

---

## 6. PERMISSION CATALOG INTEGRATION (domain perms missing)

Executed check: the registry's discovered domain permissions were compared against the platform
`platformPermissions` catalog.

```
domain perms NOT in platform Permissions Catalog (24/24 missing):
  aas.{operate,configure,admin}   machine-state.{read,operate,configure,admin}
  mqtt.{read,operate,configure,admin}   oee.{read,operate,configure,admin}
  equipment.{read,operate,configure,admin}   uns.{read,operate,configure,admin}
```

None of the 24 domain permissions appear in `platformPermissions[]` or in any
`*_PERMISSION_NAMES` role set, so `decidePermission` cannot ever return ALLOW for them. Even the
generic "read action" fallback in `policy.ts` could nominally match a `*.read`, but (a) none of
these permissions are asked by any router, and (b) an `isAtLeast`-based read fallback is not a
principled "authorization profile" binding.

Implication: **Q6 (section 21) = NO** — the 24 permissions used by Golden Paths are **not**
registered in the Permission Catalog.

## 7. BACKEND ENFORCEMENT / CREATION GATE

- `validateEffectiveAuthorization(...)` **does not exist** anywhere in the codebase.
- No scaffolder precondition/custom action enforces an authorization profile before
  `publish:github` / `catalog:register`.
- The only create-time authorization is the platform-wide scaffold create RBAC
  (`scaffolder.task.create` / `scaffolder.action.execute` / `data-product.create` are in
  `DEVELOPER_PERMISSION_NAMES`) and the commercial entitlement/release gate for commercial
  templates. **Neither validates an authorization profile.**

Attempted creation with a missing/invalid profile cannot be blocked today because the scaffolder
steps neither read nor require any authorization input. **Section 21 Q3 = NOT_ENFORCED** from the
Golden Path authorization perspective.

---

## 8. GENERATED PRODUCT ARTIFACT

Executed inspection of the generated skeleton (`templates/<gp>/content/`):

- **No `authorization.yaml`, no `product.yaml`/platform manifest authorization block, and no
  `authorizationProfile: {id, version}` reference is generated** into any product repository.
- `content/catalog-info.yaml` (all 6) has **no** `nexora.io/authorization-profile` or equivalent
  annotation. It carries only `dataprod.platform/*` annotations.
- The only `authorization.yaml` files in the repo are the 6 at each template root (used solely as
  registry source-of-truth). They are **not copied into generated products** and **not registered
  as catalog entities**.

Logical target relationship (Product → ProfileID → Permissions → Roles) therefore does **not**
materialize in the generated repo.

## 9. CATALOG INTEGRATION

- Registered catalog locations (app-config.yaml) are the `templates/*/template.yaml` files only
  (`allow: [Template]`). No `AuthorizationProfile` kind is registered, and no `authorization.yaml`
  location is added.
- Generated `content/catalog-info.yaml` does not reference the profile, so a generated product
  cannot be resolved back to a Golden Path authorization profile via any annotation/relation.
- **Q4/Q5 (section 21) = NO / NOT_PROVEN:** no existing Golden Path resolves through the Catalog to
  an authorization profile, and no generated product preserves an authorization reference.

## 10. RBAC RESOLUTION (groups/roles → effective permissions)

- **Platform** permissions resolve correctly: `resolvePlatformRole(ownership)` →
  `decidePermission` → role sets. This covers catalog/scaffolder/data-product lifecycle perms.
- **Domain** permissions (`oee.*`, etc.) are **NOT** in the role sets, so Platform RBAC **cannot**
  resolve a generated product's domain roles/groups to effective domain permissions.
- **Q7 = PARTIAL:** Platform RBAC resolves platform roles, but not the domain authorization
  profiles/products.

## 11. GOLDEN PATH ROLE ENFORCEMENT (per-path proof)

Proof that an *authorized* actor succeeds and an *unauthorized* actor is denied **for the domain
permissions** cannot be produced for any Golden Path because the domain permissions are not wired
into the framework (see §6) and the generated runtimes do not enforce them (§8-style runtime gap).
This is **NOT_RUN / FAIL** for domain-level enforcement. (Platform-level scaffold RBAC is enforced,
but that is not domain authorization.)

## 12. REPRESENTATIVE NEW-PRODUCT CREATION RUNTIME PROOF (OEE)

Real GitHub publication is a `publish:github` GitHub-App action (requires network/App install) →
**NOT_RUN** for the live end-to-end publish/register path. What is proven locally:

- Discover OEE profile via the same registry glob: ✅ `oee` found, 4 perms, 4 roles.
- Workflow step for authorization: ❌ **absent** (OEE `template.yaml` has no authz step).
- Backend validates authorization: ❌ **no gate exists**.
- Generated authorization reference persisted: ❌ none generated.
- Catalog entity registered: would register `catalog-info.yaml` (has no authz annotation).
- RBAC policy resolves domain perms: ❌ not in Permission Catalog.

The OEE golden path is functionally mature, but the authorization-document invariant is **not**
realized on any path.

## 13. ALL-GOLDEN-PATH AUTOMATED VERIFICATION

A reusable verification harness (mirroring committed `validator.ts`/`registry.ts` logic) was
executed against the real repository. Result summary:

- All 6 Golden Path `authorization.yaml` discovered & valid; 0 invalid/malformed; 24 distinct
  domain perms; 0 duplicates.
- **Every Golden Path FAILS** these invariant checks: no workflow authz step; no generated
  authorization artifact; no catalog authz annotation; domain perms not in Permission Catalog.
- Invariant `goldenPaths.count == validAuthorizationProfiles.count`: the 6 data-product Golden
  Paths have 6 profiles (count matches), but that is **only the discovery layer** — it does not
  satisfy *enforceable*, *generated-artifact*, or *catalog-traceability* requirements.

## 14. NEGATIVE TESTS (executed)

| # | Case | Expected | Executed result |
|---|---|---|---|
| A | Golden Path without authz profile | FAIL | ⚠️ NOT blocked — a create does not require a profile |
| B | unknown authorization profile | FAIL | ✅ validator rejects unknown-domain lookups; no creation gate uses it |
| C | malformed authorization.yaml | FAIL | ✅ validator rejects (missing/wrong apiVersion, kind) |
| D | unknown permission ID | FAIL | ✅ validator rejects role→unknown-permission reference |
| E | duplicate profile ID | FAIL | ❌ **not detected** — registry Map keyed by domain silently overwrites (registry-level gap) |
| F | invalid role/group | FAIL | ✅ validator rejects role missing required fields |
| G | remove inherited authz in workflow | FAIL | ❌ no workflow authz step exists to remove |
| H | direct backend request bypassing frontend | FAIL | ❌ no backend gate exists (`validateEffectiveAuthorization` absent) |
| I | generated product missing authz ref | FAIL | ❌ **matches current behavior** — generated products already have no reference |

NOTE: A, B, E, G, H, I are structural gaps (not single-test failures); B/C/D/F are exercised and
correctly rejected at the validator level.

---

## 15. WORKFLOW / ADMIN VIEW

No dedicated Authorization/Workflow view exists for Golden Paths:

- **Admin:** the `@backstage-community/plugin-rbac` admin console exists and administers platform
  roles/policies, but has **no** Golden Path/per-product authorization-profile view (no profile,
  permissions, roles, groups, inheritance mode, or validation status for a path).
- **Developer:** `MyAccessPage` (`modules/entitlements/`) shows the user's platform role/access,
  not per-Golden-Path authorization profiles. `DeveloperHubPage` is static documentation only.
- The registry exposes `/api/authorization/*` (profiles/permissions/roles/diagnostics), but **no
  frontend consumes it**.

Per the task's directive (do not build a new portal if equivalent screens exist, extend only if
necessary) the correct minimal addition is a **registry-backed read-only view**, not a new portal.

## 16. AUTHORIZATION STATUS MODEL

No `VALID/INVALID/MISSING/UNRESOLVED` status model exists for generated products. It must be
derived. Recommended status derivation (reusing the registry + catalog):

| Status | Condition |
|---|---|
| VALID | profile discovered+valid AND referenced from the generated product AND perms in Permission Catalog AND roles resolvable |
| INVALID | profile present but validation errors |
| MISSING | no authorization profile selected/referenced |
| UNRESOLVED | profile reference exists but registry cannot resolve it |

Today nearly every generated product would be classified **MISSING** (no reference), and the 6
profiles are discoverable (VALID at registry level) but not enforceable.

## 17. GOLDEN PATH CREATION GATE (MINIMAL SHARED FIX — TARGET DESIGN)

One shared enforcement point is required, reusing the existing registry. Every Golden Path
currently relies on auto-inheritance-by-profile, so the smallest safe closure is:

**A. Expose a query on the existing `AuthorizationProfileRegistry`:**
`validateEffectiveAuthorization(profileId, requestedPermissions?, requestedRoles?): ValidationResult`
resolving:
1. profile loaded & valid,
2. requested permissions ⊆ profile permissions AND ⊆ Permission Catalog,
3. requested roles reference only profile + catalog-known permissions,
4. throws/denies on unknown profile, unknown permission, invalid role/group.

**B. Register the 24 domain permissions** as first-class `createPermission` entries in
`packages/platform-common/src/permissions.ts` (wired from the 6 `authorization.yaml` profiles) and
map each Golden Path domain role → platform role via the existing `platformRoleMappings`, so
`decidePermission` can resolve them.

**C. Add one scaffolder guard (shared):** a small scaffolder guard (custom action or a shared
helper invoked before `publish:github`) that calls `validateEffectiveAuthorization` with the Golden
Path's fixed `authorizationProfile.id` (e.g. `oee`) and fails the task if the profile is
unresolved/invalid. This is the single backend gate; developer omission is *only* acceptable
because the backend reliably injects the Golden Path default profile.

**D. Generate the authorization reference:** in each template's `fetch:template` values + generated
`catalog-info.yaml`, persist `nexora.io/authorization-profile: <id>` (reusing the existing
`appliesTo` label namespace already declared in every profile) and an `authorization.yaml`
(`authorizationProfile: { id, version }`) manifest in the generated repo.

This is intentionally one shared gate + catalog registration + generated reference; it does **not**
add a second RBAC engine and does not redesign the workflow. It was **NOT deployed** here because it
is a cross-cutting change that must be validated (backend suites) before touching the working Golden
Paths — see §19.

> **Revision note (see §1A):** This §17 design is superseded by §1A.5. The gate is re-scoped to
> `validateGoldenPathAuthorizationConfiguration(...)` — it validates **configuration** (profile
> exists/valid, permissions exist, roles/groups resolvable, generated reference present) and MUST NOT
> perform runtime RBAC decisions. §1A.3 supersedes the §17-B role-mapping wording: domain permissions
> are registered as standard Backstage `createPermission` objects (owned by domain plugins), and
> role→permission resolution is delegated to the standard RBAC plugin, not to `decidePermission`.

---

## 18. SOURCE OF TRUTH

| Layer | Role | Status |
|---|---|---|
| `authorization.yaml` | Golden Path authorization definition | ✅ present (6) |
| Authorization Profile Registry | discovery / validated normalized profiles | ✅ operational |
| Permission Catalog | platform permission definitions | ❌ domain perms missing |
| Backstage Permission Framework | runtime authorization enforcement | ✅ authoritative |
| Catalog | discovery / relationship metadata | ⚠️ missing authz entities/relations |
| Golden Path Workflow | developer configuration UX | ❌ no authz step |

Catalog annotations must **not** become the primary authorization source; they are traceability only
(required target state).

## 19. GAPS AND NEXT STEPS

**Gaps (blocking):**
1. No authorization workflow step/parameter in any Golden Path (`template.yaml`).
2. No generated authorization artifact or catalog annotation in any generated product.
3. 24 domain permissions not registered in the Permission Catalog / not resolvable by `decidePermission`.
4. No shared creation gate (`validateEffectiveAuthorization` absent).
5. `enforcement.mechanism: fastapi-permission-check` documented but not implemented in generated runtimes.
6. Registry does not detect duplicate profile IDs (Map keyed by domain overwrites).
7. Registry baseDir uses `process.cwd()`, which differs between startup contexts (repo root vs
   `packages/backend`) — discovery may return 0 profiles in some run configurations; must be pinned
   to the configured monorepo root (as already done for `pluginDirectory.workspaceRoot`).

**Next steps (ordered):**
1. Implement §17-A/B/C: shared gate + register 24 domain perms + scaffold guard.
2. Implement §17-C/D: generated `authorizationProfile` reference + catalog annotation.
3. Add a registry-backed admin + developer read-only view (consume `/api/authorization/*`).
4. Run full backend + all-Golden-Path verification, then re-run regression (OEE, MQTT, REST, URS
   composer, Validation Expert) before any Golden Path behavior change.

## 20. ACCEPTANCE MATRIX

| Item | Result |
|---|---|
| All Golden Paths discovered | ✅ PASS (6 data-product Golden Paths) |
| Authorization profile per Golden Path | ✅ PASS (6/6) |
| Profile schema validation | ✅ PASS (validator rejects malformed) |
| Authorization Registry discovery | ✅ PASS (operational) |
| Permission Catalog resolution | ❌ FAIL (domain perms not registered) |
| Workflow authorization step | ❌ FAIL |
| Inherited/default profile handling | ❌ FAIL (not wired) |
| Explicit profile handling | ❌ FAIL (no selection surface) |
| Backend creation gate | ❌ FAIL (absent) |
| Missing-profile rejection | ❌ FAIL (not blocked) |
| Invalid-profile rejection | ⚠️ PARTIAL (validator rejects; not used at create) |
| Unknown-permission rejection | ⚠️ PARTIAL (validator rejects; not gated) |
| Generated authorization artifact | ❌ FAIL |
| Catalog authorization reference | ❌ FAIL |
| RBAC role resolution | ⚠️ PARTIAL (platform roles yes; domain roles no) |
| RBAC group resolution | ⚠️ PARTIAL (platform groups yes; domain groups no) |
| Runtime authorized access | ❌ FAIL / NOT_RUN (domain perms unenforced) |
| Runtime unauthorized denial | ❌ FAIL / NOT_RUN (domain perms unenforced) |
| Admin/View visibility | ❌ FAIL (community RBAC only; no profile view) |
| Developer/View visibility | ❌ FAIL (no per-product authz view) |
| Representative creation E2E | ❌ FAIL / NOT_RUN (no authz wiring; GitHub publish NOT_RUN) |
| All-Golden-Path automated verification | ⚠️ PARTIAL (discovery passes; invariant checks fail) |
| Regression | ❌ NOT_RUN (backend suites do not execute in this checkout — see §23) |
| TypeScript | ❌ NOT_RUN (tsc not re-run; backend test bootstrap hangs — install state not synced) |
| Browser E2E | ❌ NOT_RUN |

---

## 21. REQUIRED FINAL QUESTIONS

1. **Can an internal developer create a Golden Path product without an authorization profile?**
   **YES** — no workflow step, no backend gate, and no generated-artifact requirement prevent it.

2. **If the developer does not explicitly choose roles, are valid roles/profile inherited automatically?**
   **NO** — profiles exist but are **not injected** into generation or resolution; there is no
   automatic inheritance mechanism today.

3. **Is this enforced in the backend or only in the UI?**
   **NOT_ENFORCED** (for the authorization-document invariant). The platform create *permission* is
   enforced, but the requirement that every product carry a valid authorization profile is enforced
   nowhere.

4. **Does every existing Golden Path resolve to exactly one effective authorization profile?**
   **NO** — profiles are discoverable, but no effective-resolution path exists (no generated
   reference, no catalog relation, no RBAC domain binding).

5. **Does every generated product preserve the authorization profile reference?**
   **NOT_PROVEN** — generated products carry **no** authorization reference today.

6. **Are all permissions used by Golden Paths registered in the Permission Catalog?**
   **NO** — 24/24 domain permissions are missing from `platformPermissions`.

7. **Can Platform RBAC resolve the generated product's roles/groups to effective permissions?**
   **PARTIAL** — platform roles/groups resolve; domain (Golden Path) roles/groups do not.

## 22. IMPLEMENTATION RULE (conclusion)

Inspection proves the invariant is **NOT fully implemented**, and the gap is **not small** (it spans
workflow steps, generation artifacts, the Permission Catalog, and enforcement). Per the rule, the
**minimum shared fix** was designed (§17) but **not deployed**: deploying it would be a
cross-cutting, unvalidated change in an environment whose backend test suites cannot reliably
execute, which risks regressing the working Golden Paths and Scaffolder that the task forbids
touching. The fix is a single shared gate + catalog registration + generated reference over the
existing registry — no redesign, no second RBAC.

## 23. REGRESSION BOUNDARIES OBSERVED

- No source changes made in this audit (report-only). Head commit `f087de4` untouched.
- Golden Paths, URS Composer, Validation Expert integration, Permission Catalog, Platform RBAC,
  Component Library, Composition Builder, and Scaffolder are unchanged.
- **NOTE on running the committed tests:** `yarn workspace @internal/plugin-authorization-registry-backend`
  fails because the plugin is not installed in the current yarn workspace state
  ("Package ... not found"), and `backstage-cli package test` bootstrap hangs because
  `@backstage/backend-test-utils` is not present in root `node_modules`. These are checkout/install
  sync issues, not evidence about the committed code. The executable evidence in this report was
  produced by a standalone harness that runs the committed discovery/validation logic against the
  real files.

## 24. GIT / SECURITY SAFETY

- No commits, no pushes.
- No secrets, `.env`, or private keys tracked (only `github-app-credentials.yaml.example`).
- No `.runtime/`, `coverage/`, `dist-types/`, or `.sqlite` tracked.
- Scratch files created during this audit were removed; working tree is clean.

## 25. FINAL VERDICT

**GOLDEN_PATH_AUTHORIZATION_WORKFLOW_NOT_COMPLETE** — for the golden-path workflow invariant.

For the RBAC architecture correction (this addendum, §1A), the verdict is:

**BACKSTAGE_RBAC_ARCHITECTURE_CONFIRMED_WITH_MIGRATION_GAPS**
