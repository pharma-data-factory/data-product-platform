# Hard-coded Domain Inventory

Produced by the Phase 0 audit (slice P0-S3) on 2026-09-16. This is the input
to **Phase 3 — Product Studio**, whose objective is:

> Replace hard-coded composition logic with generic Artifact/Golden Path
> resolution.

The strategy constraint this inventory serves:

> Core stays small; SAP, MES, LIMS, MQTT, OPC UA, AAS, Snowflake, Databricks,
> OEE and similar capabilities belong in versioned Artifacts.
> Do not hard-code OEE or any other Golden Path into Core composition logic.

Each entry records what is hard-coded, who depends on it, and what has to be
true before it can be removed. Nothing here should be deleted before parity is
proven — see the migration architecture in `TARGET_ARCHITECTURE.md`.

## Summary

| ID | Item | Location | Severity |
| --- | --- | --- | --- |
| GP-1 | Composition component lists duplicated from manifests | `platform-component-library.ts` | Medium — now guarded |
| GP-2 | `officialGoldenPathForDraft/Selection` return the literal `'oee-data-product'` | `composer.ts` | **High** |
| GP-3 | `composerPresets()` ships OEE and Equipment Use Log as built-ins | `composer.ts` | **High** |
| GP-4 | `oeeBuiltWithSummary()` — an OEE-specific Core API | `platform-component-library.ts` | **High** |
| GP-5 | `WAVE1_COMPONENT_TITLES` — display names for a fixed component set | `platform-component-library.ts` | Low |
| GP-6 | `EQUIPMENT_USE_LOG_COMPOSITION_YAML` — a manifest embedded as a string | `platform-component-library.ts` | Medium |
| GP-7 | `RUNTIME_PACKAGE_*` / `CATALOG_ONLY_COMPONENT_NAMES` — fixed component registry | `platform-component-library.ts` | Medium |

**Not** hard-coded, and worth preserving as the precedent to follow:
`OFFICIAL_GOLDEN_PATHS` in `releases.ts` is *derived* from
`golden-path-releases.json` by filtering on `certification.status`. That is
already the manifest-driven, data-not-code shape Phase 3 needs everywhere
else. Golden Paths can be added to the release catalogue without touching
TypeScript.

---

## GP-1 — Composition component lists duplicated from manifests

`packages/platform-common/src/platform-component-library.ts` holds five
constants that restate, in TypeScript, the component list of a YAML manifest
in `catalog/compositions/`:

| Constant | Manifest |
| --- | --- |
| `OEE_DIRECT_COMPOSITION_REFS` | `oee-data-product-direct.yaml` |
| `MACHINE_METRICS_COMPOSITION_REFS` | `machine-metrics-reference.yaml` |
| `MACHINE_STATE_COMPOSITION_REFS` | `machine-state-consumer.yaml` |
| `MQTT_TEMPERATURE_CONCEPTUAL_REFS` | `mqtt-temperature-conceptual.yaml` |
| `REST_EQUIPMENT_CONCEPTUAL_REFS` | `rest-equipment-conceptual.yaml` |
| `EQUIPMENT_USE_LOG_REQUIRED_REFS` | `equipment-use-log.yaml` |

The constant even cites its own source in a comment
(`/** ... Source: catalog/compositions/oee-data-product-direct.yaml */`), so
the duplication is known; nothing enforced it. The manifests are already
parsed at runtime by `parseCompositionManifest` / `validateComposition`, so
the parser needed to remove the duplication exists.

**State:** the six lists agree with their manifests as of 2026-09-16, and
`packages/backend/src/compositionManifestParity.test.ts` now fails if they
diverge. Verified by mutation: altering a manifest fails the test.

**Removal condition:** the Composer, Marketplace and Developer Hub read
compositions through a resolver over the manifests instead of importing the
constants. The parity test is then deleted along with the constants.

## GP-2 — Golden Path identity is a string literal in Core

`packages/platform-common/src/composer.ts`:

```ts
export function officialGoldenPathForSelection(
  selectedNames: readonly string[],
): 'oee-data-product' | undefined
```

The **return type itself** is the literal `'oee-data-product'`. The function
set-compares the user's selection against `OEE_DIRECT_COMPOSITION_REFS` and
returns that one identifier. `officialGoldenPathForDraft` wraps it and adds
two more special cases by string matching: a slug of `equipment-use-log` and a
description containing `design example` are excluded.

This is the sharpest violation in the inventory: a second Golden Path cannot
be recognised without editing Core and widening a union type, and the
exclusion rules are keyed on human-readable text.

**Consumers:** `packages/app/src/modules/composer/ComposePage.tsx`.

**Removal condition:** recognition resolves a selection against all registered
Golden Path manifests and returns whichever one matches, or none. The
`design-example` / `equipment-use-log` exclusions become a declared property
of the manifest (for example a `kind` or `officialGoldenPath: false` field),
not a text match.

## GP-3 — `composerPresets()` ships domain presets as built-ins

`composerPresets()` returns three hard-coded presets: a generic
`api-data-product` baseline, `oee-reference` ("Reference composition derived
from OEE Mode A"), and `equipment-use-log` ("DESIGN EXAMPLE ONLY"). The
`ComposerPreset.kind` union — `'baseline' | 'oee-reference' | 'design-example'`
— names a specific domain product in a Core type.

**Consumers:** `packages/app/src/modules/composer/ComposePage.tsx`.

**Removal condition:** presets are resolved from registered Artifacts /
Golden Path manifests; `kind` becomes a neutral classification.

## GP-4 — `oeeBuiltWithSummary()` is an OEE-specific Core API

`oeeBuiltWithSummary()` maps `OEE_DIRECT_COMPOSITION_REFS` into a display
summary with a hard-coded `productLabel: 'OEE Golden Path'`, alongside the
`OeeBuiltWithItem` / `OeeBuiltWithSummary` types. A domain product has a
named function in the shared platform package.

**Consumers:** `plugins/marketplace/src/components/MarketplaceDetailPage.tsx`
(via `OeeBuiltWith.tsx`).

**Removal condition:** one `builtWithSummary(compositionName)` that works for
any composition; the Marketplace passes the Artifact it is rendering.

## GP-5 — `WAVE1_COMPONENT_TITLES`

A `Record<string, string>` of display titles for the six Wave 1 components.
Presentation metadata that belongs on the component/Artifact manifest.
Low severity, but it means a new component renders with no title until Core is
edited. **Consumers:** `DeveloperHubPage.tsx`.

## GP-6 — `EQUIPMENT_USE_LOG_COMPOSITION_YAML`

A full composition manifest embedded in Core as a template literal, parsed
back by `parseEquipmentUseLogExample()`. The equivalent file already exists at
`catalog/compositions/equipment-use-log.yaml`. A string copy of a file that is
in the repository cannot be kept in step by review alone.

**Removal condition:** read the manifest, or serve it as an Artifact.

## GP-7 — Fixed Platform Component registry

`RUNTIME_PACKAGE_COMPONENT_NAMES`, `RUNTIME_PACKAGE_SOURCE_PATHS` and
`CATALOG_ONLY_COMPONENT_NAMES` enumerate which components exist and where
their source lives. `hasRuntimePackage()` and `runtimeAvailabilityFor()` answer
from those lists. This is the Artifact Registry's job.

**Removal condition:** Phase 2 delivers the persistent Artifact Registry, and
runtime availability becomes a property of an `ArtifactVersion`.

---

## Sequencing note

GP-7 depends on Phase 2 (Artifact Registry). GP-1 through GP-6 are Phase 3 and
share one prerequisite: **a resolver that answers "which components does
composition X consist of?" from manifests rather than constants.** Building
that resolver first turns GP-1, GP-2, GP-3, GP-4 and GP-6 into deletions
rather than rewrites.

GP-1 is guarded, so the duplication can no longer drift while the rest is
migrated.
