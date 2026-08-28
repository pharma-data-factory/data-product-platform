# Plugin Directory v0.1 — Design

## Purpose

Admin governance inventory of plugins known to the Nexora control plane.
**Not** a Plugin Store / Marketplace for installing remote plugins.

Route: `/admin/plugins`  
Packages: `@internal/plugin-directory`, `@internal/plugin-directory-backend`  
Plugin ID: `plugin-directory`

Distinguish from:

| Capability | Role |
|------------|------|
| Plugin Directory | Inventory of installed / known control-plane plugins |
| Marketplace | Data Product Golden Path catalog (commercial) |
| Future Plugin Store | Discover / request / approve install of additional plugins |

---

## Architecture

```text
plugins/plugin-directory/          Frontend (Admin UI)
plugins/plugin-directory-backend/  Inventory service + REST API
packages/platform-common           Permissions + helpers
```

Inventory is **derived** at request time from objective sources, then
**enriched** by optional per-plugin `plugin.yaml` manifests.

### Inventory sources

1. `plugins/*/package.json` (`backstage.role`, `pluginId`, `pluginPackages`, version)
2. Optional `plugin.yaml` beside the primary package (frontend or backend)
3. `packages/app/package.json` + `packages/app/src/App.tsx` → frontend loaded
4. `packages/backend/package.json` + `packages/backend/src/index.ts` → backend loaded
5. `backstage.json` → Backstage Core synthetic entry (SOUP grouping)
6. Conservative validation defaults + manifest `validation.status`

### Not treated as directory plugins

- Transitive npm dependencies
- `packages/data-product-sdk` and other non-plugin libs (except noted)
- Generated Data Product services

`@internal/platform-common` is a **common-library**, not listed as a plugin.
`@internal/plugin-nexora-common` (`web-library`) **is** listed (shared FE plugin surface).

---

## Metadata model

```ts
type PluginType =
  | 'PLATFORM' | 'DOMAIN' | 'INDUSTRIAL'
  | 'VALIDATION' | 'INTEGRATION' | 'EXPERIMENTAL';

type PluginLifecycle =
  | 'ENABLED' | 'DISABLED' | 'DEVELOPMENT' | 'DEPRECATED';

type PluginValidationStatus =
  | 'NOT_VALIDATED' | 'VALIDATION_IN_PROGRESS'
  | 'VALIDATED' | 'NOT_APPLICABLE' | 'NOT_ESTABLISHED';

interface NexoraPluginDescriptor {
  id: string;
  name: string;
  description?: string;
  frontendPackage?: string;
  backendPackage?: string;
  version?: string;
  type: PluginType;
  lifecycle: PluginLifecycle;
  frontendRoute?: string;
  backendRoute?: string;
  permissions?: string[];
  owner?: string;
  source: 'WORKSPACE' | 'BACKSTAGE_CORE' | 'CONFIG' | 'MANIFEST';
  validationStatus: PluginValidationStatus;
  validationReference?: string;
  dependencies?: string[];
  runtimeLoaded?: boolean;
  frontendLoaded?: boolean;
  backendLoaded?: boolean;
  experimental?: boolean;
}
```

Lifecycle in v0.1 is **inventory/config state only** — no runtime hot-disable.

---

## API contract

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/plugin-directory/health` | unauthenticated |
| GET | `/api/plugin-directory/plugins` | `pluginDirectory.read` |
| GET | `/api/plugin-directory/plugins/:id` | `pluginDirectory.read` |
| GET | `/api/plugin-directory/summary` | `pluginDirectory.read` |

Query filters on list: `type`, `lifecycle`, `validationStatus`, `q` (search).

No install/mutation APIs in v0.1.

---

## Manifest (`plugin.yaml`)

Optional, complements discovery. Example location:
`plugins/validation-expert/plugin.yaml`

Malformed YAML is ignored with a log warning; package.json discovery still applies.

---

## Permission model

| Permission | Roles |
|------------|-------|
| `pluginDirectory.read` | DEVELOPER and above |
| `pluginDirectory.admin` | PLATFORM_ADMIN |

UI Admin nav entry: Platform Admin (governance).  
Developers with read may open the route if linked; no install capability.

Validation Reviewer (DATA_PRODUCT_OWNER+) inherits read via role sets and can see validation fields.

---

## Validation integration

- Directory is **not** authoritative for product validation status.
- Status comes from `plugin.yaml` `validation.status` or conservative default `NOT_ESTABLISHED`.
- Validation Expert plugin: **`NOT_VALIDATED`**, reference `validation-expert/VALIDATION-IMPACT.md`.
- Never infer `VALIDATED` from build/tests/certification chips.
- Detail page links to Validation Expert workbench and optional markdown reference path (docs), not auto-approval.

---

## Admin UI

| Route | Page |
|-------|------|
| `/admin/plugins` | Summary cards + filterable table |
| `/admin/plugins/:pluginId` | Detail (identity, packages, runtime, permissions, deps, validation) |

Nav (Admin group, Platform Admin):

```text
Admin
├── Entitlements
├── Marketplace Integration
├── Plugin Directory
├── Validation (→ Validation Expert)
└── Platform Settings
```

Visual language: Nexora enterprise (compact cards, table, status chips). No app-store UX.

---

## Initial classification (evidence-based, overridable by manifest)

| Plugin ID | Type | Lifecycle | Validation |
|-----------|------|-----------|------------|
| validation-expert | VALIDATION | ENABLED | NOT_VALIDATED |
| data-products | DOMAIN | ENABLED | NOT_ESTABLISHED |
| marketplace | PLATFORM | ENABLED | NOT_ESTABLISHED |
| entitlements | PLATFORM | ENABLED | NOT_ESTABLISHED |
| nexora-assets | DOMAIN | ENABLED | NOT_ESTABLISHED |
| nexora-contracts | DOMAIN | ENABLED | NOT_ESTABLISHED |
| nexora-quality | PLATFORM | ENABLED | NOT_ESTABLISHED |
| nexora-common | PLATFORM | ENABLED | NOT_APPLICABLE |
| nexora-industrial | INDUSTRIAL | DEVELOPMENT | NOT_ESTABLISHED |
| plugin-directory | PLATFORM | ENABLED | NOT_VALIDATED |
| backstage-core | PLATFORM | ENABLED | NOT_APPLICABLE |

Ambiguous cases remain `NOT_ESTABLISHED` until a manifest says otherwise.

---

## Future Plugin Store extension points

```text
Plugin Directory (inventory)
    → Approved Plugin Catalog
    → Install Request
    → Security Review
    → Validation Impact Assessment
    → Platform Admin Approval
    → Deployment
```

v0.1 stops at inventory. Store workflow, remote download, billing, and e-sign are out of scope.

---

## Testing

- Backend: discovery, enabled vs present, detail, validation mapping, malformed manifest, permissions helpers
- Frontend: directory render, filters, detail, Validation Expert entry, NOT_VALIDATED
- Builds: plugin FE/BE, TypeScript via package build

---

## Out of scope (v0.1)

Remote install, npm UI install, runtime code loading, public submission, ratings, billing, auto validation approval, e-sign, Part 11 claims.
