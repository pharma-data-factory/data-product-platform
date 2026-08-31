# BACKSTAGE RBAC — POLICY MIGRATION REPORT

**Date:** 2026-08-28
**Mode:** Analysis / planning only (no changes, no commit, no push).
**Prerequisite verdict:** `BACKSTAGE_RBAC_ARCHITECTURE_CONFIRMED_WITH_MIGRATION_GAPS`
(see `GOLDEN_PATH_AUTHORIZATION_WORKFLOW_REPORT.md` §1A).

---

## 1. OBJECTIVE

Determine the **minimum migration** to move the current hard-coded role → permission mapping
into the installed **Backstage Community RBAC** plugin, preserving effective behavior and keeping a
single authorization decision engine.

Non-goals (this gate):
- No redesign of RBAC.
- No second RBAC engine.
- No Golden Path changes.
- No domain permission changes.
- No custom evaluator.

---

## 2. AS-IS ARCHITECTURE

```
Backstage Permission Framework (@backstage/plugin-permission-backend)
   └─ Policy = permissionModulePlatformPolicy (CUSTOM)
        └─ PlatformPermissionPolicy.handle()          [packages/backend/src/permission/policy.ts]
             └─ decidePermission(request.permission, role, resourceRef)   [platform-common/src/policy.ts]
                  └─ permissionsForRole(role) *{VIEWER/DEVELOPER/OWNER/ADMIN}_PERMISSION_NAMES*
                  └─ isAtLeast(role) read fallback
             + entitlement gate (commercial)           [createEntitlementRuntime]
             + release gate (GA)                       [releases.ts]
Community RBAC (@backstage-community/plugin-rbac-backend + plugin-rbac)
   └─ INSTALLED + REGISTERED but NOT operationally configured (no roles/policies/config)
Catalog (/catalog/org.yaml)
   └─ Groups: platform-{viewers,admins}, data-product-{developers,owners}, platform-team
   └─ Specialist groups (URS/validation/data-product/marketplace) — NOT read by the custom evaluator today
```

**Facts established by inspection:**
- `rbac:` block in `app-config.yaml` is **empty** (only a commented `enabled`). No `rbac.policies`,
  no admin-role/superUser config, no role seeds. Production/docker configs have **no** `rbac:` block.
- The active decision path is **`permissionModulePlatformPolicy`** (`PlatformPermissionPolicy`) set via
  the standard `policyExtensionPoint` — i.e. the **custom policy is the current decision source**, not
  the Community RBAC plugin.
- The Community RBAC plugin is `backend.add(...)`'d (backend) and `rbacPlugin` mounted (frontend),
  **but installation ≠ runtime ownership** (Section Q1 = NO).

---

## 3. CURRENT ROLE MAPPING (source: `roles.ts`, `policy.ts`, `permissions.ts`)

| Current Role (`PlatformRole`) | Catalog Group (`org.yaml`) | Effective permission sets | Source file | Community RBAC equivalent (target) |
|---|---|---|---|---|
| `VIEWER` | `group:default/platform-viewers` | `VIEWER_PERMISSION_NAMES` (+ generic `action:read` fallback for non-privileged reads) | `roles.ts`/`permissions.ts` | RBAC role `platform-viewer` bound to `platform-viewers` group, permission effects = same set |
| `DEVELOPER` | `group:default/data-product-developers` | Viewer ⌄ + scaffolder task/action, template params/steps, `data-product.create`, validation run/test, model-company run/control, `urs.create`, plugin-directory read | `roles.ts`/`permissions.ts` | RBAC role `data-product-developer` bound to `data-product-developers` |
| `DATA_PRODUCT_OWNER` (display "Owner") | `group:default/data-product-owners` | Developer ⌄ + `data-product.governance`, `data-product.certification.manage`, `aas.manage`, `validation.review`, `urs.manage`, `urs.approve` | `roles.ts`/`permissions.ts` | RBAC role `data-product-owner` bound to `data-product-owners` |
| `PLATFORM_ADMIN` (display "Admin") | `group:default/platform-admins` | Owner ⌄ + catalog delete/location, template mgmt, marketplace/template/platform/golden-path/entitlement/validation/plugin-directory/model-company/data-product admin, `urs.admin` | `roles.ts`/`permissions.ts` | RBAC role `platform-admin` bound to `platform-admins` |
| **no platform role** (specialist only) | `urs-authors/owners/business-reviewers/product-managers/quality-reviewers`, `validation-reviewers/managers`, `data-product-publishers`, `marketplace-publishers` | none today (groups exist but the custom evaluator ignores them) | `catalog/org.yaml` only | New RBAC roles ONLY where the current code already implies them (URS/validation specialist workflow); otherwise map as "exists in catalog, policy not yet defined" |

**Specialist groups** (URS ×5, validation ×2, data-product-publishers, marketplace-publishers) are
defined in `org.yaml` but **not consumed** by `resolvePlatformRole`. They are the natural subjects for
Community RBAC roles, but the current custom logic grants them nothing -> migrating them is
**additive / new** RBAC configuration, NOT parity (no behavior to preserve yet).

---

## 4. DOMAIN / PLATFORM PERMISSION MAPPING

All permissions below are Backstage Permission objects (`createPermission`,
`@backstage/plugin-permission-common`) from `packages/platform-common/src/permissions.ts`
(+ `permissions/urs.ts`, `permissions/validation.ts`) or standard Backstage built-in permission names
referenced by the role sets. **No custom evaluator.**

### 4.1 Platform role-sets → Community RBAC effects (parity source)

| Permission (name) | Owning plugin/domain | Currently granted to | Target RBAC effect granted to |
|---|---|---|---|
| `marketplace.view` | marketplace | VIEWER | platform-viewer role |
| `marketplace.admin` | marketplace | ADMIN | platform-admin role |
| `data-product.view`/`consume`/`viewQuality`/`viewValidation` | data-products | VIEWER | platform-viewer |
| `data-product.create` | data-products | DEVELOPER | data-product-developer |
| `data-product.governance`/`certification.manage` | data-products | OWNER | data-product-owner |
| `data-product.admin` | data-products | ADMIN | platform-admin |
| `platform.admin`/`template.admin`/`golden-path.release.manage` | platform/scaffolder | ADMIN | platform-admin |
| `aas.read` | aas | VIEWER | platform-viewer |
| `aas.manage` | aas | OWNER | data-product-owner |
| `entitlement.view` | entitlements | VIEWER | platform-viewer |
| `entitlement.admin` | entitlements | ADMIN | platform-admin |
| `validation.read`/`requirement.read`/`traceability.read` | validation-expert | VIEWER | platform-viewer |
| `validation.run.start`/`validation.test.execute` | validation-expert | DEVELOPER | data-product-developer |
| `validation.review` | validation-expert | OWNER | data-product-owner |
| `validation.admin` | validation-expert | ADMIN | platform-admin |
| `validation.approve`/`risk.accept`/`baseline.modify` | validation | **never** (reserved) | **deny-by-default** (no effect) |
| `pluginDirectory.read` | plugin-directory | DEVELOPER | data-product-developer |
| `pluginDirectory.admin` | plugin-directory | ADMIN | platform-admin |
| `modelCompany.read` | model-company | VIEWER | platform-viewer |
| `modelCompany.runScenario`/`control` | model-company | DEVELOPER | data-product-developer |
| `modelCompany.admin` | model-company | ADMIN | platform-admin |
| `urs.read` | urs-composer | VIEWER | platform-viewer |
| `urs.create` | urs-composer | DEVELOPER | data-product-developer |
| `urs.manage`/`urs.approve` | urs-composer | OWNER | data-product-owner |
| `urs.admin` | urs-composer | ADMIN | platform-admin |
| `catalog.*` reads | backstage catalog | VIEWER | platform-viewer |
| `catalog.entity.create`/`refresh` | backstage catalog | DEVELOPER | data-product-developer |
| `catalog.*` delete/location | backstage catalog | ADMIN | platform-admin |
| `scaffolder.task.*`/`action.*`/`template.parameter.read`/`step.read` | scaffolder | DEVELOPER | data-product-developer |
| `scaffolder.template.management` | scaffolder | ADMIN | platform-admin |

### 4.2 Golden Path domain permissions (from `templates/*/authorization.yaml`)

24 domain permissions (oee/mqtt/equipment/aas/machine-state/uns) are **profile metadata today** and
are **not** yet Backstage `createPermission` objects. They are **out of scope for this RBAC-policy
migration** (do not modify domain permissions / Golden Paths yet). Target for a later phase: register
them as owned `createPermission` objects in their domain plugins; the Authorization Profile Registry
keeps them as **discovery metadata only** (never evaluates).

| Domain | Permissions | Owning Golden Path | Current granting |
|---|---|---|---|
| oee | oee.{read,operate,configure,admin} | oee-data-product | none (not catalog-registered) |
| mqtt | mqtt.{read,operate,configure,admin} | mqtt-temperature-product | none |
| equipment | equipment.{read,operate,configure,admin} | rest-equipment-product | none |
| aas-data | aas.{read,operate,configure,admin} | aas-data-product | none |
| machine-state | machine-state.{read,operate,configure,admin} | machine-state-consumer | none |
| uns | uns.{read,operate,configure,admin} | unified-namespace | none |

---

## 5. TARGET ARCHITECTURE (single decision engine)

```
Catalog User / Group          (@backstage/plugin-catalog-backend, catalog/org.yaml)
   → Community RBAC Role      (@backstage-community/plugin-rbac-backend)   [admin via /admin/rbac]
   → Permission Policy        (RBAC-defined effects; the decision source)
   → Backstage Permission Framework (@backstage/plugin-permission-backend) [authorize()]
       └─ thin conditional policy (optional, see §6) for NON-RBAC commercial gates
   → Plugin Permission        (createPermission definitions owned by plugins)
   → ALLOW / DENY
```

- **Role→permission** decision owned by Community RBAC (roles/policies seeded to match the current sets).
- **Permissions** remain standard `createPermission` objects owned by their plugins.
- **Entitlements / release gates** stay as a separate commercial concern (see §7), not RBAC rules.
- **One** authorization decision path. No duplicate role→permission evaluator.

---

## 6. WHAT `PlatformPermissionPolicy` BECOMES

**Preferred target:** a **thin delegating/configuration policy only** — the RBAC backend owns the
role→permission decision; `PlatformPermissionPolicy` is reduced to (or ordered downstream of) a
conditional policy handling **only** the non-RBAC commercial business rules (entitlements and release
gates). If the RBAC policy server cannot express those, `PlatformPermissionPolicy` becomes a
**downstream conditional policy** that:
1. passes through the RBAC-decided ALLOW, and
2. applies the entitlement AND release-gate only (never role→permission evaluation).

**Remove from active decision logic (after migration, Phase 4):**
- `decidePermission(request.permission, role, resourceRef)` role→permission evaluation,
- `permissionsForRole(role)` / `*_PERMISSION_NAMES` role-set lookup,
- `resolvePlatformRole(ownership)` / `hasApprovedPlatformAccess` role resolver.

**Keep** inside/alongside `PlatformPermissionPolicy`: the entitlement gate + release gate + the
create-authorization audit recording (URS-AUD requirement) — these are commercial/compliance, not RBAC.

**Rule:** exactly one authoritative decision path per permission. Never let both the RBAC plugin and
`decidePermission` decide the same permission.

---

## 7. ENTITLEMENTS / COMMERCIAL GATES (keep separate)

- **RBAC** answers *authorization* (can user X perform permission Y given role/groups).
- **Commercial entitlement** answers *product access/licensing* (is the organization entitled to a
  commercial product) — `entitlements-backend`, `commercial.localEntitlements`, `EntitlementService`.
- **Release gate** (GA) answers *availability* of a Golden Path release.

These are **not** roles and must **not** be migrated into RBAC rules. They remain in the
entitlements/release layer (a thin conditional policy or router-level check). This keeps changes to
RBAC policies from ever affecting licensing/availability semantics and vice-versa.

---

## 8. GOLDEN PATH IMPACT (no changes this gate)

Golden Path authorization profiles (`templates/*/authorization.yaml`) define **authorization intent**:
domain permissions + suggested roles/groups. They must **reference** (declare) that intent and
**never** own runtime role evaluation. After this migration:

- Golden Path → domain permissions (owned `createPermission`, later phase) →
  suggested roles (administered as Community RBAC roles) → Catalog groups.
- A generated product carries `authorizationProfile: { id, version }` + catalog annotation
  (`nexora.io/authorization-profile: <id>`) for traceability.
- Runtime ALLOW/DENY is decided by the standard Backstage RBAC (RBAC-defined policy effect), **not**
  by any Golden Path or custom evaluator.

---

## 9. MIGRATION PLAN (incremental, no big-bang)

### Phase 1 — Establish Community RBAC policies equivalent to current logic
1. Configure the `rbac:` block: define an **RBAC admin role** (e.g. `group:default/platform-admins`
   as RBAC admin / superUser) so `/admin/rbac` is usable (required by the community plugin).
2. Seed RBAC **roles** for `platform-viewer`, `data-product-developer`, `data-product-owner`,
   `platform-admin`, each mapped to the corresponding Catalog group.
3. Seed RBAC **policies/effects** granting exactly the permission sets in §4.1 (permission effects,
   not a custom evaluator).
4. Keep `PlatformPermissionPolicy` active (current) so runtime behavior is unchanged.

**Deliverable:** RBAC config (roles/groups/effects) exists and is administrable; two decision paths
temporarily coexist (RBAC-configured + custom), verified identical.

### Phase 2 — Parity tests
Write the parity suite (§10) asserting **same user + same group + same permission → same ALLOW/DENY**
before vs after, against the seeded RBAC effects and against the current `PlatformPermissionPolicy`.
Include Viewer/Developer/Owner/Admin/Guest/unknown/unauthenticated/reserved.

### Phase 3 — Switch the decision path
Activate the RBAC policy server as the **authoritative** role→permission source for platform
permissions, and make `PlatformPermissionPolicy` a **conditional downstream policy** that only applies
non-RBAC commercial gates (entitlements + release) and audit recording. Re-run parity. Remove any path
where `decidePermission` decides the same permission the RBAC plugin decides.

### Phase 4 — Remove obsolete custom evaluator
Remove/neutralize `decidePermission`, `permissionsForRole`, `*_PERMISSION_NAMES` role-set lookup,
`resolvePlatformRole`, `hasApprovedPlatformAccess` from the **active** decision logic.
Keep the files that define domain permissions (`permissions*.ts` `createPermission` objects),
authorization profiles (`authorization.yaml`) and the registry (metadata).
Keep entitlement + release + audit logic (commercial/compliance, not RBAC).

### Phase 5 — Verify Golden Path profile resolution against standard RBAC
Confirm every Golden Path resolves to exactly one effective Authorization Profile via the RBAC role
bound to its group, with no custom evaluator. (Domain permission registration and generated
profile-reference generation remain **separate later phases** per the objective.)

### Phase order rationale
Each phase is independently reversible and behavior-preserving; nothing is switched off until parity
is proven.

---

## 10. PARITY TEST PLAN

Goal: **same user, same group, same permission → same ALLOW/DENY** before and after each phase.

| # | User | Group(s) | Permission | Expect (current `policy.test.ts` basis) |
|---|---|---|---|---|
| P1 | `user:default/viewer` | `platform-viewers` | `catalog.entity.read`, `marketplace.view`, `aas.read`, `techdocs.entity.read` | ALLOW |
| P2 | `user:default/viewer` | `platform-viewers` | `aas.manage`, `scaffolder.task.create`, `data-product.create`, `data-product.certification.manage`, `entitlement.admin` | DENY |
| P3 | `user:default/developer` | `data-product-developers` | `scaffolder.task.create`, `scaffolder.action.execute`, `data-product.create` | ALLOW |
| P4 | `user:default/developer` | `data-product-developers` | `data-product.certification.manage`, `golden-path.release.manage` | DENY |
| P5 | `user:default/owner` | `data-product-owners` | `data-product.certification.manage`, `aas.manage` | ALLOW |
| P6 | `user:default/admin` | `platform-admins` | `scaffolder.template.management`, `golden-path.release.manage` | ALLOW |
| P7 | `user:default/guest` | `guests`, `platform-admins` (dev fallback) | `scaffolder.task.create` | ALLOW (local dev) |
| P8 | unknown GitHub user | none | `catalog.entity.read`, `scaffolder.task.create` | DENY |
| P9 | unauthenticated | — | `catalog.entity.read`, `techdocs.entity.read` | DENY |
| P10 | reserved | any | `validation.approve`, `risk.accept`, `baseline.modify` | DENY (never granted) |

Each case is executed once against the custom policy (BEFORE) and once against the RBAC-seeded effects
(AFTER); both must match. `packages/backend/src/permission/policy.test.ts` is the BEFORE baseline; the
AFTER cases run against the RBAC policy-server decision path. Specialist roles (URS/validation) are
**additive** — no parity required (no current behavior).

---

## 11. REQUIRED ANSWERS

1. **Is Community RBAC actually the active policy decision source today?**
   **NO.** The active decision path is the custom `PlatformPermissionPolicy` (`permissionModulePlatformPolicy`,
   registered via `policyExtensionPoint`). Community RBAC is installed and mounted but **not configured**
   (no roles, no policies, no admin role, no policy-server delegation).

2. **Where are Community RBAC policies persisted/configured?**
   **Nowhere yet.** No `rbac.policies` config, no role/policy seed files, no admin-role config. The
   plugin's persistence is its own database (knex/Postgres); the local SQLite setup has no seeded RBAC
   tables. Currently **zero** RBAC roles/policies exist.

3. **Which custom files can be removed after migration?**
   Role-evaluator logic: `packages/platform-common/src/roles.ts` (`resolvePlatformRole`,
   `hasApprovedPlatformAccess`), `packages/platform-common/src/policy.ts` (`decidePermission`,
   `permissionsForRole`), the role-set constants in `packages/platform-common/src/permissions.ts`
   (`*_PERMISSION_NAMES`), and the `decidePermission`/`resolvePlatformRole` usage in
   `packages/backend/src/permission/policy.ts`. Remove only after Phase 4 (post-parity + switch).

4. **Which custom files must remain because they define domain permissions?**
   `packages/platform-common/src/permissions*.ts` (`createPermission` objects),
   `packages/platform-common/src/permissions/urs.ts`, `permissions/validation.ts`,
   `templates/*/authorization.yaml` + `plugins/authorization-registry-backend` (profile metadata),
   and the entitlement/release/audit logic (commercial, not RBAC).

5. **Can the current behavior be migrated without changing user-facing role semantics?**
   **YES** — seed RBAC roles/effects matching the current role→permission sets (§4.1) and prove parity
   (§10). User-facing group membership and platform role semantics are preserved.

6. **Will the target architecture contain one authorization decision engine?**
   **YES.** Backstage Permission Framework with the Community RBAC policy server as the role→permission
   decision source; `PlatformPermissionPolicy` becomes a thin downstream conditional policy for
   non-RBAC commercial gates only. No second engine.

7. **Will Golden Paths depend on standard Backstage RBAC rather than a custom evaluator?**
   **YES.** Golden Paths express authorization intent via profiles; runtime ALLOW/DENY is decided by
   standard Backstage RBAC. No custom evaluator.

---

## 12. RISKS AND ROLLBACK

### Risks
- **Policy-server coexistence (highest):** activating the RBAC policy server while
  `PlatformPermissionPolicy` is still set via the `policyExtensionPoint` can conflict (Backstage allows
  one policy on the extension point). Mitigate by making the RBAC policy server authoritative first,
  then reducing `PlatformPermissionPolicy` to a downstream conditional policy (or legacy-policy chain),
  per Phase 3 — verified by full parity before removal.
- **Backstage built-in permission names** (e.g. `catalog.entity.read`, `scaffolder.task.*`) must be
  granted as RBAC effects; RBAC policies refer to permission names the owning plugins publish. Verify
  names match the catalog of the running backend.
- **Reserved permissions** (`validation.approve`, `risk.accept`, `baseline.modify`) must be **deny by
  default** (no RBAC effect) — never accidentally granted.
- **Admin-role bootstrap:** the community plugin needs an RBAC admin (superUser) before the UI can
  create roles. Without it, seeding must be done via config/DB seed. Must be solved in Phase 1.
- **Audit continuity:** create-authorization audit (URS-AUD) must keep recording even as the decision
  source changes; keep the audit call in the downstream policy, not in the removed evaluator.
- **Specialist groups** are currently granted nothing; enabling them via RBAC is **new behavior**. Do
  not enable them in the parity/switch phases; treat as a separate change.

### Rollback approach
- Phases are additive until Phase 3 switch. Rollback = revert the switch (restore custom policy as the
  extension-point policy, remove RBAC policy activation) or revert the `rbac` config to deployed state.
- Phase 4 removal is the only irreversible step; do it only after Phase 3 parity has a committed green
  suite, and keep the removed evaluator functions available behind an env-flag for one release if needed.

### Exact files affected (when the migration is executed)

| File | Phase | Action |
|---|---|---|
| `app-config.yaml` (+ `app-config.production.yaml`, `app-config.docker.yaml` if needed) | 1 | Add `rbac:` admin role + policy-server config |
| `catalog/org.yaml` | 1 | already has groups — no change needed |
| RBAC seed (config or DB) | 1 | Seed roles + permission effects for the 4 platform roles |
| `packages/backend/src/permission/policy.ts` | 3, 4 | Reduce to downstream conditional (entitlement/release/audit only); remove `decidePermission`/`resolvePlatformRole` calls |
| `packages/backend/src/permission/module.ts` | 3 | Keep/adapt policy registration to the downstream-conditional role |
| `packages/platform-common/src/policy.ts` | 4 | Remove `decidePermission`/`permissionsForRole` active use (or delete) |
| `packages/platform-common/src/roles.ts` | 4 | Remove active `resolvePlatformRole`/`hasApprovedPlatformAccess` (or delete) |
| `packages/platform-common/src/permissions.ts` | 4 | Remove `*_PERMISSION_NAMES` role-set constants; keep `createPermission` objects + `platformPermissions` |
| `packages/backend/src/permission/policy.test.ts` | 2 | Extend as parity baseline (BEFORE cases) |
| new RBAC parity test | 2 | AFTER cases against RBAC policy server |

**Golden Path impact:** none in this gate. Later, profiles will reference owned domain permissions and
suggested roles administered as RBAC roles; no runtime role evaluation in Golden Paths.

---

## 13. GIT / SECURITY SAFETY

- This gate is **analysis/planning only**: no RBAC policies changed, no custom logic removed, no Golden
  Paths modified, no permissions modified, no commit, no push.
- The only new artifact is this report (`BACKSTAGE_RBAC_MIGRATION_REPORT.md`, untracked).

---

## 14. FINAL VERDICT

**BACKSTAGE_RBAC_MIGRATION_READY_WITH_GAPS**

Migrating the hard-coded role→permission mapping into the installed Community RBAC plugin is feasible
and well-understood (permission sets and 4 platform roles map cleanly; parity is provable via the
existing `policy.test.ts` baseline). The plan is incremental (5 phases) and reversible. It is **ready with
gaps** because:

- Community RBAC is **not yet operationally configured** (no admin role, no roles/policies seeded, no
  policy-server activation) — that is precisely the Phase-1 work.
- The **policy-server ↔ `PlatformPermissionPolicy` coexistence** needs an explicit, tested chaining
  decision (downstream conditional policy) — the highest-risk item.
- Specialist groups and the 24 Golden Path domain permissions are **additive** (not parity) and are
  intentionally deferred out of the RBAC-policy migration scope.

The target remains a **single authorization decision engine** (Backstage Permission Framework + Community
RBAC), with no duplicate evaluator and no second RBAC engine.

---

# PHASE 1 OPERATIONALIZATION RESULTS

**Date:** 2026-08-28
**Gate:** Prepare + parity-prove Community RBAC. **No switch of production decision source.**
Evidence classifications: `CONFIGURED`, `TEST_EXECUTED`, `RUNTIME_EXECUTED`, `CODE_INSPECTED`, `NOT_RUN`.

## 1. FINDINGS SUMMARY

| Finding | Classification |
|---|---|
| `@backstage-community/plugin-rbac-backend` + `plugin-rbac` installed and registered (backend + frontend `/admin/rbac`) | CONFIGURED (installed) |
| `rbac:` config empty; correct namespace is `permission.rbac` (from installed `config.d.ts`) | CODE_INSPECTED |
| RBAC policy storage is **Casbin + database** (knex pg/sqlite adapters) + optional CSV/YAML file seeding (`policies-csv-file`) | CODE_INSPECTED |
| RBAC plugin calls `policy.setPolicy(RBACPermissionPolicy)` when `permission.enabled` while custom `permissionModulePlatformPolicy` also calls `setPolicy` on the same extension point → **single-authority conflict** | CODE_INSPECTED |
| `PlatformPermissionPolicy` (custom) remains the effective runtime decision source | CONFIGURED (unchanged) |
| Shadow/parity harness: **312/312 match (0 mismatches)** for Viewer/Developer/Owner/Admin/Guest/unknown | TEST_EXECUTED |
| Seed `policies-csv-file` generated (251 Casbin lines) consistent with the parity model | CONFIGURED (prepared, not activated) |
| RBAC Admin UI live | NOT_RUN (no browser runtime; blocked by single-authority switch until Phase 3) |
| Live RBAC policy-server decision (active switch) | NOT_RUN (Phase 3, gated; would conflict now) |

## 2. PARITY EVIDENCE (TEST_EXECUTED)

Shadow harness in `.runtime/rbac-parity-harness.cjs` (gitignored) uses the **installed `casbin` engine**
and the **EXACT Casbin MODEL from the installed plugin** (`dist/service/permission-model.cjs.js`) to
answer real decision calls for 52 permissions × 6 subjects.

```
viewer     parity 100.0%  (52/52 match, 0 mismatch)
developer  parity 100.0%  (52/52 match, 0 mismatch)
owner      parity 100.0%  (52/52 match, 0 mismatch)
admin      parity 100.0%  (52/52 match, 0 mismatch)
guest      parity 100.0%  (52/52 match, 0 mismatch)
unknown    parity 100.0%  (52/52 match, 0 mismatch)
TOTAL: 312/312 match (100.00%)  mismatches=0
```

Machine-readable: `.runtime/rbac-phase1-parity-report.csv`. Seed: `.runtime/rbac/rbac-policies.csv`.
Prepared (not activated) config: `.runtime/rbac/prepared-app-config.rbac.yaml`.

**Two parity-relevant findings surfaced by the harness** (both must be honored when activating):
1. The current evaluator's **generic read-fallback** (`action==='read' && isAtLeast(VIEWER)` for
   non-privileged reads) must be **materialized as explicit RBAC read policies** (Casbin is
   deny-by-default). The seed CSV includes these.
2. The current `PLATFORM_ADMIN` behaves as **allow-all** (early return in `policy.ts`, except the
   scaffolder-template golden-path *release* gate). To preserve parity, the ADMIN RBAC role must be
   granted every permission (the seed materializes this). The scaffold *release* gate stays in the
   commercial/release layer, NOT in RBAC (per migration report §6/§7).

---

## 3. ACCEPTANCE MATRIX (this gate)

| Item | Result |
|---|---|
| Community RBAC configuration | ⚠️ CONFIGURED (prepared `permission.rbac` block + seed CSV; NOT activated) |
| RBAC backend operational | ⚠️ PARTIAL / NOT_RUN (installed; active policy switch blocked by single-authority rule) |
| RBAC frontend operational | NOT_RUN (no browser runtime) |
| Admin bootstrap (platform-admins) | CONFIGURED (prepared `permission.rbac.admin.users/superUsers` = `group:default/platform-admins`) |
| Viewer role mapped | CONFIGURED (seed `g,group:default/platform-viewers,VIEWER`) |
| Developer role mapped | CONFIGURED (seed `g,group:default/data-product-developers,DEVELOPER`) |
| Owner role mapped | CONFIGURED (seed `g,group:default/data-product-owners,OWNER`) |
| Admin role mapped | CONFIGURED (seed `g,group:default/platform-admins,ADMIN`) |
| Permission mapping complete | CONFIGURED (seed from committed `permissions.ts` role sets) |
| Viewer parity | ✅ PASS (52/52) |
| Developer parity | ✅ PASS (52/52) |
| Owner parity | ✅ PASS (52/52) |
| Admin parity | ✅ PASS (52/52) |
| Guest parity | ✅ PASS (52/52) |
| Unknown-group parity | ✅ PASS (52/52) |
| Unauthenticated parity | ⚠️ PARTIAL (harness covers subject with no group; true unauthenticated baseline suite NOT_RUN this gate) |
| Policy decision runtime (shadow) | ✅ RUNTIME_EXECUTED (casbin enforce calls) |
| Policy decision runtime (active switch) | NOT_RUN (Phase 3) |
| RBAC Admin UI | NOT_RUN |
| Affected tests (existing PlatformPermissionPolicy) | NOT_RUN this gate (backend test bootstrap unavailable in checkout — see note) |
| Affected builds | NOT_RUN |
| Regression | NOT_RUN (no source changes made) |

---

## 4. REQUIRED FINAL ANSWERS

1. **Is Community RBAC now operationally configured?**
   **YES (prepared)** — config and seed are authored against the installed schema, but the runtime
   policy activation is deliberately deferred to Phase 3 to respect the single-authority rule and
   section 13 (no source-switch this gate).

2. **Can it resolve Catalog Groups to RBAC roles?**
   **YES** — seed `g,group:default/<group>,<ROLE>` bindings + `useOwnershipEntityRefs: true` match the
   current `resolvePlatformRole(ownershipEntityRefs)` behavior (proven in the harness).

3. **Can it resolve RBAC roles to Backstage permissions?**
   **YES** — `p,<ROLE>,<permission>,<action>,allow` policies evaluated by the installed casbin engine
   (RUNTIME_EXECUTED in the parity harness; same MODEL the plugin uses).

4. **Is parity with the current custom evaluator 100% for the four platform roles?**
   **YES** — Viewer/Developer/Owner/Admin each 100% (52/52), plus Guest and unknown 100% (312/312, 0 mismatches).

5. **Is the custom evaluator still the effective production decision source?**
   **YES** — `PlatformPermissionPolicy` (`permissionModulePlatformPolicy`) still owns the runtime
   decision; no switch performed.

6. **Is Community RBAC ready to become the single role→permission source?**
   **NO (not yet)** — parity is proven, but activating it requires the Phase-3 single-authority switch
   (resolve the `policy.setPolicy` conflict, reduce `PlatformPermissionPolicy` to a downstream
   conditional), then re-run the full parity + regression. It is phase-ready, not switched.

7. **Were Golden Paths modified?**
   **NO**

---

## 5. PARITY VERDICT

**BACKSTAGE_RBAC_PHASE1_PARITY_COMPLETE_WITH_CONDITIONS**

Parity is proven (312/312, 0 mismatches) with the four platform roles at 100%. It is
`BACKSTAGE_RBAC_PHASE1_PARITY_COMPLETE_WITH_CONDITIONS` (not `COMPLETE`) because:

- Community RBAC is **prepared, not activated**: the runtime policy activation is gated to Phase 3 to
  satisfy the single-authority rule and section 13 (no source-switch). "RBAC backend operational
  (active decision)" and "RBAC Admin UI" are `NOT_RUN` this gate.
- The **generic read-fallback** and **ADMIN allow-all** semantics must be materialized as explicit RBAC
  policies (done in the seed) and re-verified at activation.
- Existing backend test suite / builds were not executable in this checkout (see note) and are `NOT_RUN`.

**Note on test execution in this checkout:** `yarn workspace` does not recognize the newly-added
authorization packages and the backend Jest bootstrap needs modules (e.g. `@backstage/backend-test-utils`)
not present in root `node_modules`; therefore the existing `PlatformPermissionPolicy` test suite is
`NOT_RUN` here. The parity harness (`TEST_EXECUTED`) uses the installed `casbin` engine directly and is
the executed evidence for this gate.

**No source changes were made.** `PlatformPermissionPolicy`, `decidePermission`, `roles.ts`,
`permissions.ts`, app-config, and all Golden Paths are unchanged. Deliverables live in the gitignored
`.runtime/` directory; the only untracked files are the two report documents.

---

# PHASE 2/3 — AUTHORITATIVE POLICY SWITCH (GATE RESULT)

**Date:** 2026-08-28
**Objective:** Transition authorization authority to Community RBAC (one decision authority) and prove
runtime 312/312 parity through the ACTIVE permission path.
**Verdict:** **BACKSTAGE_RBAC_AUTHORITY_SWITCH_NOT_COMPLETE** — mandatory runtime proof cannot be
executed in this checkout; a documented STOP condition applies (see §4).

## 1. SINGLE-POLICY CONFLICT — RECONFIRMED (CODE_INSPECTED)

Two modules both call `policy.setPolicy(...)` on the SAME `@backstage/plugin-permission-node/alpha`
`policyExtensionPoint`:

| Module | Init path → `setPolicy` |
|---|---|
| `permissionModulePlatformPolicy` | `packages/backend/src/permission/module.ts` → `policy.setPolicy(new PlatformPermissionPolicy({...}))` |
| `@backstage-community/plugin-rbac-backend` | `dist/plugin.cjs.js` → `PolicyBuilder.build` → when `permission.enabled`, `env.policy.setPolicy(await RBACPermissionPolicy.build(...))` |

Both register as `createBackendModule({ pluginId: 'permission', ... })`. **Therefore only ONE can own
the extension point.** Target owner after migration: **Community RBAC** (`RBACPermissionPolicy`). The
custom `permissionModulePlatformPolicy` must be removed from the active registration (reversibly
deactivated, not deleted) so that ONE `setPolicy` owner remains — satisfying "ONE AUTHORIZATION DECISION
AUTHORITY".

**Runtime basis (CODE_INSPECTED):** `packages/backend/src/index.ts` currently registers BOTH
`permissionModulePlatformPolicy` (line 27) and `@backstage-community/plugin-rbac-backend` (line 31),
i.e. the conflict is live in the committed backend wiring. Applying the switch means removing line 27
(and the import) so only the RBAC module sets the policy.

## 2. STOP CONDITION — RUNTIME IS NOT AVAILABLE IN THIS CHECKOUT (attempted, OUTPUT_OBTAINED)

Section 23 requires: STOP and return NOT_COMPLETE if "Permission Framework runtime cannot use Community
RBAC". The backend was genuinely attempted to boot (3 methods):
- `backstage-cli repo start` → hung at "Starting app, backend" (no output for 2+ min).
- `backstage-cli package start` (packages/backend) → terminated with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@internal/plugin-authorization-registry-backend'
imported from ...packages\backend\src\index.ts
```

The backend cannot boot because the `@internal/plugin-authorization-registry-backend` internal workspace
package is not linked/installed in this checkout's `node_modules` (the monorepo install for the
newly-added authorization plugin is not synced; the same constraint blocks the committed Jest suites —
`@backstage/backend-test-utils` absent, `yarn workspace` cannot parse the workspace).

**Consequence:** the following MANDATORY items cannot be executed here:
- Active Permission-Framework runtime decisions through Community RBAC (§11 of the brief).
- Post-switch parity against the ACTIVE path (§12 — must compare ACTUAL active decisions, not a
  simulation; the Phase-1 casbin harness proves parity logic, not the active runtime).
- Runtime ALLOW/DENY examples through the active path (§13).
- Restart persistence proof (§16).

These are recorded as `NOT_RUN (environment-blocked)`, **not** as PASS.

---

## 3. PRODUCTION CONFIGURATION — AUTHORED, NOT ACTIVATED (CONFIGURED/CODE_INSPECTED)

Authoritative switch preparation (schema validated against the installed
`node_modules/@backstage-community/plugin-rbac-backend/config.d.ts` — only supported keys used):

```yaml
permission:
  rbac:
    admin:                        # safe admin bootstrap = exactly platform-admins
      users:
        - name: group:default/platform-admins
      superUsers:
        - name: group:default/platform-admins
    policies-csv-file: <repo-controlled-path>/rbac-policies.csv   # materialized parity seed
    useOwnershipEntityRefs: true   # matches current resolvePlatformRole(ownershipEntityRefs)
    policyFileReload: false
    pluginsWithPermission: [ catalog, scaffolder, techdocs, data-products, marketplace, aas,
                             entitlements, validation-expert, plugin-directory, model-company,
                             urs-composer ]
```

- **Policy storage (Section 3 of brief):** Community RBAC uses **Casbin** policies persisted in the
  backend **database** (knex adapters: pg/sqlite). The seed CSV (`policies-csv-file`) is the
  **BOOTSTRAP CONFIGURATION** (initial state, file-watched); the **database is the operational RUNTIME
  POLICY STATE**. Once seeded, the DB is authoritative for ongoing changes (REST API / admin UI).
- **Correct repository-controlled location:** the seed CSV and config refer to a **committed,
  repository-controlled path** (e.g. `config/rbac/rbac-policies.csv`) — **NOT `.runtime/`**. The
  `.runtime/` copies are gitignored working artifacts only and must not be the production source of
  truth. Because the switch is NOT executed/verified in this gate, the config is authored here as a
  documented snippet (the report is the controlled artifact) and is marked **NOT ACTIVATED**.

## 4. MATERIALIZED PARITY POLICIES (CONFIGURED, from Phase-1 proof)

The Phase-1 proven seed (`.runtime/rbac/rbac-policies.csv`, 251 Casbin lines) is the parity source. It
includes the two Phase-1 findings:
- **A. Generic read fallback** materialized as explicit `p,<role>,<perm>,read,allow` policies (Casbin
  is deny-by-default).
- **B. PLATFORM_ADMIN allow-all** materialized as explicit `p,ADMIN,<perm>,<act>,allow` for every
  tested permission (committed `policy.ts` returns `allow` early for admin, except the scaffolder-template
  *release* gate which is a commercial concern, NOT RBAC).

Catalog group→role bindings: `g,group:default/platform-viewers,VIEWER`, `-developers,DEVELOPER`,
`-owners,OWNER`, `-admins,ADMIN` (Section 5 of brief). Specialist groups (URS/validation/
data-product-publishers/marketplace-publishers) are NOT migrated in this gate (Section 7) — unchanged.
Commercial entitlements / release gates are NOT moved into RBAC (Section 8).

---

## 5. SWITCH PROCEDURE (DOCUMENTED — NOT EXECUTED THIS GATE)

Switching is the exact, minimal, reversible change:
1. Make Community RBAC the single authority: remove `permissionModulePlatformPolicy` (import + line)
   from `packages/backend/src/index.ts` so only the `permission` backend + `@backstage-community/plugin-rbac-backend`
   set the policy. Keep `PlatformPermissionPolicy` module/source in place (deactivated, not deleted) as
   the rollback path.
2. Add the `permission.rbac` block (§3) to `app-config.yaml` (and production/docker).
3. Place the materialized seed CSV at the repository-controlled path.
4. Boot, seed, and prove ACTIVE runtime decisions + post-switch 312/312 parity + restart persistence
   (§11/§12/§16) and rollback (remove the block + restore the custom module) to revert.

Because §4 (runtime proof) is blocked, steps 1–4 were NOT executed; executing them blind would leave an
unverifiable state and violate §12 (post-switch parity must be proven against the ACTIVE path).

## 6. POST-SWITCH CODE CLASSIFICATION (CODE_INSPECTED)

| Code | Classification |
|---|---|
| `PlatformPermissionPolicy` (`packages/backend/src/permission/policy.ts` + `module.ts`) | DEACTIVATED (after switch): remove from active registration; retain entitlement/release/audit concerns downstream if a conditional policy is introduced; otherwise keep only for rollback |
| `decidePermission` / `permissionsForRole` (`platform-common/src/policy.ts`) | OBSOLETE_AFTER_PARITY → REMOVE_LATER |
| `resolvePlatformRole` / `hasApprovedPlatformAccess` (`platform-common/src/roles.ts`) | OBSOLETE_AFTER_PARITY → REMOVE_LATER (replaced by RBAC group→role) |
| `{VIEWER,DEVELOPER,OWNER,ADMIN}_PERMISSION_NAMES` (`permissions.ts`) | OBSOLETE_AFTER_PARITY → REMOVE_LATER (seed materializes it) |
| `createPermission(...)` objects + `platformPermissions` + `permissions/{urs,validation}.ts` | STILL_REQUIRED_DOMAIN_DEFINITION — MUST REMAIN |
| `authorization.yaml` + `authorization-registry-backend` | STILL_REQUIRED_DOMAIN_DEFINITION (profile metadata / discovery) |

## 7. ACCEPTANCE MATRIX (this gate)

| Item | Result |
|---|---|
| Community RBAC authoritative | NOT_RUN (not activated; runtime blocked) |
| Single policy owner | NOT_RUN (switch not executed) |
| Production RBAC configuration | CONFIGURED (authored, schema-validated; NOT activated) |
| RBAC policy persistence | CODE_INSPECTED (Casbin + DB seed) |
| Catalog group resolution | CONFIGURED (seed bindings; runtime NOT_RUN) |
| Viewer/Developer/Owner/Admin role resolution | CONFIGURED (seed) |
| Permission mapping | CONFIGURED (seed) |
| Generic read parity | ✅ PASS (Phase-1 harness, 312/312) |
| Admin allow-all parity | ✅ PASS (Phase-1 harness, 312/312) |
| Guest parity | ✅ PASS (Phase-1 harness) |
| Unknown-group parity | ✅ PASS (Phase-1 harness) |
| Unauthenticated parity | ⚠️ PARTIAL (baseline suite NOT_RUN) |
| Conditional permission preservation | CODE_INSPECTED (no conditional/resource perms in tested set; if used, RBAC returns CONDITIONAL and delegates to plugin handlers — standard flow preserved) |
| Actual Permission Framework runtime | FAIL (backend cannot boot: `ERR_MODULE_NOT_FOUND @internal/plugin-authorization-registry-backend`) |
| Post-switch 312/312 parity (ACTIVE) | NOT_RUN (runtime blocked) |
| RBAC Admin authorization | NOT_RUN |
| RBAC Admin browser | NOT_RUN |
| Restart persistence | NOT_RUN (runtime blocked) |
| Rollback readiness | CONFIGURED (switch reversible; custom module retained) |
| Affected tests | NOT_RUN (runtime blocked) |
| Affected builds | NOT_RUN (runtime blocked) |
| Regression (URS/Validation/Registry/Scaffolder) | NOT_RUN (no source changes; runtime blocked) |
| Golden Paths unchanged | ✅ PASS (no Golden Path modified) |

## 8. REQUIRED FINAL ANSWERS

1. **Is Community RBAC now the active role→permission decision source?** **NO** (not activated; runtime
   not proven here).
2. **Is PlatformPermissionPolicy still an active competing policy?** **YES** (it is still the active
   registration; the switch was not executed).
3. **Is there exactly one authoritative PermissionPolicy path?** **NO** today (both modules are
   registered); the TARGET is YES (documented switch achieves it).
4. **Did active runtime authorization achieve 312/312 parity?** **NO / NOT_RUN** — the Phase-1 harness
   proves parity logic (312/312), but ACTIVE runtime parity could not be executed (backend cannot boot).
5. **Are Catalog Groups resolved through Community RBAC?** **CONFIGURED** (seed bindings) but runtime
   resolution **NOT_RUN**.
6. **Are Pharma domain Permission objects still preserved?** **YES** (STILL_REQUIRED_DOMAIN_DEFINITION).
7. **Were commercial entitlement gates moved into RBAC?** **NO** (kept separate).
8. **Were Golden Paths modified?** **NO**.

## 9. FINAL VERDICT

**BACKSTAGE_RBAC_AUTHORITY_SWITCH_NOT_COMPLETE**

The authority switch is fully prepared and its exact procedure is documented, but it could **not be
completed or proven** because the backend runtime cannot boot in this checkout
(`ERR_MODULE_NOT_FOUND: @internal/plugin-authorization-registry-backend`), which is a documented
STOP condition (Section 23): the Permission Framework runtime cannot be exercised, so ACTIVE
post-switch 312/312 parity, runtime ALLOW/DENY examples, and restart persistence could not be
executed. No source was modified, no switch was applied blind, and the revert path is intact.

