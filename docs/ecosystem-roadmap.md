# Nexora — Extension Ecosystem Roadmap

This document describes the **partner / extension ecosystem** theme. It
complements the authoritative product plan in [ROADMAP.md](../ROADMAP.md)
and does not replace it. Status labels follow the same convention:
`COMPLETE`, `IN PROGRESS`, `PLANNED`, `FUTURE`. Planned and future
capabilities are **not available** in the running product.

## Positioning

- **Nexora is a commercial platform kernel on Backstage.** Backstage is the
  open-source framework (Apache-2.0); Nexora / Nexora code is
  proprietary.
- The ecosystem model is a **curated partner / extension marketplace**
  (Salesforce AppExchange, ServiceNow Store, and Backstage's own plugin
  ecosystem) — **not** an open-source community model (Home Assistant).
- One-line positioning: *"commercial platform + open, certified ecosystem"*.

## Existing building blocks

| Building block | Location | Role in the ecosystem |
| --- | --- | --- |
| Plugin Directory (UI + backend) | `plugins/plugin-directory/`, `plugins/plugin-directory-backend/` | Today a governance **inventory** ("not a Plugin Store"); becomes the Extension Catalog. |
| Extension descriptor schema | `plugins/plugin-directory-backend/src/types.ts` | `PluginType`, `PluginLifecycle`, `PluginValidationStatus`, `PluginSource`, `permissions`, `owner`, `dependencies` — the seed of a certification model. |
| Manifest format | `plugins/plugin-directory/plugin.yaml` | Declarative `plugin.yaml` per extension; extend with `validation` + `owner` for certification. |
| Entitlements / monetization | `plugins/entitlements-backend/src/awsMarketplace.ts` | AWS Marketplace entitlement seam (`LicenseArn`, `GetEntitlements`, fail-closed) — license-gating for partner extensions already exists conceptually. |
| Data-product marketplace | `plugins/marketplace/` | Mode-A composition marketplace; reuse its card/detail patterns. |
| Developer Hub | `packages/app/src/modules/developer-hub/` | The "build on Nexora" surface for developers and partners. |
| Golden Paths | `templates/` | Templates are the "app store" for Data Products and integrations. |
| Guardrails | `AGENTS.md` | `extension-first`, `adopt over build` — keeps extensions outside the kernel. |

## Phase 0 — Legal & Governance

Status: **IN PROGRESS**

Prerequisite that gates commercial distribution and partner onboarding.

- Counsel sign-off of `NOTICE`, `licenses/Apache-2.0.txt`,
  `THIRD_PARTY_NOTICES.md` → `LEGAL_DISTRIBUTION_STATUS=APPROVED`.
- Freeze the **extension contract**: which Backstage extension points are
  officially supported (frontend/backend plugin, Scaffolder action, Catalog
  processor/provider, template, permission object).
- Define certification tiers. Recommended default, mapping to the existing
  `PluginValidationStatus` enum:

  | Tier | Meaning | Maps to |
  | --- | --- | --- |
  | Community | Best-effort, no guarantee | `NOT_VALIDATED` |
  | Certified | Reviewed + tested by Nexora | `VALIDATION_IN_PROGRESS` → `VALIDATED` |
  | Validated | GxP-capable, evidence-backed | `VALIDATED` + `validationReference` |

Success criterion: contract + tiers documented; nothing changes in the kernel.

## Phase 1 — Internal Extension Store (dogfooding)

Status: **PLANNED** (next)

Evolve the Plugin Directory from an admin inventory into a curated
**Extension Catalog** and list all internal plugins/templates first.

Actionable steps are listed at the end of this document.

Success criterion: every internal extension is discoverable in the store with
lifecycle, validation status, owner, and permissions.

## Phase 2 — Curated Partner Extensions

Status: **PLANNED**

- Partner program with certification tiers from Phase 0; submission goes
  through review gates (no open commit access to the kernel).
- Extensions ship via supported extension points only (never kernel changes —
  guardrail in `AGENTS.md`).
- **Entitlement gating**: partner extensions tied to licenses via the
  existing AWS Marketplace seam (`entitlements-backend`).

Success criterion: 1–2 real integrator/partner extensions certified in the
store.

## Phase 3 — Ecosystem & Monetization

Status: **FUTURE**

- Marketplace as a distribution channel (linked to
  [commercial-model.md](commercial-model.md) and the Template Edition).
- Golden Paths marketed as the "app store" for Data Products/integrations.
- Partner SDK + documentation + sandbox; Developer Hub becomes the entry point.

Success criterion: an external developer can build, submit, and get an
extension certified without platform-team intervention.

## Marketing layer (parallel)

- Keep the corrected hero wording ("commercial platform … built on the
  open-source Backstage framework") consistent across all landing pages.
- Add a "Build on Nexora" section with the three paths: **adopt** (community
  Backstage plugins), **build** (SDK), **partner** (program).

## Decisions needed

| Decision | Recommended default | Rationale |
| --- | --- | --- |
| Certification tiers | Community / Certified / Validated (3) | Maps directly to `PluginValidationStatus`. |
| Sales channel | AWS Marketplace first, direct later | Seam already exists in `entitlements-backend`. |
| Partner target | Integrators/SI first, customer dev teams after | SIs build the pharma integrations that scale the platform. |

## Risks / tradeoffs

- **GxP**: third-party extensions are SOUP; the `Validated` tier is expensive.
  Mitigation: only the kernel is validated; extensions carry a declared
  validation status.
- **Governance cost**: a curated store needs review/support capacity and grows
  slower than an open community.
- **Credibility**: "open" is only believable if the extension contract is
  public and stable.

## Phase 1 — actionable steps (sketch)

1. **Reposition the store.** In
   `plugins/plugin-directory/src/components/PluginDirectoryPage.tsx` change the
   `principle` and `copy` from "Governed plugin inventory, not a Plugin Store"
   to a curated extension catalog; update
   `plugins/plugin-directory/plugin.yaml` description accordingly.
2. **Surface certification tier.** Add a tier chip (Community / Certified /
   Validated) derived from `validationStatus` next to `StatusChip`, and a tier
   filter.
3. **Enrich the detail page.** In
   `plugins/plugin-directory/src/components/PluginDetailPage.tsx` show
   `validationReference`, `owner`, `permissions`, and `dependencies`.
4. **Seed with internal content.** Already automatic via
   `discoverPlugins()` in `plugins/plugin-directory-backend/src/inventory.ts`;
   verify all internal plugins render with metadata.
5. **Add a "Build on Nexora" section** to
   `packages/app/src/modules/developer-hub/DeveloperHubPage.tsx` linking to the
   store and to the SDK docs.
6. **Prepare for partners.** Add a `community` / `partner` value to
   `PluginSource` in `plugins/plugin-directory-backend/src/types.ts` so
   non-workspace extensions can be distinguished in Phase 2.
