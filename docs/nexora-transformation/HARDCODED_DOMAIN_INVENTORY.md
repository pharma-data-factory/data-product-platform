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
| ~~GP-1~~ | ~~Composition component lists duplicated from manifests~~ | — | **REMOVED 2026-09-19 (NXD-029)** |
| ~~GP-2~~ | ~~`officialGoldenPathForDraft/Selection` return the literal `'oee-data-product'`~~ | — | **REMOVED 2026-09-21 (NXD-031)** |
| ~~GP-3~~ | ~~`composerPresets()` ships OEE and Equipment Use Log as built-ins~~ | — | **REMOVED 2026-09-21 (NXD-031)** |
| ~~GP-4~~ | ~~`oeeBuiltWithSummary()` — an OEE-specific Core API~~ | — | **REMOVED 2026-09-19 (NXD-029)** |
| GP-5 | `WAVE1_COMPONENT_TITLES` — display names for a fixed component set | `platform-component-library.ts` | Low |
| GP-6 | `EQUIPMENT_USE_LOG_COMPOSITION_YAML` — a manifest embedded as a string | `platform-component-library.ts` | Medium |
| GP-7 | `RUNTIME_PACKAGE_*` / `CATALOG_ONLY_COMPONENT_NAMES` — fixed component registry | `platform-component-library.ts` | Medium |
| GP-8 | Industrial semantics as a Core vocabulary — equipment, site, area, line, OEE and equipment-state API annotations | `nexora-industrial.ts` | **High** |

**Not** hard-coded, and worth preserving as the precedent to follow:
`OFFICIAL_GOLDEN_PATHS` in `releases.ts` is *derived* from
`golden-path-releases.json` by filtering on `certification.status`. That is
already the manifest-driven, data-not-code shape Phase 3 needs everywhere
else. Golden Paths can be added to the release catalogue without touching
TypeScript.

---

## ~~GP-1~~ — Composition component lists duplicated from manifests — **REMOVED**

`packages/platform-common/src/platform-component-library.ts` holds five
constants that restate, in TypeScript, the component list of a manifest that
now lives in `catalog/artifacts/nexora/` as a `GOLDEN_PATH` Artifact
(NXD-027; the manifests were under `catalog/compositions/` when this entry was
written):

| Constant | Manifest |
| --- | --- |
| `OEE_DIRECT_COMPOSITION_REFS` | `oee-data-product-direct.yaml` |
| `MACHINE_METRICS_COMPOSITION_REFS` | `machine-metrics-reference.yaml` |
| `MACHINE_STATE_COMPOSITION_REFS` | `machine-state-consumer.yaml` |
| `MQTT_TEMPERATURE_CONCEPTUAL_REFS` | `mqtt-temperature-conceptual.yaml` |
| `REST_EQUIPMENT_CONCEPTUAL_REFS` | `rest-equipment-conceptual.yaml` |
| `EQUIPMENT_USE_LOG_REQUIRED_REFS` | `equipment-use-log.yaml` |

The constant even cites its own source in a comment, so the duplication is
known; nothing enforced it.

**Correction (2026-09-19, P3-S1a).** This entry described the constants as
copies of the manifests. The audit before implementing found the opposite:
**nothing read those manifests at runtime.** The only mention of the directory
outside tests was a comment. The constants were the truth and the manifests
were documentation. `parseCompositionManifest` existed but was called only by
tests and by the embedded string in GP-6. The work was therefore not to stop
copying, but to give the manifests a runtime.

**Closed 2026-09-19 (P3-S1b, NXD-029).** Compositions are `GOLDEN_PATH`
Artifacts in `catalog/artifacts/nexora/`, loaded by the registry at startup and
served over its API. All six constants, the `LIBRARY_COMPOSITION_USAGE` table
and 97 lines with them are deleted; `compositionManifestParity.test.ts` is
deleted too, because there is nothing left to hold in step. The five consumers
— `ComposePage`, `PlatformComponentsPage`, `PlatformComponentDetailPage`,
`MarketplaceDetailPage` and `DeveloperHubPage` — take their lists from
`useGoldenPathCompositions`, and the Core functions take them as parameters.

Two things the manifests had to learn along the way: `spec.components[].optional`
(so `EQUIPMENT_USE_LOG_OPTIONAL_REFS` had somewhere to live) and `spec.usage`
(so the consumer label and kind did). Verified live against a fresh registry:
`20 registered, 0 already present, 1 publishers created, 0 failed`.

One visible change: "used by" labels are ordered by composition name rather
than by the order the old table happened to be written in.

## ~~GP-2~~ — Golden Path identity is a string literal in Core — **REMOVED**

**Closed 2026-09-21 (P3-S2, NXD-031).** `officialGoldenPathForSelection` and
`officialGoldenPathForDraft` now accept `ReadonlyMap<string, readonly string[]>`
(composition name → required refs of all `runtime` GOLDEN_PATH manifests) and
return `string | undefined` — the composition name, not a domain literal.
Text-matching exclusions (equipment-use-log slug, "design example" text) are
gone; the `design` / `conceptual` manifests are simply not in the map.

A second Golden Path can be recognised without touching Core: add a manifest
with `spec.usage.kind: runtime`, and `goldenPathCompositionsFromManifests` puts
it in `GoldenPathCompositions.official` where the Composer finds it.

The `builtFromIndex` reverse lookup (composition name → DATA_PRODUCT name via
`spec.builtFrom`) lets the Composer still navigate to the DATA_PRODUCT's
Marketplace page and scaffold its template, rather than the composition
blueprint.

## ~~GP-3~~ — `composerPresets()` ships domain presets as built-ins — **REMOVED**

**Closed 2026-09-21 (P3-S2, NXD-031).** `composerPresets()` now accepts
`ReadonlyMap<string, GoldenPathComposition>` for official (`runtime`) and
example (`design`) compositions and derives one preset per entry. The
`ComposerPreset.kind` union is now neutral: `'baseline' | 'official' | 'example'`
— no domain product name in Core. The three generic baseline presets remain
static (they are platform knowledge, not domain knowledge).

## ~~GP-4~~ — `oeeBuiltWithSummary()` is an OEE-specific Core API — **REMOVED**

`oeeBuiltWithSummary()` maps `OEE_DIRECT_COMPOSITION_REFS` into a display
summary with a hard-coded `productLabel: 'OEE Golden Path'`, alongside the
`OeeBuiltWithItem` / `OeeBuiltWithSummary` types. A domain product has a
named function in the shared platform package.

**Consumers:** `plugins/marketplace/src/components/MarketplaceDetailPage.tsx`
(via `OeeBuiltWith.tsx`).

**Closed 2026-09-19 (P3-S1b, NXD-029).** `builtWithSummary(catalog,
componentRefs, productLabel)` works for any composition, and the Marketplace
passes the one its manifest names through the new `spec.builtFrom` field —
which also removed the `item.id === 'oee-data-product'` literal that gated the
panel. The presentational component in the Marketplace plugin is still called
`OeeBuiltWith`; that is a plugin-local name, not the Core API this entry
recorded.

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

## GP-8 — Industrial semantics are a Core vocabulary

*Added 2026-09-17 by the status audit. Missed by the P0-S3 sweep, which looked
for hard-coded Golden Paths and composition lists and therefore did not catch
a domain vocabulary that names no Golden Path at all.*

`packages/platform-common/src/nexora-industrial.ts` is 589 lines and 62
exports of manufacturing domain: `NEXORA_ANNOTATIONS` (equipment-id, site,
area, line, equipment-type, manufacturer, model, plus `oee-api` and
`equipment-state-api`), `EQUIPMENT_COMPONENT_TYPE`, `EQUIPMENT_STATES`,
`CONNECTIVITY_KINDS`, `EquipmentStateView`, `DataProductHealth` and the rest.

This is a larger domain surface than GP-1 through GP-7 combined, and it is
different in kind. Those are *instances* — OEE, Equipment Use Log — hard-coded
into generic machinery. This is the *vocabulary itself*: Core states what a
plant is made of. Under the strategy that belongs to a POLICY_PACK or a
semantic Artifact, not to the kernel-adjacent domain package. The strategy
names the same concepts as the semantic layer ("Plant, Area, Line, Work
Center, Equipment, Material, Batch, Order, Operation, State, Downtime") —
which is Phase 4/6 work, not something Core should already have decided.

Consumers: `documentation.ts`, `plugins/nexora-quality`,
`plugins/nexora-backend` (plugin and fixtures), `plugins/nexora-common/api.ts`,
`plugins/plugin-directory-backend/inventory.ts`.

**Severity is High** for scope, not for urgency. Nothing is blocked by it
today, and it is not Phase 2 or Phase 3 work.

**Removal condition:** the semantic layer exists as a first-class concept
(Phase 4/6) and industrial semantics ship as a versioned Artifact. Until then
the honest statement is that "Core stays small and generic" is not currently
true, and this file is the largest single reason.

---

## Sequencing note

GP-7 depends on Phase 2 (Artifact Registry). GP-1 through GP-6 are Phase 3 and
share one prerequisite: **a resolver that answers "which components does
composition X consist of?" from manifests rather than constants.** Building
that resolver first turns GP-1, GP-2, GP-3, GP-4 and GP-6 into deletions
rather than rewrites.

GP-1 is guarded, so the duplication can no longer drift while the rest is
migrated.

GP-8 sits outside that sequence. It is neither a composition list nor a Golden
Path, so the Phase 3 resolver does nothing for it; it waits on the semantic
layer instead.
