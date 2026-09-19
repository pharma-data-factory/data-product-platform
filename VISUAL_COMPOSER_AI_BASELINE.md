# VISUAL COMPOSER + AI ENGINEERING COPILOT — BASELINE (Phase 0)

**Status:** `VISUAL_COMPOSER_EXTENSION_ARCHITECTURE_READY`
**Mode:** Read-only repository discovery. No product code changed. No commit, no push.
**Prime Directive:** Backstage = kernel. This is an extension, not a rebuild.

---

## Executive summary

A large share of the proposed Composer already exists as a **deterministic, list-based
Composer** in Nexora-owned packages. The correct approach is to **extend it**, not to build a
parallel visual composer or a second composition model.

Critical finding: the concept document proposes `apiVersion: nexora.io/v1alpha1` /
`kind: DataProductComposition`. The repository **already has** `apiVersion: dataprod.platform/v1alpha1`
/ `kind: GoldenPathComposition` (a validated, version-controlled model). Introducing a second kind
would duplicate the composition model. **Reuse and extend `GoldenPathComposition`.**

---

## 1. What Composer implementation already exists?

| Layer | File | What it does |
|---|---|---|
| Model | `packages/platform-common/src/composition.ts` | `GoldenPathComposition` (kind/apiVersion), `parseCompositionManifest` (YAML+JSON), `validateComposition` (semantic checks), `CompositionIssueCode` |
| Composer logic | `packages/platform-common/src/composer.ts` | `ComposerDraft`, `ComposerPreset` (5 presets), `composerDraftToManifest`, `serializeCompositionYaml` (deterministic), `validateComposerDraft` (UX checklist), `officialGoldenPathForSelection`/`Draft` (**Golden-Path-Resolver**), `composerArchitectureFromSelection`, `groupedLibraryComponents` |
| Frontend | `packages/app/src/modules/composer/` (`ComposePage.tsx`, `CompositionArchitectureVisual.tsx`, `index.tsx`) | Checkbox-based selection UI + layered architecture visual + YAML export |
| Examples | `catalog/artifacts/nexora/*.yaml` (8 files) | Reference manifests (`oee-data-product.yaml`, `equipment-use-log.yaml`, …) |

The existing Composer is **list-based** (checkbox selection of Platform Components), not a
free-form canvas. It already validates and exports a deterministic composition manifest.

## 2. Which parts can be reused?

- Composition model + schema + semantic validation (Phase 1 → largely done).
- Golden-Path resolver (`officialGoldenPathForSelection` maps a selection → `oee-data-product`; Phase 4 → core done).
- Deterministic YAML import/export (`serializeCompositionYaml`; Phase 2/5 export done).
- Platform Component library, categories, compatibility + conflict rules (Phase 2 → done).
- Golden-Path discovery (`releases.ts`, `golden-path-releases.yaml`; recently consolidated to one source).
- URS requirement set + approval workflow (`plugins/urs-composer*`).
- Validation traceability model (`plugins/validation-expert-backend/src/types.ts`: `ValidationRequirement`, `TraceabilityRow`, `Relationship`).

## 3. Which Platform Component APIs already exist?

- `packages/platform-common/src/platform-components.ts` — `PlatformComponent`, `findPlatformComponent`, `isSupportedPlatformComponent`, `isDeprecatedPlatformComponent`, `versionSatisfiesConstraint`, `conflictsWith`, `normalizeEntityRef`.
- `packages/platform-common/src/platform-component-library.ts` — `LibraryPlatformComponent` (certificationStatus, runtimeAvailability, dependsOn, compatibleStandardVersions), `toLibraryComponents`, `toRelatedPlatformComponents`, `OEE_DIRECT_COMPOSITION_REFS`, `RUNTIME_PACKAGE_SOURCE_PATHS`.
- Catalog: `platform-components/catalog.yaml` + per-component `catalog-info.yaml`, `spec.type: platform-component`, annotations `dataprod.platform/*` (kind/version/category/certification-status/compatible-standard-versions/interfaces/protocol).

## 4. How are Golden Paths represented / discovered?

- Release registry `catalog/releases/golden-path-releases.yaml` (+ runtime mirror `packages/platform-common/src/golden-path-releases.json`) → `releases.ts` (`loadGoldenPathReleaseCatalog`, `currentRelease`, `currentReleasedVersion`, `releasesForTemplate`).
- `OFFICIAL_GOLDEN_PATHS` derived from the registry (CERTIFIED filter).
- Templates registered in `app-config.yaml` as `kind: Template` locations.
- Composition → Golden Path mapping via `officialGoldenPathForSelection` (currently only `oee-data-product`).

## 5. How can the existing Scaffolder be invoked (no new generator)?

- Scaffolder is standard Backstage: `@backstage/plugin-scaffolder-backend` + `-module-github` wired in `packages/backend/src/index.ts`; templates in `templates/*`.
- The app already depends on `@backstage/plugin-scaffolder` + `@backstage/plugin-scaffolder-react`; templates are discoverable via `catalogApiRef`.
- The Composer currently does **not** call the Scaffolder (no `scaffolderApiRef` usage in `packages/app/src`). The generate step is: resolve Golden Path → call the standard `scaffolderApiRef.scaffold()` with composition-derived `values`. **No custom generator required.**

## 6. How can compositions reference URS without changing the URS workflow?

- URS Composer (`plugins/urs-composer-backend/src/types.ts`) has `RequirementSet`, `URSRequirement.requirementId` (e.g. `URS-OEE-001`), `Relationship` with `IMPLEMENTS`/`VERIFIED_BY`/`TRACES_TO`, and `RequirementSet.solutionCatalogRef` (already points at Catalog refs like `component:default/oee`).
- Extension: add an optional `ursRefs: string[]` (requirement IDs) to `GoldenPathComposition` nodes (or to the spec). This is additive — the URS lifecycle (`DRAFT → IN_REVIEW → APPROVED`) stays untouched, and AI/Composer never approves URS.

## 7. How can Validation Expert later consume composition traceability?

- Validation Expert already models `Requirement → ImplementedBy → VerifiedBy → Evidence` (`ValidationRequirement.implementation/verification/formalTests`, `TraceabilityRow.ursId/sysId/tdsId/evidence`).
- Generated repos carry `composition.yaml`; `plugins/validation-expert-backend/src/parsers.ts` can be extended to parse composition + test results into traceability rows. No new model needed.

## 8. Which frontend graph/canvas library is available?

- **None.** No `react-flow` / `@xyflow` / `cytoscape` / `mermaid` / `dagre` in any `package.json`. Existing visuals are hand-rolled SVG (`CompositionArchitectureVisual.tsx`, `modules/architecture/diagrams.tsx`, `storyDiagrams.tsx`).
- A free-form canvas (Phase 2 as described) therefore requires a **new dependency** (`react-flow` or similar) → `DEPENDENCY_CHANGE_REQUIRED`.

## 9. What new dependencies would be required?

- Visual canvas: a node/edge graph library (e.g. `@xyflow/react`) — new dependency, needs approval.
- AI phases: none exist today; `platform-components/intelligence/llm-gateway` is a **PLANNED** placeholder (no provider integration). The AI copilot would build on a future LLM-Gateway; provider/SDK choice is a separate design decision.

## 10. Can Phase 1–5 be implemented without Backstage core changes?

**Yes.** All changes are in Nexora-owned packages (`packages/platform-common`, `packages/app/src/modules/composer`, `plugins/urs-composer*`, `plugins/validation-expert-backend`) plus config. Scaffolder is invoked via the public `scaffolderApiRef`. No `@backstage/*` patch, no `node_modules` change, no DB-schema change.

## 11. Which files/packages would need changes?

- `packages/platform-common/src/composition.ts` — extend `GoldenPathComposition` (URS refs, optional business context, optional node categorization).
- `packages/platform-common/src/composer.ts` — extend presets + resolver beyond `oee-data-product`.
- `packages/app/src/modules/composer/*` — UI (either enrich list-based page or add canvas), add “Generate” action.
- `plugins/urs-composer*` — expose requirement IDs for selection (read-only reference).
- `plugins/validation-expert-backend/src/parsers.ts` — parse `composition.yaml` traceability.
- `app-config.yaml` — feature flags (`composer.visual.enabled`, `composer.ai.*`).

## 12. Which new files/packages would be required?

- Minimal: extend existing files (no new package). Optionally a dedicated `plugins/composer-*` if the app module outgrows its boundary (currently composer logic already lives in `platform-common`, UI in `modules/composer`).
- New: `docs/` design notes, feature-flag config entries, and (later) the AI copilot package once the LLM Gateway exists.

## 13. Which proposed capabilities already exist (must NOT be duplicated)?

- Composition model + validation (Phase 1) — **exists** (`GoldenPathComposition`).
- Golden-Path resolver (Phase 4) — **exists** (`officialGoldenPathForSelection`).
- YAML import/export (Phase 2/5) — **exists** (`serializeCompositionYaml`, `parseCompositionManifest`).
- Platform Component library + compatibility (Phase 2) — **exists**.
- URS requirement sets + approvals (Phase 3/7) — **exists**.
- Validation traceability (Phase 10) — **exists** (`TraceabilityRow`, `ValidationRequirement`).

## 14. Smallest possible Milestone A

1. Extend `GoldenPathComposition` (add `ursRefs` + optional `businessContext`) — additive model change.
2. Add a **“Generate Data Product”** action to the existing `ComposePage` that: validates → resolves Golden Path (`officialGoldenPathForSelection`) → calls `scaffolderApiRef.scaffold()` with composition-derived values.
3. Keep the list-based UI; defer the free-form canvas (new graph dependency) to a later, separately-approved step.

This delivers the deterministic end-to-end flow (Describe → Compose → Validate → Resolve → Generate) with **zero new dependencies** and **zero Backstage-core changes**.

## 15. Architectural risks that would cause unnecessary refactoring

1. **Introducing `DataProductComposition` as a second kind** — the spec’s example manifest conflicts with the existing `GoldenPathComposition`. Reuse/extend the existing kind instead.
2. **Building a parallel composer** instead of extending `ComposePage`/`composer.ts`.
3. **Adding a graph library prematurely** — the list-based composer already covers the deterministic flow; the canvas is cosmetic and adds a dependency.
4. **Duplicating the Golden-Path resolver**, URS model, or Validation traceability model (all exist).
5. **Replacing the Scaffolder** — the generate step must call `scaffolderApiRef`, not a custom generator.

---

## Verdict

`VISUAL_COMPOSER_EXTENSION_ARCHITECTURE_READY`

The foundation (composition model + validation, Platform Component library, Golden-Path resolver,
Scaffolder, URS, Validation traceability) already exists in Nexora-owned packages. Phases 1–5 are an
**extension** of the existing list-based Composer and require no Backstage-core changes and (for the
smallest Milestone A) no new dependencies.
