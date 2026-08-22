# RC1 change-set reconciliation

| Field | Value |
| --- | --- |
| Product repo | `data-product-platform` |
| HEAD | `d96ab0cbd97ea86314ddcbd468ff5faf756df212` |
| Worktree paths | **240** |
| Date | 2026-08-22 |
| Prior result | RC1 READY TO FIX: NO (dirty tree) |
| Principle | Identify the Core validation *boundary* inside a reproducible repo state. Do not strip legitimate out-of-scope work. |

No file was edited, discarded, committed, or tagged.

---

## Counts (exactly one class per path)

| Class | Meaning | Count |
| --- | --- | --- |
| **A** | PLATFORM_CORE_IN_SCOPE | **36** |
| **B** | PLATFORM_CORE_SUPPORTING | **1** |
| **C** | OUT_OF_VALIDATION_SCOPE_BUT_ALLOWED | **191** |
| **D** | MIXED_REQUIRES_ANALYSIS | **12** |
| **E** | UNEXPLAINED_CHANGE | **0** |
| **Total** | | **240** |

36 + 1 + 191 + 12 + 0 = 240.

---

## A — PLATFORM_CORE_IN_SCOPE (36)

Implementation/tests/overlays that implement or verify Core URS (authz, entitlements, audit, CI display, claim control, hosted catalog overlays).

| Path | Status |
| --- | --- |
| `.env.example` | M |
| `app-config.docker.yaml` | M |
| `app-config.production.yaml` | M |
| `app-config.marketplace-test.yaml` | M |
| `packages/backend/src/permission/policy.ts` | M |
| `packages/backend/src/permission/policy.test.ts` | M |
| `packages/backend/src/permission/module.ts` | M |
| `packages/backend/src/pilotHardening.test.ts` | M |
| `packages/backend/src/config/claimControl.test.ts` | ?? |
| `packages/backend/src/config/committedConfigIntegrity.test.ts` | ?? |
| `packages/platform-common/src/entitlement-service.ts` | M |
| `packages/platform-common/src/entitlement-service.test.ts` | M |
| `packages/platform-common/src/entitlements.ts` | M |
| `packages/platform-common/src/documentation.ts` | M |
| `packages/platform-common/src/create-authorization-audit-store.ts` | ?? |
| `packages/platform-common/src/create-authorization-audit-store.test.ts` | ?? |
| `packages/app/src/modules/composer/ComposePage.tsx` | M |
| `packages/app/src/modules/composer/ComposePage.test.tsx` | M |
| `packages/app/src/modules/releases/ReleaseCatalogPage.tsx` | M |
| `packages/app/src/modules/entitlements/EntitlementsAdminPage.tsx` | M |
| `packages/app/src/modules/entitlements/MarketplaceIntegrationPage.tsx` | M |
| `plugins/entitlements-backend/src/router.ts` | M |
| `plugins/entitlements-backend/src/router.test.ts` | M |
| `plugins/entitlements-backend/src/runtime.ts` | M |
| `plugins/entitlements-backend/src/awsMarketplace.test.ts` | M |
| `plugins/data-products-backend/src/router.ts` | M |
| `plugins/data-products-backend/src/router.test.ts` | M |
| `plugins/data-products-backend/src/types.ts` | M |
| `plugins/data-products-backend/src/mapCiStatus.test.ts` | M |
| `plugins/data-products-backend/src/releaseRouter.test.ts` | M |
| `plugins/data-products/src/ciStatus.ts` | M |
| `plugins/data-products/src/components/CiStatusChip.tsx` | M |
| `plugins/data-products/src/components/CiQualityGateCard.test.tsx` | M |
| `plugins/data-products/src/api.test.ts` | M |
| `plugins/data-products/src/components/DataProductsPage.tsx` | M |
| `plugins/marketplace/src/components/MarketplacePage.tsx` | M |

`DataProductsPage` / `MarketplacePage` diffs are table/layout of in-scope plugins (no new authorization). Entitlements admin/integration diffs are overflow wrappers only.

---

## B — PLATFORM_CORE_SUPPORTING (1)

| Path | Status | Reason |
| --- | --- | --- |
| `yarn.lock` | M | Represents the actual workspace after adding five `@internal/plugin-nexora-*` packages (+129 lines). Not hand-split. See § Mixed / yarn.lock. |

---

## C — OUT_OF_VALIDATION_SCOPE_BUT_ALLOWED (191)

May remain in the candidate. Validation claim does **not** cover them.

Families (all paths in the 5A.1 inventory under Nexora identity, nexora plugins, industrial helpers, OEE template/docs/pilot, AAS `__init__.py`, `docs/nexora/`, `catalog/samples/*` except as noted in D):

| Family | Approx. count | Scope basis |
| --- | --- | --- |
| OEE template + `docs/oee` + `docs/releases/oee-*` + OEE backend tests | ~95 | DEC-SCOPE-001 / §4.11 |
| `pilot/oee` | 4 | §4.12 |
| `plugins/nexora-*` + `docs/nexora` + `nexora-industrial.ts*` | ~55 | Industrial views; live plant data not Core OQ (§5) |
| Branding / landing / architecture / theme / nav chrome (except Sidebar, which is D) | ~35 | Branding-only |
| AAS `pdf_aas/data/__init__.py` | 1 | AAS excluded (§5) |
| `mkdocs.yml`, product `README.md`, `docs/index.md`, catalog sample README | remainder | Docs/branding |

Exact paths are those in `RC1-Change-Inventory.md` not listed under A, B, or D.

---

## D — MIXED_REQUIRES_ANALYSIS (12)

See detailed analysis below. Files were **not** edited.

| Path | Status |
| --- | --- |
| `packages/backend/src/index.ts` | M |
| `packages/app/src/App.tsx` | M |
| `packages/app/package.json` | M |
| `packages/backend/package.json` | M |
| `packages/platform-common/src/index.ts` | M |
| `app-config.yaml` | M |
| `plugins/marketplace/src/data.ts` | M |
| `plugins/data-products/src/navigation.ts` | M |
| `plugins/data-products/src/navigation.test.ts` | M |
| `packages/app/src/modules/nav/Sidebar.tsx` | M |
| `packages/platform-common/src/commercial.ts` | M |
| `packages/platform-common/src/commercial.test.ts` | M |

---

## E — UNEXPLAINED_CHANGE (0)

No path remains unexplained after diff review.

---

## Mixed-file analysis (do not edit)

### `yarn.lock` → class **B** (not D)

| Question | Finding |
| --- | --- |
| Why | +129 lines register five workspace packages: `plugin-nexora-assets/backend/common/contracts/quality` |
| Core depend? | Install/reproducibility of the *current* workspace, including Core |
| Validated behavior? | No Core algorithm change |
| Expose out-of-scope? | Only by enabling those workspaces to resolve |
| Risk | Mixed lockfile is expected. Do **not** hand-edit. Core SOUP subset = Backstage + in-scope workspace packages (see SOUP plan) |
| Validation risk | Low if scope is documented |

### `packages/backend/src/index.ts`

| Question | Finding |
| --- | --- |
| Why | One added line: `backend.add(import('@internal/plugin-nexora-backend'))`. `aasPlugin` was already on HEAD |
| Core depend? | Core plugins already registered without this line |
| Validated behavior? | Does not change permission policy, scaffolder, or entitlements modules |
| Expose? | Loads industrial HTTP API in the **same process** |
| Risk | **SCOPE_BOUNDARY_RISK** — same runtime; uses `dataProductViewPermission`; optional remote proxy via `nexora.providers` |

### `packages/app/src/App.tsx` + `packages/app/package.json`

| Question | Finding |
| --- | --- |
| Why | Register four nexora frontend plugins and their workspace deps |
| Core depend? | Marketplace/data-products already loaded |
| Validated behavior? | No change to Core plugin logic; adds routes |
| Expose? | Industrial UI in the same SPA |
| Risk | **SCOPE_BOUNDARY_RISK** — routing/nav only; same session/auth |

### `packages/backend/package.json`

Adds `@internal/plugin-nexora-backend`. Supporting the `index.ts` load. Same risk as backend index.

### `packages/platform-common/src/index.ts`

| Question | Finding |
| --- | --- |
| Why | Exports FileCreateAuthorizationAuditStore (P1) **and** `nexora-industrial` types/helpers |
| Core depend? | Audit exports are required for policy module |
| Validated behavior? | Industrial exports do not alter `decidePermission` |
| Risk | Shared library coupling. Industrial import path sits next to Core exports |

### `app-config.yaml`

| Change | Class | Effect |
| --- | --- | --- |
| `catalog/samples/industrial.yaml` | C (local fixture) | Local catalog only; docker/production overlays omit samples |
| `nexora.providers` mock/remote URLs | C config | Industrial plugin only |
| `createAuthorizationAuditPath` | A | URS-AUD-001 |

Hosted IQ must still use docker/production overlays (no industrial samples).

### `plugins/marketplace/src/data.ts`

Three description-string edits (OEE, REST connector, Snowflake). Marketplace is in Core; copy is claim/marketing. Does not change authorization. Building-block helper `marketplaceOfferingKind` is unchanged in this diff.

### `navigation.ts` / `navigation.test.ts`

Adds Data Product links to `/contracts/:name` and `/quality/:name` (nexora UI). Does not change Create/RBAC. Exposes industrial routes from an in-scope page.

### `Sidebar.tsx`

Takes nexora page IDs into the Core sidebar. Routing exposure only.

### `commercial.ts` / `commercial.test.ts`

Adds Golden Path categories/filter/showcase fields used by landing (C) and shared CERTIFIED path metadata (A interface). Does not change `authorizeCreate` or policy AND-gates.

---

## Runtime boundary (critical)

### A. Repo-only (not loaded into Control Plane process)

- `templates/oee-data-product/**` (except as Scaffolder *template files* when that template is registered)
- `pilot/oee/**`
- `docs/oee/**`, `docs/nexora/**` (TechDocs/static docs)
- AAS Python `pdf_aas` `__init__.py`
- Untracked template/docs until catalog locations point at them

OEE **template.yaml** is listed in docker/production catalog locations (pre-existing). Template *content* remains out of Core URS; Scaffolder may generate it. That is the existing Core/Golden Path interface, not a new 5A.1 invention.

### B. Loaded in the same Backstage runtime (this worktree)

| Component | Loaded how | Can affect |
| --- | --- | --- |
| nexora-backend | `index.ts` add | HTTP routes; `dataProductViewPermission`; config `nexora.providers`; **not** auth providers, policy class, scaffolder, or Postgres schema |
| nexora frontend plugins | `App.tsx` | Client routes; same session |
| aasPlugin | **Already on HEAD** | AAS routes + `aas.read` / `aas.manage`; excluded from baseline; **pre-existing SCOPE_BOUNDARY_RISK** |
| industrial catalog sample | local `app-config.yaml` only | Local Catalog entities |

### SCOPE_BOUNDARY_RISK (do not expand URS)

1. **nexora-backend in-process** — additional authorized GETs; remote proxy if `nexora.providers.mode=remote`. Fail-closed on missing auth (403). Does not replace `PlatformPermissionPolicy`.
2. **nexora UI + Sidebar/App** — more routes in the validated host SPA.
3. **aasPlugin (pre-existing)** — DEVELOPMENT/AAS still in the process.
4. **Shared `platform-common`** — industrial helpers exported from the Core library package.

These are **not** E-class unexplained changes and are **not** automatic URS expansions.

---

## Validation package (copy not performed)

| Item | Value |
| --- | --- |
| Source | `IDP/validation/` |
| Target | `data-product-platform/validation/` |
| File count (source) | **53** |
| Content change on copy | None intended (byte copy) |
| `.gitignore` blocks `validation/`? | No |
| Executed | **No** |
