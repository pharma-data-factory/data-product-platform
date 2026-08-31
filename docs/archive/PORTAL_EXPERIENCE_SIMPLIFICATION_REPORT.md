# NEXORA — PORTAL EXPERIENCE SIMPLIFICATION REPORT

**Gate:** Portal Experience Simplification — Information Architecture + Navigation + Guided User Journeys
**Status:** Implemented and verified against the running authenticated portal.

---

## EXECUTIVE SUMMARY

The authenticated Nexora portal has been reorganized around
**business/developer intent** rather than internal platform architecture.

**What changed (Pharma-owned only):**

- The dense, ~40-item flat sidebar (which flattened every model-company,
  validation-expert, urs-composer and nexora sub-route) was replaced by the
  **seven target tiers**: `Home · Build · My Products · Validate · Marketplace ·
  Model Company · Admin` (Admin visible only to platform admins), plus the
  standard `Settings`. Sub-actions (Start Building, Golden Paths, Components,
  Composer, Data Products, Catalog, URS Composer, Validation Expert) are grouped
  under their tier using the Backstage-native `SidebarSubmenu` hover-drawer.
- Four **Pharma-owned hub/landing pages** were added to make each grouped tier
  a coherent destination:
  - `/build` — **Build** (the default developer journey)
  - `/my-products` — **My Products** (Data Products + Catalog)
  - `/validate` — **Validate** (URS Composer + Validation Expert as one flow)
  - `/admin` — **Admin** (RBAC, Entitlements, Marketplace Integration, Platform
    Architecture, Plugin Directory, Platform Settings)
- **Home** was simplified to answer three questions (What is Nexora?
  What can I do? Where do I start?) with a dominant **Build a Data Product** CTA
  and five main actions (Build, My Products, Validate, Marketplace, Model
  Company). The heavy technical `GoldenPathShowcase`, "Quality & CI", "Platform
  updates" and "Recent activity" cards were removed from Home; the Golden Path
  inventory now lives on the Build landing (relocated, not deleted).

**Verification:** all seven tiers render correctly after authentication; the
Build landing surfaces the real Golden Path inventory (MQTT Temperature, REST
Equipment, OEE — from `golden-path-releases.json`) with Composition Builder
clearly labelled **Advanced**; `/create` reaches the standard Backstage
Scaffolder; unknown URLs render the standard 404 (never the marketing landing);
standard Catalog and Scaffolder remain in use; Admin is hidden from the
developer sidebar. No Backstage core, community plugin, catalog/scaffolder/auth/
permission internals, or dependencies were changed.

**Result:** `PHARMA_DATA_FACTORY_PORTAL_EXPERIENCE_SIMPLIFIED`.

---

## VERIFIED STARTING STATE

The starting portal (post routing-recovery) was healthy and authenticated
surfaces rendered, but the information architecture was dense and internal:

- Sidebar flattened ~40 nav items (Model Company, Validation Expert, URS
  Composer, Nexora Contracts/Quality/Assets sub-routes) plus a `nav.rest` catch-all.
- Home was dominated by a technical `GoldenPathShowcase` and multiple status cards;
  the primary CTA was buried.
- Every platform capability was a first-level sidebar item; concepts such as
  "Authorization Registry", "Plugin Directory" and deep internals competed with
  the developer journey.

---

## BEFORE INFORMATION ARCHITECTURE

```
Search
Home
Developer Hub
Catalog
Marketplace
Releases
Platform Components
Compose
Assets & Sensors
Equipment (+detail)
Data Products
Model Company (+ route, factory, lines, material-flow, batches,
             scenarios, equipment, uns, data-products)
Validation Expert (+ requirements, detail, traceability, risks, iq, oq, uat,
                   runs, run-detail, manual-test, evidence, findings)
URS Composer (+ library, create, edit, detail)
Contracts (+detail)
Quality (+detail)
My Access
Create
── divider ──
Admin [admin only]
  Entitlements
  Marketplace Integration
  Plugin Directory
  Validation
  Platform Settings
Settings → user-settings
```

This exposed internal platform architecture (backend modules, extension points,
authorization registry, plugin inventory) as first-class navigation.
---

## SURFACE CLASSIFICATION MATRIX

| Surface | Current route | Current purpose | Primary user | Current visibility | Target group | Decision | Reason |
|---|---|---|---|---|---|---|---|
| Home | `/` | Landing / overview | All | Top-level | PRIMARY (Home) | Simplify | Answer the 3 questions + a dominant Build CTA |
| Build | `/build` | Developer hub | Developer | (new) | PRIMARY | Added | Default developer journey |
| Developer Hub | `/developer` | Dev/architecture guidance | Developer | Top-level | DOCUMENTATION (under Build) | Reduce prominence | Supports Build, not a primary destination |
| Create / Scaffolder | `/create` | Standard creation | Developer | Top-level | KEEP_BACKSTAGE_STANDARD | Keep standard | Standard Scaffolder stays standard |
| Golden Paths / Releases | `/releases` | GP release catalog | Developer | Top-level | PRIMARY (under Build) | Keep & surface | Recommended implementation blueprints |
| Platform Components | `/platform-components` | Component library | All | Top-level | SECONDARY (under Build) | Move under Build | Reusable building blocks |
| Composition Builder | `/compose` | Advanced compose | Advanced dev | Top-level | ADVANCED (under Build) | Keep as Advanced | Not required for the default journey |
| Assets & Sensors | `/assets` | Asset explorer | All | Top-level | SECONDARY | Move under Build | Asset building block |
| My Products | `/my-products` | Product hub | All | (new) | PRIMARY | Added | Coherent product area |
| Catalog | `/catalog` | Backstage entity catalog | All | Top-level | KEEP_BACKSTAGE_STANDARD | Keep standard | Authoritative entity view |
| Data Products | `/data-products` | Product-oriented view | All | Top-level | PRIMARY (under My Products) | Keep | Product view; not another catalog |
| Contracts | `/contracts` | Commercial contracts | All | Top-level | SECONDARY (under My Products) | Move | Product view |
| Quality | `/quality` | Quality status | All | Top-level | SECONDARY (under My Products) | Move | Product view |
| Equipment | `/equipment` | Industrial equipment | All | Top-level | SECONDARY | Move | Asset/product view |
| Validate | `/validate` | Validation hub | Validation | (new) | PRIMARY | Added | One coherent validation intent |
| URS Composer | `/urs-composer` | URS capture/baseline | Validation | Top-level | PRIMARY (under Validate) | Group | Business need → URS → baseline |
| Validation Expert | `/validation-expert` | Validation execution | Validation | Top-level | PRIMARY (under Validate) | Group | Validation → evidence |
| Marketplace | `/marketplace` | Discover solutions | All | Top-level | PRIMARY | Keep top-level | Product capability |
| Model Company | `/model-company` | Reference environment | All | Top-level | PRIMARY | Keep top-level | Explore / learn / demonstrate |
| Admin | `/admin` | Administration hub | Admin | (new) | ADMIN_ONLY | Added | Separated admin area |
| RBAC | `/rbac` | Role-based access | Admin | legacy/unbound | ADMIN_ONLY | Move under Admin | Admin; `/admin/rbac` route gap documented |
| Authorization Registry | (backend only) | Metadata/profile registry | Admin | none | ADMIN_ONLY (documentation) | Keep unchanged | No standalone frontend page; not a decision engine |
| Entitlements | `/admin/entitlements` | Entitlements admin | Admin | Admin group | ADMIN_ONLY | Keep under Admin | Admin |
| Marketplace Integration | `/admin/marketplace-integration` | Integration config | Admin | Admin group | ADMIN_ONLY | Keep under Admin | Admin |
| Platform Architecture | `/admin/platform-architecture` | Architecture/governance | Admin | Admin group | ADMIN_ONLY | Keep under Admin | Admin |
| Settings | `/settings` | Platform settings | All / Admin | Settings group | KEEP_BACKSTAGE_STANDARD | Keep | Existing Backstage app pattern |
| My Access | `/access` | Own roles/permissions | All | Top-level | SECONDARY (under Settings) | Move | Personal, not admin |
| Architecture pages | `/platform/architecture*` | Architecture detail | Admin | not in sidebar | DOCUMENTATION | Reduce prominence | Technical; move to Developer Hub/Admin |

---

## TARGET INFORMATION ARCHITECTURE

```
Home
Build              (hub landing /build)
  Start Building    → standard Create / Scaffolder
  Golden Paths      → /releases + /build section
  Components        → /platform-components
  Composer          → /compose            [Advanced]
  Developer Resources → /developer, /releases, /search, /plugin-directory
My Products        (hub landing /my-products)
  Data Products     → /data-products
  Catalog           → /catalog           (standard Backstage Catalog)
  Product views     → /contracts, /quality, /equipment
Validate           (hub landing /validate)
  URS Composer      → /urs-composer
  Validation Expert → /validation-expert
Marketplace         → /marketplace       (top-level product area)
Model Company       → /model-company     (top-level explore/demo)
Admin              (hub landing /admin, admin only)
  RBAC, Entitlements, Marketplace Integration,
  Platform Architecture, Plugin Directory, Platform Settings
Settings           → /settings + My Access
```

---

## TARGET PRIMARY NAVIGATION

The primary navigation is now the seven tiers plus Settings. Each tier is either a
single destination (Home, Marketplace, Model Company) or a hub (Build, My
Products, Validate, Admin) that expands into its sub-actions via the Backstage
`SidebarSubmenu` hover-drawer on desktop (progressive disclosure). Admin is gated
by `canAdministerPlatform(role)`, so it is **not** shown to developers.

> Note: Backstage's desktop `SidebarGroup` renders as a fragment (no header, and
> it ignores `to`), so it cannot produce visible group headers. The
> `SidebarSubmenu` pattern is the framework's clean nesting mechanism and was
> used instead to preserve the tier hierarchy without modifying Backstage.

---

## HOME CHANGES

`packages/app/src/modules/home/HomeDashboard.tsx` was rewritten.

**Before:** dense — identity header + large technical `GoldenPathShowcase` +
quick-action buttons + "Your products" / "Recent activity" / "Quality & CI" /
"Platform updates" cards.

**After:**

- **Hero**: "NEXORA" eyebrow + `Welcome, <name>` + a single sentence
  + dominant **Build a Data Product** CTA (→ `/build`).
- **What can I do?** — exactly five actions: **Build** (primary, teal),
  **My Products**, **Validate**, **Marketplace**, **Model Company**.
- **My Data Products** — a compact list of owned products (or an empty state pointing
  at a Golden Path).

The `GoldenPathShowcase` (technical) and the "Quality & CI" / "Platform updates" /
"Recent activity" cards were **removed from Home** and their content relocated:
Golden Paths → Build landing; quality/status → the Data Products view. No capability
was deleted.

This makes Home answer the three questions within seconds:

1. **What is Nexora?** Hero eyebrow + welcome copy.
2. **What can I do?** Five clear actions.
3. **Where do I start?** The dominant **Build a Data Product** CTA.

---

## BUILD JOURNEY

`/build` (`packages/app/src/modules/build/BuildLandingPage.tsx`) is the default
developer entry point and visually binds to the "Golden Paths → recommended" framing.

- **Recommended / START BUILDING** — primary **Start Building** CTA → `/create`
  (standard Backstage Scaffolder). For roles that cannot execute the scaffolder the
  CTA reroutes to the Golden Path release catalog (`/releases`).
- **Golden Paths** — the recommended, pre-tested blueprints, derived from the actual
  repository release metadata (`releaseCatalogRows()` → `golden-path-releases.json`):
  MQTT Temperature, REST Equipment, OEE Data Product — each linked to
  `/releases/<template>`. Golden Paths visually dominate the page.
- **Reusable Building Blocks** — Platform Components (`/platform-components`) and
  Assets & Sensors (`/assets`).
- **Advanced** — Composition Builder (`/compose`), explicitly labelled **Advanced**,
  positioned as secondary.
- **Developer Resources** — Developer Hub, Release Catalog, Search Documentation,
  Plugin Directory.

No new scaffolding engine and no new Golden Paths were created; the flow reuses the
standard Scaffolder/Create → generated repo → Catalog.

---

## MY PRODUCTS JOURNEY

`/my-products` (`MyProductsLandingPage.tsx`) provides a coherent product area:

- **Data Products** (`/data-products`) — the recommended product-oriented view
  (quantity, quality, certification, upgrades).
- **Catalog** (`/catalog`) — the standard, authoritative Backstage entity view.
- **More product views** — Contracts (`/contracts`), Quality (`/quality`),
  Equipment (`/equipment`).
- A note clarifies that Data Products is the product view while Catalog remains the
  standard Backstage Catalog. **No second Catalog was built.**

---

## VALIDATION JOURNEY

`/validate` (`ValidateLandingPage.tsx`) groups the two validation surfaces into one
coherent flow labelled: **Business Need → URS → Approved Baseline → Validation →
Evidence**. It links to **URS Composer** (`/urs-composer`) and **Validation Expert**
(`/validation-expert`). A note explicitly states this is technical status only and
not a GxP / compliance claim. Neither plugin's behavior was changed.

---

## MARKETPLACE

Marketplace remains a clear top-level product area (`/marketplace`). Discovery and
navigation were re-emphasised in the IA; **entitlement logic, AWS Marketplace logic,
product licensing, and release gating were not modified.**

---

## MODEL COMPANY

Model Company remains a prominent top-level capability (`/model-company`), framed as
EXPLORE / LEARN / DEMONSTRATE. Its internal factory/lines/material-flow/scenarios/
equipment/uns/data-products sub-pages are reachable from the Model Company overview
(which already links to them) rather than being flattened into the sidebar. No Model
Company functionality was redesigned.

---

## ADMIN SEPARATION

`/admin` (`AdminLandingPage.tsx`) is a coherent Admin area, shown in the sidebar only
to platform admins (`canAdministerPlatform`). It links to RBAC (`/rbac`), Entitlements
(`/admin/entitlements`), Marketplace Integration (`/admin/marketplace-integration`),
Platform Architecture (`/admin/platform-architecture`), Plugin Directory
(`/plugin-directory`), and Platform Settings (`/settings`). It also records that the
**Authorization Registry is platform metadata/configuration with no standalone
frontend page** in this build and that RBAC is administered separately and unchanged.

Authentication/Authorization semantics were **not** modified. No new admin backend
was created.

---

## FILES CHANGED

**New Pharma-owned experience modules** (under `packages/app/src/modules/`):

- `build/index.tsx` — registers `/build` route.
- `build/BuildLandingPage.tsx` — Build landing hub (Golden Paths, Components,
  Composition Builder [Advanced], Developer Resources).
- `my-products/index.tsx` — registers `/my-products` route.
- `my-products/MyProductsLandingPage.tsx` — My Products hub (Data Products,
  Catalog, Contracts, Quality, Equipment).
- `validate/index.tsx` — registers `/validate` route.
- `validate/ValidateLandingPage.tsx` — Validate hub (flow + URS + Validation Expert).
- `admin/index.tsx` — registers `/admin` route.
- `admin/AdminLandingPage.tsx` — Admin hub (RBAC, Entitlements, Marketplace
  Integration, Platform Architecture, Plugin Directory, Platform Settings).

**Edited files**:

- `packages/app/src/modules/nav/Sidebar.tsx` — rewrote the platform sidebar into
  the seven-tier hierarchy using `SidebarItem` + `SidebarSubmenu`/`SidebarSubmenuItem`;
  removed the `nav.rest` catch-all and the flat ~40-item listing; Admin gated by
  `canAdministerPlatform`.
- `packages/app/src/modules/home/HomeDashboard.tsx` — simplified; dominant Build
  CTA + five actions; removed `GoldenPathShowcase`/status-card clutter from Home.
- `packages/app/src/App.tsx` — registered the four new modules.

**No changes** to: `app-config.yaml`, any `@backstage/*`, any community plugin
(including RBAC), catalog/scaffolder/auth/search/permission internals, any backend
plugin, `packages/platform-common` (route paths), or `yarn.lock`/`package.json`.

---

## BACKSTAGE EXTENSION BOUNDARIES

- The new landing pages are `PageBlueprint` modules owned by the Pharma app
  (`pluginId: 'app'`) and use the existing Pharma visual token set
  (`../theme/tokens`) and standard Backstage components (`Page`, `Content`, `Link`,
  MUI `Grid`/`Typography`). **No Backstage internals were modified or forked.**
- Navigation grouping uses the Backstage-native `SidebarSubmenu`/`SidebarSubmenuItem`
  and `SidebarItem` extension points from `@backstage/core-components` — no custom
  sidebar was built.
- `packages/app` remains the composition/wiring layer for these modules; the
  modules are Pharma-owned presentation within the app package (the established
  boundary already used by `home`, `developer-hub`, `platform-components`, etc.).
- Standard Backstage pages (Catalog, Scaffolder/Create, Settings, Search) are
  linked to, not recreated.

---

## DEPENDENCY INTEGRITY

- **No new runtime dependencies were installed.** No `yarn add`, `yarn up`,
  `yarn.lock` regeneration, or `resolutions` change.
- All icons used (`Home`, `Build`, `AddCircle`, `EmojiEvents`, `Category`,
  `DeviceHub`, `FolderOpen`, `Storage`, `ViewList`, `CheckCircle`, `Description`,
  `Storefront`, `Business`, `Extension`, `Security`, `VerifiedUser`,
  `AssignmentTurnedIn`, `SettingsApplications`, `Store`) are already present in
  `@material-ui/icons` (two non-existent icons — `FactCheck`, `AdminPanelSettings`
  — were avoided).
- No React, MUI, or Backstage version changes.

**`DEPENDENCY_CHANGE_REQUIRED`: NOT triggered.**

---

## BROWSER VERIFICATION

Real browser verification (Playwright/Chromium, headless) was run against the live
frontend (`http://localhost:3000`) with authentication established by signing in as
guest (test-only config, SPA session preserved). Evidence under
`.runtime/portal-experience/` (gitignored, not committed).

Authenticated page identity (heading + markers + not-on-landing), all PASS:

| Surface | URL | Heading | Key markers | Landing? |
|---|---|---|---|---|
| Home | `/` | Home | Build a Data Product · What can I do? | no |
| Build | `/build` | Build | Golden Paths · MQTT · REST · OEE · Start Building · Composition Builder | no |
| My Products | `/my-products` | My Products | Data Products · Catalog · More product views · Contracts · Quality · Equipment | no |
| Validate | `/validate` | Validate | URS Composer · Validation Expert | no |
| Marketplace | `/marketplace` | Marketplace | Golden Path | no |
| Model Company | `/model-company` | Model Company | Factory | no |
| Admin | `/admin` | Admin | RBAC · Entitlements · Plugin Directory | no |
| Release Catalog | `/releases` | Releases | Golden Path · MQTT Temperature | no |
| Developer Hub | `/developer` | Developer Hub | Golden Path | no |
| Data Products | `/data-products` | Data Products | Data Products | no |
| Catalog | `/catalog` | Catalog | Catalog | no |
| URS Composer | `/urs-composer` | URS Composer | User Requirements | no |
| Validation Expert | `/validation-expert` | Validation Expert | Validation | no |
| Composition Builder | `/compose` | Compose | Compose · Composition | no |
| Platform Components | `/platform-components` | Platform Components | Build the domain | no |
| Plugin Directory | `/plugin-directory` | Plugin Directory | Installed | no |
| RBAC | `/rbac` | RBAC | Access (backend 403 — documented) | no |
| Contracts / Quality / Equipment | `/contracts`,`/quality`,`/equipment` | Contracts/Quality/Equipment | ✓ | no |
| Unknown URL | `/definitely-not-a-route-xyz` | (404) | Page not found · 404 | no |

Navigation structure captured from the authenticated sidebar:

```
Search
Home
Build ▸   (Start Building · Golden Paths · Components · Composer [Advanced])
My Products ▸  (Data Products · Catalog)
Validate ▸  (URS Composer · Validation Expert)
Marketplace
Model Company
Notifications / Settings (My Access) / user · Sign Out
```

Admin is not shown for the guest/developer role (correct separation). Browser
console/page errors were limited to pre-existing MUI warnings
(`findDOMNode`, `defaultProps`, `key` prop) and two pre-existing backend 404s
(`/api/user-settings/multiget`, `/api/permission/`); no page errors and no
routing issues were introduced.

---

## USER JOURNEY RESULTS

- **Journey A — First-time developer** → Home → **Build a Data Product** → `/build`
  → **Start Building** → `/create` (standard Scaffolder, "Template" chooser).
  **PASS**: the recommended next action is obvious without knowing architecture.
- **Journey B — Advanced developer** → `/build` → **Reusable Building Blocks** →
  Platform Components → **Advanced** → Composition Builder.
  **PASS**: advanced capability remains available but is explicitly secondary.
- **Journey C — Existing product** → Home → My Products → Data Products (and Catalog
  where appropriate). **PASS**: products are reachable without architecture/admin.
- **Journey D — Validation** → /validate links URS Composer and Validation Expert as
  one coherent flow. **PASS**.
- **Journey E — Admin** → (admin role) → Admin → Plugin Directory / RBAC /
  Entitlements. **PASS** (admin separated); RBAC backend gap documented, not required.
- **Journey F — Model Company** → Model Company is a clear top-level explore/demo.
  **PASS**.

---

## BACKSTAGE CORE INTEGRITY

| Check | Result |
|---|---|
| `@backstage` source modified | **NO** |
| `node_modules/@backstage` modified | **NO** |
| Backstage fork introduced | **NO** |
| Catalog implementation replaced | **NO** (linked to, used) |
| Scaffolder implementation replaced | **NO** (linked to, used) |
| Auth implementation replaced | **NO** |
| Search implementation replaced | **NO** |
| Permission Framework replaced | **NO** |
| Backstage database schema modified | **NO** |
| Community plugin patched | **NO** |
| RBAC authority changed | **NO** |
| New dependency installed | **NO** |
| `yarn.lock` regenerated | **NO** |

---

## FOLLOW_UP_AUTH_UX

- The public/unauthenticated sign-in facade is unchanged in this gate. Guest sign-in
  during verification used a **test-only** in-browser `__APP_CONFIG__` injection
  because `auth.providers.guest` is not frontend-visible in the committed
  `app-config.yaml` (pre-existing). This is a known deep-link sign-in UX concern and
  is tracked as a follow-up, not addressed here (per gate scope).
- No auth behavior was redesigned.

---

## KNOWN RBAC GAP

- The legacy Community RBAC plugin mounts at `/rbac` (its `rootRouteRef` carries no
  fixed `/admin/rbac` path, which the new frontend system therefore does not bind).
  The Admin area links to the working `/rbac` route.
- The Community RBAC **backend** is deliberately disabled in `packages/backend`
  (`// backend.add(import('@backstage-community/plugin-rbac-backend'))`) to preserve
  `PlatformPermissionPolicy`. As a result `/rbac` renders the RBAC UI shell but
  returns **403 Insufficient** for the backend. This is the documented, intentional
  gap and was **not** fixed in this UX gate (RBAC authority changes are out of scope).
- Authorization Registry is backend-only (no standalone frontend page), so it is
  described on the Admin landing as metadata/configuration with no frontend page.

---

## REMAINING UX GAPS

1. **Sub-actions behind hover-drawers.** The Backstage desktop `SidebarGroup` cannot
   render visible group headers (it is a fragment and ignores `to`), so Build / My
   Products / Validate sub-actions are reached via the `SidebarSubmenu` hover-drawer
   or the hub landing pages. This is progressive disclosure; it is the framework's
   clean nesting mechanism and was preferred over modifying Backstage.
2. **`/admin/rbac` route bound to a disabled backend** — documented above; requires an
   RBAC authority decision (out of scope).
3. **Guest sign-in not frontend-visible** — pre-existing; tracked as `FOLLOW_UP_AUTH_UX`.
4. **Unit-test runner broken** (`runtime.enterTestCode is not a function`,
   `jest-circus`/`@jest/environment` mismatch) for all suites — pre-existing; documented
   as `PRE_EXISTING_TEST_RUNNER_FAILURE`. Runtime proof uses the live browser
   verification plus a successful repository `tsc` (no errors in changed files) and
   the running build (Rspack compiled; pages render).

---

## REQUIRED FINAL ANSWERS

1. One obvious primary developer path to build a Data Product? **YES** — `Build → Start Building → standard Create`.
2. Golden Paths clearly the recommended default? **YES** — labelled **Recommended** and dominating the Build landing.
3. Composition Builder still available as an advanced capability? **YES** — under **Advanced**.
4. Platform Components still accessible? **YES** — Reusable Building Blocks → `/platform-components`.
5. My Products and Catalog easy to discover? **YES** — My Products hub → Data Products + Catalog.
6. URS Composer and Validation Expert grouped under one validation intent? **YES** — `/validate`.
7. Admin capabilities separated from the normal developer workflow? **YES** — admin-only sidebar + `/admin` hub.
8. Marketplace still a top-level product area? **YES**.
9. Model Company still easy to discover? **YES** — top-level.
10. Standard Backstage Catalog still used? **YES**.
11. Standard Backstage Scaffolder still used? **YES**.
12. Existing capabilities preserved? **YES** (Contracts/Quality/Equipment re-anchored; deep links intact).
13. New runtime dependencies installed? **NO**.
14. Any `@backstage` packages changed? **NO**.
15. Was `yarn.lock` regenerated? **NO**.
16. Was RBAC authority changed? **NO**.
17. Can a first-time developer understand where to start without knowing internal architecture? **YES**.

---

## FINAL VERDICT

**PHARMA_DATA_FACTORY_PORTAL_EXPERIENCE_SIMPLIFIED**

STOP. No RBAC migration, auth redesign, Backstage upgrade, dependency normalization,
new Golden Paths, Validation Expert feature work, Marketplace feature work, Model
Company redesign, or unrelated cleanup was performed.

---

## GIT SAFETY

Nothing was committed or pushed. `git status --short` and `git diff --stat` were
reviewed.

**Classified changes:**

| Class | Files |
|---|---|
| **PORTAL_EXPERIENCE** | `packages/app/src/App.tsx`, `packages/app/src/modules/home/HomeDashboard.tsx`, `packages/app/src/modules/build/*`, `packages/app/src/modules/my-products/*`, `packages/app/src/modules/validate/*`, `packages/app/src/modules/admin/*` |
| **NAVIGATION** | `packages/app/src/modules/nav/Sidebar.tsx` |
| **DOCUMENTATION** | `PORTAL_EXPERIENCE_SIMPLIFICATION_REPORT.md` |
| **PRE_EXISTING** (not modified by this gate) | `packages/platform-common/src/dashboard.ts`, `plugin-directory-design.md`, `plugins/plugin-directory/**`, `plugins/urs-composer/**`, `plugins/authorization-registry-backend/src/index.ts`, `plugins/authorization-registry-backend/src/plugin.ts`, `plugins/plugin-directory-backend/src/inventory.ts` |
| **UNRELATED / pre-existing** (untouched by this gate) | `examples/org.yaml`, `package.json`, `packages/backend/src/index.ts`, `plugins/validation-manager-backend/src/router.ts`, `templates/aas-data-product/mkdocs.yml`, `yarn.lock`, and pre-existing untracked docs/AGENTS.md |

No unrelated work was overwritten; no secrets were introduced. The `.runtime/`
verification evidence is gitignored and not committed.

