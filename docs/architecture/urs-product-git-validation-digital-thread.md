# URS → Product → Git → Validation Digital Thread

> Implemented control-plane flow. Technical integrity — not a GxP claim by itself.

## Ownership

| Concern | System of Record |
|---|---|
| URS, revisions, baselines, content hashes | **URS Composer** |
| Product, ProductVersion, ProductBaseline, ProductManifest | **Product Composer** |
| Exported URS snapshot + manifest files | **Git** (immutable export only) |
| Validation runs, evidence, retest / release decisions | **Validation Manager** (stable ID refs only) |

Dependency direction: Nexora plugins → Backstage public APIs. No cross-plugin private DB access.

## Binding (ProductVersion + ProductBaseline)

Controlled `ProductVersion` creation requires:

- `requirementSetId`
- `ursBaselineId`
- `ursVersion`
- `ursContentHash`

Server validation (`ComposerService.createProductVersion`):

1. Fields present and `ursContentHash` is SHA-256 hex
2. URS Composer HTTP resolve (`resolveApprovedBaseline`) — status **APPROVED** or **BASELINED**
3. Live `requirementSetId` / `baselineVersion` / `contentHash` must match the request

`ProductBaseline` stores the same pin immutably (`requirement_set_id`, `urs_version`, `urs_content_hash` columns). Baseline create rejects a mismatched pin vs the ProductVersion.

Without a valid URS baseline, no controlled ProductVersion / ProductBaseline can be created or approved.

## Product Manifest

`buildProductManifest` persists `ProductManifest` v0.1 with:

- `spec.ursBaselineId`, `requirementSetId`, `ursVersion`, `ursContentHash`
- components, dataContracts, policies, qualityGates
- server-side `metadata.contentHash`

## Repository scaffold (Golden Path)

`getScaffoldBinding` issues Scaffolder pin values including file bodies:

| Path | Content |
|---|---|
| `/product-manifest.yaml` | Product + URS pins, components, contracts, policies, qualityGates, `manifestContentHash` |
| `/docs/urs/URS-baseline.json` | Immutable URS snapshot |
| `/docs/urs/URS-baseline.md` | Human-readable snapshot |
| `/docs/urs/traceability-matrix.yaml` | URS → Design → Source/PR → Test → Evidence template |
| `/AGENTS.md` | Rule: read URS baseline + manifest before architecture/code/test changes |

MQTT Temperature, OEE, and REST Equipment Golden Path template parameters
accept these bodies and emit the same controlled repository files. Marketplace
creates without pins remain unpinned (CI skips).

## CI gates (fail-closed)

1. `scripts/check_manifest_pins.py` — catalog annotation pins when hash present
2. `scripts/check_digital_thread.py` — when controlled `product-manifest.yaml` is present:
   - missing `product-manifest.yaml` fails; only an intentionally empty
     Marketplace manifest is treated as unpinned
   - URS snapshot + AGENTS + traceability matrix exist
   - `ursBaselineId` / `ursContentHash` match snapshot
   - `manifestContentHash` matches the canonical manifest content
   - release/tag refs require the same valid `manifestContentHash`

Manipulated snapshot or hash → CI fails.

## Change impact & retest

- Draft URS changes do **not** create assessments (`triggerRetest: false`).
- Successor ProductVersion with a **new** APPROVED/BASELINED URS vs parent → `product_change_assessments` row:
  - Requirement delta: ADDED / MODIFIED / REMOVED / UNCHANGED
  - ADDED/MODIFIED/REMOVED → `RETEST_REQUIRED`
  - UNCHANGED → `CARRIED_FORWARD` (evidence not silently re-linked to the new version)
- `checkReleaseGate` blocks with `RETEST_REQUIRED_OPEN` while assessment status is OPEN.

## Validation Manager contract

`AssignProductRequest` may include:

- `manifestHash`, `gitRepositoryUrl`, `commitSha` / `releaseCandidateCommitSha`
- `changeAssessment` with retest / carried-forward requirement IDs

Stored on `ValidationContext.productRef` + `retestItems`. Test runs and runtime
evidence snapshot `ursBaselineId`, `productVersionId`, `productBaselineId`, and
`manifestHash`.

The Validation Manager context page displays the Change Assessment, affected
requirements, linked test/evidence IDs, and RETEST_REQUIRED state.

`assertContextExecutable` blocks test start while any `RETEST_REQUIRED` remains.

Validation never decides URS/product validity — it only references Product Composer / URS Composer stable IDs.

## State transitions (controlled product)

```
URS Baseline APPROVED|BASELINED
        ↓ pin
ProductVersion DRAFT (URS binding immutable)
        ↓
ProductBaseline DRAFT → APPROVED (+ ProductManifest hash)
        ↓ scaffold
Git repo (snapshot + manifest + CI)
        ↓ CI PASSED + Validation Decision
ProductVersion RELEASE_CANDIDATE → RELEASED
```

Release requires: URS baseline + Product baseline + Manifest hash + Git/CI evidence + no open RETEST_REQUIRED + Validation context product assignment.
The Product Composer release gate resolves the Validation Manager context over
its public HTTP API and requires an `APPROVED` decision matching the complete
URS/Product/Baseline/Manifest tuple. Missing or unavailable decisions fail
closed.

## API / module map

- `packages/platform-common/src/digital-thread.ts` — shared contracts
- `plugins/composer-backend/src/service.ts` — binding, scaffold, release gate, change impact
- `plugins/composer-backend/src/digital-thread-artifacts.ts` — repo file builders
- `plugins/composer-backend/src/change-impact.ts` — requirement delta / CIA
- `plugins/composer-backend/src/validation-decision-resolver.ts` — read-only
  Validation Manager decision boundary
- `plugins/validation-expert-backend/src/service.ts` — assign product + retest gate
- `templates/{mqtt-temperature-product,oee-data-product,rest-equipment-product}/...`
  — scaffold files + CI scripts

## Tests

- `plugins/composer-backend/src/digital-thread.test.ts`
- `plugins/validation-expert-backend/src/digital-thread-retest.test.ts`
- `plugins/validation-expert-backend/src/service.test.ts` (run/evidence pin snapshot)
- `templates/mqtt-temperature-product/content/tests/test_check_digital_thread.py`
- Existing versioning / product-gating suites extended for URS pin requirements
