# PORTAL ROUTING RECOVERY REPORT

**Scope:** Diagnose and repair frontend routing so each registered plugin route renders its intended UI
(not the Nexora marketing landing / sign-in page), using only Pharma-owned composition/config fixes.

**Status:** `PASSED_WITH_GAPS`

---

## 1. Executive summary

The portal's routing was **fundamentally sound**. The "all plugin routes fall through to the
marketing landing page" symptom that a prior gate reported was **not a plugin routing bug** — it was the
**sign-in facade** (`LandingSignInPage` → `PublicLanding`), which by design renders the public
marketing landing for every unauthenticated path except `/model-company`.

After signing in (as the local-development guest), **every registered plugin route renders its intended
UI** with **two real exceptions**, both **path mismatches** that were confirmed and fixed:

| Route | Before | After |
|-------|--------|-------|
| `/urs-composer` | 404 Not Found | renders **URS Composer** |
| `/plugin-directory` | 404 Not Found | renders **Plugin Directory** |

The old paths `/urs` and `/admin/plugins` were the plugin's own previous canonical URLs; they now
correctly 404 (intended rename). No route silently renders the marketing landing after authentication.

---

## 2. Root-cause diagnosis

Evidence (from `.runtime/routing-recovery/`):

- `probe.txt` + screenshots proved all routes except `/model-company` rendered `PublicLanding` / the
  Sign-In page **when unauthenticated**. A browser stack trace confirmed the renderer:
  `LandingSignInPage → PublicLanding`.
- Reading `packages/app/src/modules/identity/LandingSignInPage.tsx` confirmed the sign-in gate
  special-cases `/model-company` and routes **every other path** to `PublicLanding` while unauthenticated.
- This is the **auth gate**, not a router catch-all. Plugin routes are registered behind it.

Therefore the correct way to validate routing is **post-authentication**. With guest sign-in established,
`/model-company` (previously the only "working" route) is not special — all plugin pages render normally.

---

## 3. How sign-in was established for verification (test-only)

The local-development guest sign-in button is **not rendered** because `auth.providers.guest` is not
frontend-visible in `app-config.yaml` (it lacks `@visibility frontend`), so `guestEnabled` is `false`
and only `Continue with GitHub` appears. This is a **pre-existing configuration visibility limitation**
that is unrelated to routing.

Verification therefore used a **test-only** in-browser injection of the guest provider
(`window.__APP_CONFIG__` in the Playwright script) so the `Continue as Guest` button renders. **No repo
file was changed for this.** An attempted `@visibility frontend` annotation on the guest provider was
verified to be ineffective in the dev config bundle (the injected config still filtered `guest`), so it
was reverted to keep the diff purely routing.

---

## 4. Confirmed path mismatches (the only real routing defects)

### 4.1 URS Composer — `/urs` → `/urs-composer`
Source: `plugins/urs-composer/src/plugin.tsx` registered the page tree under `/urs` while the portal's
canonical/expected path is `/urs-composer`.

### 4.2 Plugin Directory — `/admin/plugins` → `/plugin-directory`
Source: `plugins/plugin-directory/src/plugin.tsx` registered the page tree under `/admin/plugins` while
the portal's canonical/expected path is `/plugin-directory`.

Both were confirmed rendering a Backstage **404 Not Found** at the expected URL (post-auth), and both
render correctly at their own canonical URL — proving a registration path mismatch, not a logic bug.

---

## 5. Changes applied

All changes are Pharma-owned, in `packages/` and `plugins/` only. **No Backstage Core, node_modules,
or `@backstage/*` files were modified.**

### URS Composer
- `plugins/urs-composer/src/plugin.tsx` — page paths:
  `/urs` → `/urs-composer`, `/urs/library` → `/urs-composer/library`, `/urs/new` → `/urs-composer/new`,
  `/urs/:id/edit` → `/urs-composer/:id/edit`, `/urs/:id` → `/urs-composer/:id`.
- `plugins/urs-composer/src/pages/URSComposerPage.tsx` — `navigate('/urs/library')` → `/urs-composer/library`.
- `plugins/urs-composer/src/pages/URSLibraryPage.tsx` — link/`navigate` paths updated to `/urs-composer/...`.
- `plugins/urs-composer/src/pages/URSRequirementSetPage.tsx` — edit link updated.
- `plugins/urs-composer/src/plugin.routes.test.ts` — route assertions updated to the new paths.

### Plugin Directory
- `plugins/plugin-directory/src/plugin.tsx` — page paths:
  `/admin/plugins` → `/plugin-directory`, `/admin/plugins/:pluginId` → `/plugin-directory/:pluginId`.
- `plugins/plugin-directory/src/components/PluginDirectoryPage.tsx` — detail link → `/plugin-directory/:id`.
- `plugins/plugin-directory/src/components/PluginDetailPage.tsx` — two `RouterLink to` → `/plugin-directory`.
- `plugins/plugin-directory/plugin.yaml` — `route: "/plugin-directory"`.
- `plugins/plugin-directory-backend/src/inventory.ts` — `frontendRoute: "/plugin-directory"`.
- `packages/platform-common/src/dashboard.ts` — admin quick action `to: "/plugin-directory"`.
- `plugins/plugin-directory/src/components/PluginDirectoryPage.test.tsx` — route assertions updated.
- `plugin-directory-design.md` — route table updated (documentation consistency).

The sidebar uses `nav.take('page:urs-composer')` / `nav.take('page:plugin-directory')`, so the nav items
follow the canonical route automatically — no Sidebar edit was required.

---

## 6. Verification (Chromium/Playwright, authenticated)

Verification signed in as guest then used **SPA navigation** (`pushState` + `popstate`) so the in-memory
guest session survives (a full page reload drops it — no guest cookie is set). Full results:
`.runtime/routing-recovery/verify6.json`.

| Route | Renders | Evidence |
|-------|---------|----------|
| `/urs-composer` | URS Composer | `User Requirements Specification`, WHY/WHAT/HOW/ASSURANCE |
| `/plugin-directory` | Plugin Directory | inventory table, `Backstage Core … enabled`, `Loaded` |
| `/urs` (old) | 404 | `ERROR 404: PAGE NOT FOUND` (correct rename) |
| `/admin/plugins` (old) | 404 | `ERROR 404: PAGE NOT FOUND` (correct rename) |
| `/catalog` | Catalog | Owned Components table |
| `/create` | Scaffolder | template list |
| `/data-products` | Data Products | governed product table |
| `/marketplace` | Marketplace | certified Golden Paths |
| `/validation-expert` | Validation Expert | workbench |
| `/model-company` | Model Company | Nexora Model Pharma |
| `/settings` | Settings | General / Appearance |
| `/platform-components` | Component Library | platform components |
| `/compose` | Compose | Composition Builder |
| `/developer` | Developer Hub | Golden Paths |
| `/definitely-not-a-route-xyz` | 404 | `ERROR 404: PAGE NOT FOUND` |

No route rendered the marketing landing after authentication. Screenshots: `.runtime/routing-recovery/`
`final-urs-composer.png`, `final-plugin-directory.png`, `final-admin-rbac.png`, `final-urs-old.png`.


---

## 7. Known gaps (documented, not fixed by design)

### 7.1 RBAC admin UI at `/admin/rbac`
`/admin/rbac` renders a **404 Not Found**, and the RBAC page is actually mounted at **`/rbac`**
(the legacy plugin's default mount), where it shows `ERROR 403: Insufficient permissions`.

- The RBAC plugin is a **legacy** plugin (`createPlugin` from `@backstage/core-plugin-api`) whose
  `rootRouteRef` carries no fixed path; the new frontend system does not bind it to `/admin/rbac`.
- The RBAC **backend** is intentionally disabled in `packages/backend/src/index.ts`
  (`// backend.add(import('@backstage-community/plugin-rbac-backend'))`) because the community RBAC
  policy server conflicts with the platform's `PlatformPermissionPolicy` ("Policy already set").
- Re-wiring RBAC would require changing the **RBAC authority**, which is explicitly out of scope
  ("Do not change RBAC authority"). This is a **pre-existing, intentional gap**, not a
  route-falls-through-to-landing defect.

### 7.2 Guest sign-in button hidden
`auth.providers.guest` is not `@visibility frontend` in `app-config.yaml`, so the local-dev
`Continue as Guest` button is hidden (`guestEnabled === false`). Documented above; no routing impact.

---

## 8. Unit tests

The repo's test runner is **broken in this environment** for all suites (including untouched ones):
`TypeError: runtime.enterTestCode is not a function` (a `jest-circus`/`@jest/environment` mismatch).

- Via `backstage-cli repo test --testPathPatterns`, all matching suites (including
  `model-company/plugin.routes.test.ts` and `validation-expert/plugin.routes.test.ts`, which were not
  changed) fail with this infrastructure error **before any test runs**.
- The changed TS/TSX is validated instead by the **frontend bundle compiling successfully**
  (`Rspack compiled successfully` repeatedly during hot reload) and the **backend starting cleanly**
  (port `7007`), plus the live browser verification above.
- A repo-wide `tsc` reports **pre-existing** errors only in untouched backend test files
  (`plugins/urs-composer-backend/src/p1a-verification.test.ts`, `seeds.ts`); **no errors occur in any
  file changed by this recovery**.

---

## 9. Change classification (git)

Confirmed via `git status` — only Pharma-owned source files under `packages/` and `plugins/` were
changed by this work, plus `plugin-directory-design.md`. No `node_modules`, no `@backstage/*`,
no `@backstage-community/*`, and no `app-config.yaml` changes.

**Changed by this recovery (12 source files + 1 doc):**
`plugins/urs-composer/src/plugin.tsx`, `plugins/urs-composer/src/pages/{URSComposerPage,URSLibraryPage,URSRequirementSetPage}.tsx`,
`plugins/urs-composer/src/plugin.routes.test.ts`, `plugins/plugin-directory/src/plugin.tsx`,
`plugins/plugin-directory/src/components/{PluginDirectoryPage,PluginDetailPage,PluginDirectoryPage.test}.tsx`,
`plugins/plugin-directory/plugin.yaml`, `plugins/plugin-directory-backend/src/inventory.ts`,
`packages/platform-common/src/dashboard.ts`, `plugin-directory-design.md`.

**Pre-existing changes (preserved, not touched):** `packages/backend/src/index.ts`, `examples/org.yaml`,
`package.json`, `yarn.lock`, `plugins/authorization-registry-backend/{index,plugin}.ts`,
`plugins/validation-manager-backend/src/router.ts`, `templates/aas-data-product/mkdocs.yml`, and several
untracked report/AGENTS markdown files.

Nothing was committed or pushed.

---

## 10. Final verdict

**PASSED_WITH_GAPS**

- The apparent "every route falls through to the marketing landing" was the **sign-in gate** (by design),
  now documented and proven — **not** a plugin routing defect.
- **Both confirmed path mismatches were fixed** (`/urs-composer`, `/plugin-directory`); each now renders
  its intended UI.
- All other registered plugin routes render their intended UI after authentication.
- Unknown URLs correctly render the standard **404 Not Found** (never the marketing landing).
- Remaining gap: RBAC admin UI at `/admin/rbac` is a **pre-existing, intentional** limitation (legacy
  plugin mounted at `/rbac` + RBAC backend disabled to preserve `PlatformPermissionPolicy`).

