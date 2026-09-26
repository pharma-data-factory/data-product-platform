# Architecture Guardrails

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING
Status: AUTHORITATIVE for guardrails and their documented deviations

`AGENTS.md` states the rules. This document states **how they are enforced,
where we currently deviate, and what it would take to stop deviating.**
Where the two disagree, `AGENTS.md` wins.

Supersedes `docs/archive/PLATFORM_GUARDRAILS_REPORT.md`.

---

## 1. Mechanical enforcement

`scripts/verify-platform-guardrails.mjs`, run as `yarn guard:platform` and as
the first step of CI. Node standard library only; exit 0 = no hard violation.

| Check                                     | What it refuses                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `BACKSTAGE_CORE_PATCHING`                 | patch-package / yarn patches / postinstall mutation against `@backstage/*` |
| `PRIVATE_BACKSTAGE_IMPORTS`               | `@backstage/**/src` and `@backstage/**/dist` imports in owned source       |
| `PACKAGE_MANAGER_CONSISTENCY`             | `package-lock.json`, `pnpm-lock.yaml`, foreign lockfiles                   |
| `UNSAFE_DEPENDENCY_RANGES`                | `latest` and `*` outside a documented allowlist                            |
| `DEPENDENCY_BASELINE`                     | mixed Material UI generations                                              |
| `RESOLUTIONS`                             | undocumented `HIGH_RISK` root resolutions                                  |
| `NODE_MODULES_MUTATION`                   | scripts that write into `node_modules`                                     |
| `APP_COMPOSITION` / `BACKEND_COMPOSITION` | domain logic leaking into the wiring layers (size-bounded)                 |
| `ALPHA_API_USAGE`                         | _(warning)_ `/alpha` imports — recorded as upgrade risk                    |
| `CROSS_PLUGIN_BOUNDARY`                   | _(warning)_ importing another workspace's private source                   |

**Measured 2026-09-26 at `d68308f`:** `PASS 9 · WARNING 9 · FAIL 0 ·
RESULT: GUARDRAILS_OK`. Composition layers: `packages/app/src` 155 files /
30,313 lines, `packages/backend/src` 46 files / 6,453 lines — both inside
their limits.

A guardrail that is not in this script is an intention, not a guardrail. When
a new rule matters, add the check.

---

## 2. Documented deviations

Each of these is a knowing departure from `AGENTS.md` or from a Backstage
default. They are listed so they stay visible and so nobody "fixes" one
without reading why it exists.

### D-1 — Community RBAC is disabled; a proprietary permission policy is authority

**Rule deviated from:** `AGENTS.md` §RBAC — _"Do not build another RBAC
engine. Use Catalog Users / Groups → Community RBAC → Backstage Permission
Framework."_

**What we do instead:** `PlatformPermissionPolicy`
(`packages/backend/src/permission/policy.ts`) is the single permission policy.
`@backstage-community/plugin-rbac-backend` is installed but its registration
is commented out in `packages/backend/src/index.ts`.

**Why:** Both register a policy through the same `/alpha`
`policyExtensionPoint`, and a second `setPolicy()` throws _"Policy already
set."_ Backstage 1.53 exposes no stable chaining API.

**Lifting condition:** a stable, non-alpha policy-chaining extension point in
a supported Backstage release. Re-evaluate at every Backstage upgrade gate.

**Risk while it stands:** the RBAC matrix is ours to maintain. See D-4.

**Full history:** `NXD-060` in
`docs/nexora-transformation/DECISIONS.md` — the original adoption decision
(archived `ADR-004`) and its reversal. Both RBAC packages remain declared and
inert; removing them is a dependency change and needs its own approval.

### D-2 — `/alpha` APIs in five places

`@backstage/plugin-catalog/alpha`, `plugin-api-docs/alpha`,
`plugin-scaffolder-react/alpha`, `plugin-search-react/alpha`,
`plugin-permission-node/alpha`.

**Why:** the new frontend and backend systems expose the needed extension
points only under `/alpha` in 1.53.

**Lifting condition:** the corresponding stable exports. These are the first
things to check on a Backstage upgrade — they are the most likely to break.

### D-3 — Two pre-existing root resolutions

`@backstage/plugin-permission-react@^0.5.2` (while the backend declares
`^0.7.2`) and `@material-ui/lab@^4.0.0-alpha.61`.

**Lifting condition:** a dedicated dependency-governance gate, per
`AGENTS.md`. Not to be touched inside a feature slice.

### D-4 — Hand-maintained permission surfaces

Three registries must be kept in sync by hand:
`packages/platform-common/src/permissions.ts` (role → permission-name sets),
`packages/platform-common/src/permissions/{urs,validation}.ts`
(`createPermission` objects), and `permissions-inventory.md`.

`decidePermission`'s `isPrivilegedRead()` is a **deny-list of 19 permission
names**. A new privileged read permission that is not added to it is granted
to every VIEWER by the read fallback.

**Intended direction:** one registry; `isPrivilegedRead` replaced by an
explicit allow-list so that forgetting an entry fails closed.

### D-5 — One unauthenticated-by-design write path

`authorizeService()` (`plugins/composer-backend/src/router.ts`) accepts a
service principal for CI release provenance and deliberately skips
permission-framework authorization. Write-once and narrow.

**Condition:** any new service-principal route must be write-once, idempotent,
and documented here.

---

## 3. Plugin boundaries

Plugins own their persistence. Nexora owns **39 tables across five plugins**:
`urs-composer-backend` (15), `composer-backend` (12),
`validation-expert-backend` (6), `artifact-registry-backend` (3),
`users-backend` (3). `aas-backend`, `entitlements-backend`,
`model-company-backend` and `plugin-directory-backend` hold none — they are
in-memory or derived from configuration.

**Cross-plugin access is HTTP, never SQL.** The established pattern:

- `composer-backend/src/urs-baseline-resolver.ts` → URS Composer
- `composer-backend/src/validation-decision-resolver.ts` → Validation Expert
- `composer-backend/src/policy-resolver-client.ts` → Artifact Registry
- `marketplace/src/artifactRegistryApi.ts` → Artifact Registry
- `data-products/src/components/useGoverningProduct.ts` → Composer

Where a product must not change when the source changes, copy rather than
join — `product_requirements` snapshots an approved URS baseline, including
its `content_hash`, so a released product keeps the wording it was built
against.

---

## 4. Backstage upgrades

Backstage is the kernel and is upgraded deliberately, never per package, never
inside a feature slice. Current baseline: **1.53.0** (`backstage.json`).

An upgrade gate must: review all `@backstage/*` changes together; re-check
every `/alpha` usage in D-2; re-run `guard:platform`; and re-evaluate D-1.
