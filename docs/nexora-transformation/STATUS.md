# Nexora Transformation Status

## Current Phase
Phase 3 — Product Studio and AI-assisted Development (Phase 2 closed)

## Current Vertical Slice
Nothing in flight. P3-S1a and P3-S1b are both landed; GP-1 and GP-4 are closed.

## Completed
- Strategy and architecture guardrails defined.
- Eight-phase implementation plan defined.
- Existing Backstage extension-first guardrails remain authoritative.
- **P0-S1 — Green baseline restored.** The repository baseline was red on
  arrival: 9 of 188 test suites failed. All nine are fixed and the full
  CI-equivalent gate now passes. See "Baseline findings" below.
- **P0-S2 — Infrastructure-dependent suites now run in CI.** 62 tests that
  skipped in every CI run now execute. Running them for the first time found a
  real defect. See [`NXD-005`](DECISIONS.md).
- **P0-S3 — Hard-coded domain surface inventoried.** Seven items recorded in
  [`HARDCODED_DOMAIN_INVENTORY.md`](HARDCODED_DOMAIN_INVENTORY.md) with their
  consumers and removal conditions. The five composition lists that Core
  duplicated from `catalog/compositions/*.yaml` had nothing keeping them in
  step; they agree today and are now guarded by
  `packages/backend/src/compositionManifestParity.test.ts`.

**Phase 0 exit criteria are met:** current behaviour documented, baseline test
state recorded and green, migration risks documented.

- **P1-S1 — ProductVersion identity invariants.** `createProductVersion`
  accepted any caller-supplied string as a version label and derived the
  ordinal from the row count. Both are fixed, with the rules as
  framework-independent functions in `platform-common`. See
  [`NXD-006`](DECISIONS.md). No data migration; existing rows are untouched.
- **P1-S2 — ProductBaseline identity invariants.** The same defect family, plus
  two worse ones: `product_baselines` has no unique index, so duplicate labels
  were simply stored; and the method superseded the APPROVED baseline before
  deciding whether the request was valid. Adopted the rule the URS side already
  reached — presence and case-insensitive uniqueness, not a version grammar,
  because baseline labels are often QMS document numbers. See
  [`NXD-007`](DECISIONS.md). No data migration.
- **P1-S4 — Baseline-label logic consolidated.** `urs-composer-backend` no
  longer carries its own copy: `nextBaselineVersion` is the shared
  `nextMajorVersionLabel` under the name the URS domain speaks, and
  `assertBaselineVersionAvailable` uses the shared `findVersionLabelClash`.
  Equivalence was checked across the URS test vectors and edge cases before
  the swap. All 418 URS tests pass, including the GxP invariants against real
  PostgreSQL. See [`NXD-008`](DECISIONS.md).
- **P1-S3 — Identity enforced by the database.** Unique indexes on
  `(product_id, version_number)` and
  `(product_version_id, lower(baseline_version))`, closing the race the service
  check cannot. The migration refuses to install them over data that already
  violates them, listing the offending keys and changing nothing — per the
  product decision not to relabel a controlled identifier unattended. Verified
  on PostgreSQL, not just SQLite. See [`NXD-009`](DECISIONS.md).
- **P1-S5 — DataContract input validation.** `DATA_CONTRACT_SCHEMA_TYPES` had
  always existed and was never enforced: `addDataContract` cast any string
  through, so stored rows could hold values the type said were impossible.
  `version` was unvalidated free text. Both fixed, no schema change. Contract
  *identity* (name, owner, uniqueness) is deliberately left to Phase 4 rather
  than half-built now. See [`NXD-010`](DECISIONS.md).
- **Flake introduced in P1-S3, closed in P2-S3.**
  `identityConstraints.test.ts` failed ~60% of full runs while passing in
  isolation. Two separate causes: a knex QueryBuilder handed to
  `expect().rejects` ([`NXD-011`](DECISIONS.md)), which was real but not what
  drove the flake, and a native-module realm crossing that made jest misread a
  genuine `SqliteError` as "did not throw" ([`NXD-016`](DECISIONS.md)). Both
  fixed — see Test Status.

**Phase 1 exit criteria are met:** core version/baseline/contract identity
invariants are defined in `platform-common`, enforced in the service, backed by
database constraints where a key exists, and covered by tests.

- **P2-S1 — Artifact domain model.** `Artifact`, `ArtifactVersion`,
  `Publisher`, the seven Artifact kinds, coordinate identity
  (`namespace/name@version`) and `nexora.yaml` manifest validation, all
  framework-independent in `packages/platform-common/src/artifact.ts`. The
  lifecycle reuses the Golden Path states rather than declaring a parallel set
  ([`NXD-012`](DECISIONS.md)); dependencies pin exact versions
  ([`NXD-013`](DECISIONS.md)). No persistence yet — that is P2-S2.
- **P2-S2 — Persistent registry.** `plugins/artifact-registry-backend` owns
  `publishers`, `artifacts` and `artifact_versions`. Identity is in the
  database as well as the service, per [`NXD-009`](DECISIONS.md): unique
  indexes on `(namespace)`, `(namespace, name)` and `(artifact_id, version)`,
  plus `lower()` expression indexes wherever the service compares
  case-insensitively, so `Acme` and `acme` cannot become two publishers.
  Registration is manifest-driven — the service knows nothing about SAP, MQTT
  or OEE — and refuses a namespace no publisher owns, a kind change between
  versions, and dependencies that do not resolve. Every version starts in
  DRAFT, so registering content can never by itself publish it. Verified on
  PostgreSQL, not just SQLite.
- **P2-S3 — Registry API and permissions.** Twelve routes over the Backstage
  permission framework, and eight permissions tiered across the *existing*
  roles rather than new Producer/Consumer roles — reviewing sits at DEVELOPER,
  certifying and publishing at DATA_PRODUCT_OWNER, so no single grant carries
  a version from draft to released. Review records evidence
  (`certificationStatus: TESTED`) without moving the lifecycle; certifying
  refuses to run without it. See [`NXD-014`](DECISIONS.md). Each transition
  names the one state it may start from and returns 409 otherwise, and the
  write is guarded on the revision it was checked against, so a concurrent
  transition loses rather than overwrites — [`NXD-015`](DECISIONS.md).
- **P2-S4 — Legacy Marketplace adapter.** All 12 offerings in
  `plugins/marketplace/src/data.ts` now map onto the registry model and come
  back unchanged. The adapter is framework-independent in
  `packages/platform-common/src/marketplace-artifact.ts` and names no domain
  capability — the offerings keep SAP, MQTT and OEE to themselves. Parity is a
  test over the real array, not a claim: 55 assertions across mappability,
  manifest validity, round trip, kind derivation, coordinate uniqueness.
  Two decisions came out of it. The display category is stored in the manifest
  rather than inverted back out of the Artifact kind
  ([`NXD-018`](DECISIONS.md)), and a manifest may not declare its own
  certification ([`NXD-019`](DECISIONS.md)). Nothing deleted, nothing seeded,
  no schema change — the array is still what the UI reads.

- **P2-S5a — Manifests on disk, loaded into the registry.** The registry is no
  longer empty. `catalog/artifacts/nexora/` holds a `kind: Publisher`
  declaration and 12 `nexora.yaml` manifests, and
  `plugins/artifact-registry-backend/src/manifestLoader.ts` registers them
  when the plugin initialises, through the same service an HTTP caller uses.
  Content is files, not a seed from the array and not a migration —
  [`NXD-020`](DECISIONS.md). The loader is idempotent, non-fatal on bad
  content, and cannot publish: every version lands in DRAFT with no
  certification status.

  Verified live, not only in tests: first start logged
  `12 registered, 1 publishers created, 0 failed`; a reload logged
  `0 registered, 12 already present, 0 failed`. The database holds 1 publisher
  and 12 artifacts across 4 kinds (TEMPLATE, CONNECTOR, DATA_PRODUCT,
  COMPONENT), all 12 versions DRAFT. The Marketplace UI is unchanged — still
  12 entries from the array, which is the point: this slice adds content and
  changes nothing a user sees.

  One real bug was caught by running it rather than by testing it: `yarn start`
  and `serve` mode have different working directories, so the default path
  resolved to `packages/backend/catalog/artifacts` and loaded nothing. Fixed
  by walking up — [`NXD-021`](DECISIONS.md), which also records that this is
  now the second copy of that logic in the repository.

- **P2-S5b — The Marketplace reads the registry.** The twelve cards on the
  Marketplace page now come from `GET /artifacts?includeVersions=true`, not
  from the array. A read-only client in the Marketplace goes over the
  permissioned API rather than into the registry's tables
  ([`NXD-022`](DECISIONS.md)); `loadOfferings` never rejects, so a registry
  that is failing or empty falls back to `marketplaceItems` and says why in
  the console. The array is still there — this is the switch, not the
  retirement.

  Verified live: one request to the registry per page load, 12 rows, no
  fallback warning, detail pages resolve from the same source.

  **Running it caught a parity break the tests did not.** The registry returns
  artifacts by name, so the catalogue silently re-sorted itself
  alphabetically. Order is visible, so that is a behaviour change, and the
  migration rule does not allow one while the switch is being proven. Fixed by
  sorting on each offering's position in the array — derived, not restated —
  and the assertion is now on the exact list rather than the set
  ([`NXD-023`](DECISIONS.md)). Worth noting what the fidelity is to: the
  array's order is the order things were added over time, not a designed one.

- **Blocked-port guard swept.** `listenOnFetchablePort` now lives once, in a
  new `@internal/backend-test-utils` workspace, and every test file that binds
  an ephemeral port and drives it with `fetch` uses it. The flake class that
  failed a full run during P2-S5b is closed.

  The sweep corrected the recorded count in both directions
  ([`NXD-024`](DECISIONS.md)): thirteen files bind a port rather than twelve,
  but only nine could ever hit the bug, because the blocklist is a `fetch`
  rule and four suites drive their servers with `http.request`. Eight needed
  fixing, not eleven.

- **P2-S5c — `marketplaceItems` retired.** The array, its fallback in
  `offeringSource.ts`, the legacy-order function that derived from it, and the
  two hand-maintained twelve-id lists are all deleted — see
  [`NXD-026`](DECISIONS.md). `loadOfferings` now rejects on a registry failure
  instead of substituting anything, which the Marketplace pages already render
  as an error state. This also forced the question P2-S5b deferred:
  *which certification does the UI show.* The manifest can no longer state one
  at all; the Marketplace shows the registry's own
  `ArtifactVersion.certificationStatus`, floored at `DEVELOPMENT` for a
  version nothing has reviewed — see [`NXD-025`](DECISIONS.md). Two of the
  twelve (`aas-data-product`, `oee-data-product`) visibly lose the CERTIFIED
  badge they showed as legacy metadata; that is the intended outcome, not a
  regression to paper over — the badge now means what it says. Card order
  changed from array-insertion order to the registry's own (alphabetical by
  name), which NXD-023 named as the question for after the array was gone.

**Phase 2 exit criteria are met:** the registry persists Artifacts,
ArtifactVersions and Publishers with identity enforced in the database; the
lifecycle is manifest-driven, permissioned across the existing five roles with
no single grant carrying a version from draft to release, and guarded against
lost updates; the legacy Marketplace has been fully replaced — it reads the
registry, the array is deleted, and the certification it shows is the
registry's own rather than an inherited claim.

- **P3-S1a — Compositions are Artifacts.** The eight manifests under
  `catalog/compositions/` are now `GOLDEN_PATH` Artifacts in
  `catalog/artifacts/nexora/`, and that directory is deleted. The registry
  loads, versions and serves them through the machinery P2 already built — no
  second pipeline, and `GOLDEN_PATH` was a declared kind no manifest used.
  `compositionOfArtifactManifest` adapts a manifest to the existing
  `GoldenPathComposition` model so validation is untouched. See
  [`NXD-027`](DECISIONS.md).

  **The audit corrected GP-1 before any code changed.** The inventory recorded
  the Core constants as copies of the manifests; in fact nothing read those
  manifests at runtime, so the constants were the truth and the manifests were
  documentation. The slice was therefore about giving the manifests a runtime,
  not about stopping a duplication.

  Two things the format could not express before: `spec.components[].optional`
  now carries the Equipment Use Log optional pair that lived only in Core, and
  `validateArtifactManifest` requires a non-empty component list for
  `GOLDEN_PATH` so a typo fails loudly instead of resolving to an empty
  composition. One rename was forced by the registry's identity rules — the
  Mode B example is `oee-data-product-uns`, because `nexora/oee-data-product`
  is already the DATA_PRODUCT ([`NXD-028`](DECISIONS.md)).

  Verified live, not only in tests: startup logged
  `8 registered, 12 already present, 0 publishers created, 0 failed`. The
  Marketplace is unchanged at 12 cards, because a manifest with no
  `spec.marketplace` block yields no view — now asserted over the real
  composition files rather than left to inference.

  **The constants are not deleted.** They still feed `composer.ts`,
  `oeeBuiltWithSummary` and `DeveloperHubPage.tsx`, which are GP-2/GP-3/GP-4
  and out of this slice's scope. `compositionManifestParity.test.ts` survives,
  repointed, and still guards the duplication.

- **P3-S1b — the consumers read the registry; the constants are gone.** The
  five pages that imported composition lists from Core —`ComposePage`,
  `PlatformComponentsPage`, `PlatformComponentDetailPage`,
  `MarketplaceDetailPage`, `DeveloperHubPage` — now take them from
  `useGoldenPathCompositions`, one loader beside the registry client. The six
  `*_COMPOSITION_REFS` constants, `LIBRARY_COMPOSITION_USAGE` and 97 lines with
  them are deleted, and `compositionManifestParity.test.ts` too: it existed to
  hold the constants and the files in step, and there is nothing left to hold.
  See [`NXD-029`](DECISIONS.md).

  **GP-1 and GP-4 are closed.** `oeeBuiltWithSummary(catalog)` became
  `builtWithSummary(catalog, componentRefs, productLabel)`, so Core describes
  the shape of a "built with" panel without naming the product. Two manifest
  fields made it possible: `spec.usage` carries the consumer label and kind the
  Core table held, and `spec.builtFrom` on the OEE DATA_PRODUCT names the
  composition it is built from — which removed the
  `item.id === 'oee-data-product'` literal that gated the panel.

  One visible change, asserted rather than discovered: "used by" labels are now
  ordered by composition name, so `mqtt-consumer` reads "Machine Metrics
  Reference, OEE Data Product" instead of the reverse. The old order was the
  order the table happened to be written in.

  Verified live against a fresh registry: `20 registered, 0 already present,
  1 publishers created, 0 failed`, 8 GOLDEN_PATH artifacts, `usage` stored on
  exactly the six that declare it, `builtFrom` resolved, all 20 versions DRAFT.

  **Running it found something the tests could not**
  ([`NXD-030`](DECISIONS.md)): editing a manifest without bumping its version
  does not reach a registry that already holds that coordinate. The loader
  logged `8 registered, 12 already present` and kept serving the old manifests;
  the new fields appeared only after the registry database was dropped. That is
  the immutability rule working, not a defect — but it is now a recorded
  operational constraint rather than something to rediscover.

- **P3-S2 — Golden Path identity and presets are manifest-driven.** GP-2 and
  GP-3 are closed. `officialGoldenPathForSelection` and `officialGoldenPathForDraft`
  now accept `ReadonlyMap<string, readonly string[]>` of all `runtime` GOLDEN_PATH
  compositions from the registry and return the composition name (`string | undefined`),
  not the literal `'oee-data-product'`. `ComposerPreset.kind` is now
  `'baseline' | 'official' | 'example'`; `composerPresets` derives one preset
  per composition from `officialCompositions` and `exampleCompositions` maps.
  `GoldenPathCompositions` gains `official`, `examples` and `builtFromIndex`
  (composition name → DATA_PRODUCT name via `spec.builtFrom`) so the Composer
  can still navigate to `/marketplace/oee-data-product` without hardcoding it
  in Core. See [`NXD-031`](DECISIONS.md).

  409 tests, 0 failures (tsc + lint + yarn test subset).

- **P3-S9 — Machine State Consumer linked to its GOLDEN_PATH composition.**
  `machine-state-consumer-data-product.yaml` gains `spec.builtFrom: "machine-state-consumer"`,
  the second entry in `builtFromIndex`. The Composer now offers "Generate Data
  Product" and "Continue to Golden Path" for the Machine State Consumer
  selection without any Core change.

- **P3-S8 — Composition config summary (development context).** `compositionConfigSummary(selected)`
  aggregates all `configurationKeys` and `configurationNotes` from the selected
  components into a cross-component checklist. `ComposePage` renders it below
  the YAML preview. Exported as `CompositionConfigKey` / `CompositionConfigSummary`
  from `platform-common`. 3 tests.

- **P3-S7 — Catalog component loader wired into AI spec generation.** The
  `generateProductSpec` backend call now loads real Platform Component entities
  from the Catalog API via `createHttpCatalogComponentLoader`, following the
  same HTTP + `discovery` + `auth` pattern as the URS baseline resolver. No new
  dependency added — uses `@backstage/plugin-catalog-node` transitively. The
  loader is best-effort: any HTTP failure returns an empty list so spec
  generation degrades gracefully. 4 tests cover: correct filter, HTTP error,
  network error, and missing title fallback.

- **P3-S6 — AI spec apply sets owner.** `applySpecDraft` now sets `owner:
  actor` so the `owner-declared` platform policy obligation is met at apply
  time. `dataClassification` and `gxpRelevance` still require deliberate manual
  entry before release. Test updated to assert `product.owner === actor`.

- **P3-S5 — GP-5 deleted.** `WAVE1_COMPONENT_TITLES` is removed from Core
  and `index.ts`. `DeveloperHubPage.tsx` declares a local `OEE_COMPONENT_TITLES`
  constant — the app layer may know which product it displays. `builtWithSummary`
  loses the middle fallback and uses `match?.title || name`. See
  [`NXD-033`](DECISIONS.md).

- **P3-S4 — AI provider abstraction: Anthropic client added.** The Composer
  backend can now use Claude in addition to OpenAI. `AnthropicComposerLLMClient`
  implements `ComposerLLMClient` via raw `fetch` against
  `https://api.anthropic.com/v1/messages` (no new SDK dependency). A new config
  key `composer.ai.provider` (`'openai'` default, `'anthropic'`) selects the
  provider; `composer.ai.model` overrides the per-provider default
  (`gpt-4o-mini` / `claude-haiku-4-5`). Thinking blocks (Opus 5) are silently
  skipped when extracting the text response. Six tests cover: correct headers,
  JSON parsing, thinking-block skip, API error, missing text block, and
  non-JSON content. Phase 3 AI provider abstraction goal partially met.

- **P3-S3 — GP-6 deleted.** `EQUIPMENT_USE_LOG_COMPOSITION_YAML` and
  `parseEquipmentUseLogExample()` had no production consumers after P3-S2; both
  are deleted from `platform-component-library.ts` and `index.ts`. The two
  tests that used them now read from the disk manifest via `compositionOnDisk()`
  and `readGoldenPathComposition()`. See [`NXD-032`](DECISIONS.md).

## In Progress
Nothing in flight.

## Next
No slice scoped. The remaining Phase 3 Golden Path drift is GP-8 (`nexora-industrial.ts`,
589 lines, 62 exports of manufacturing vocabulary in Core, larger than the rest
of the inventory combined). Phase 3's own plan also contains dependency and
compatibility resolution, configuration schemas, Product generation, Development
Context and AI provider abstraction — none of which exists.

Deferred, not part of Phase 2: **per-namespace permission scoping.** The eight
registry permissions are platform-wide, so a DATA_PRODUCT_OWNER may certify in
any namespace, not only their own. `Publisher.memberGroups` is written and
serialized but read by nothing — no update path exists either. Closing this
needs new ground the repository has never used: all eight permissions are
`BasicPermission`, not `ResourcePermission`, the policy's decision type
(`'allow' | 'deny'`) cannot express a conditional or a list filter, no
Backstage conditional-permission or permission-rule machinery is used
anywhere in the repository, and the registry router authorizes the five
lifecycle transitions before it knows which namespace a version belongs to.
`resourceRef`-aware but non-conditional gating exists once, for scaffolder
templates (`allowScaffolderTemplateIfReleased`), but it cannot filter a list
and is not a precedent for a list-filtering decision. See
[`NXD-014`](DECISIONS.md).

Carried into Phase 4 rather than done early: **`DataContract` identity**. A
contract is keyed to a `productComponentId` and has no name, owner or
independent version, so it cannot be referenced or versioned on its own.
Phase 4 needs the whole first-class model in one designed migration — see
[`NXD-010`](DECISIONS.md).

## Test Status
Verified on 2026-09-19, running the gate the way CI runs it (`CI=true`,
PostgreSQL up, Python toolchain installed):

| Gate | Command | Result |
| --- | --- | --- |
| Guardrails | `yarn guard:platform` | PASS (9 pass, 9 documented warnings, 0 fail) |
| Typecheck | `yarn tsc` | PASS |
| Lint | `yarn lint:all` | PASS |
| Unit tests | `yarn test` | PASS — 204 suites, 1665 tests, **0 skipped** |

**The identityConstraints flake is closed (2026-09-17).** It was never a
missing constraint. better-sqlite3 is a native module, so its binding loads
once per jest *worker* and the `SqliteError` it raises carries the `Error`
intrinsic of whichever module realm loaded it first; in a later file in the
same worker `error instanceof Error` is false, and jest renders a non-Error
rejection value as "Received function did not throw". The insert always
raised, and the message was always correct — the assertion was what broke.
Fixed by matching the message instead of the type, see
[`NXD-016`](DECISIONS.md), which also corrects [`NXD-011`](DECISIONS.md).

The direction of this risk was recorded backwards. It was a false **red**, not
a false green: a green `yarn test` was never able to hide a missing
constraint, so no identity guarantee went unverified while this was open.

`--runInBand` makes it deterministic rather than ~2-in-10 (one process, so the
realm crossing is guaranteed), and is now the repro for this class of bug.

Without the optional infrastructure the same 62 infrastructure-dependent tests
skip and the command still exits 0 — that is the intended developer-machine
behaviour under `NXD-005`. (The absolute pass count that used to stand here
was measured before P2-S4 added 81 tests and has been dropped rather than
adjusted by arithmetic; only the skip count was ever the point.) To run
everything locally:

```bash
docker compose -f docker-compose.test.yml up -d
python -m pip install pydantic 'jsonschema[format]' -e packages/data-product-sdk
yarn test
```

`yarn prettier:check` reports style drift in 883 files. It is **not** part of
the CI gate (`.github/workflows/ci.yml` runs guardrails, tsc, lint and tests
only) and was left untouched rather than mixed into a baseline commit.

### Baseline findings (all fixed in P0-S1)
Nine failing suites resolved to five root causes. Eight were stale tests that
contradicted deliberate, already-committed behaviour; one was a real defect.

1. **Stale Golden Path template contracts (5 suites).** Commits `e06e886` and
   `407eee4` added a `ursBaselineId` parameter and a `verify-urs` step to the
   five data-product templates; the contract tests were never updated.
   Re-expressed the assertions by step id rather than array index, and turned
   the parameter/step pair into an invariant: a template that asks for a URS
   baseline must verify it before `publish`.
2. **Stale Catalog Graph assertion (1 suite).** Commit `c0a2f5c` removed a
   relative-URL entity link because Backstage rejected the whole entity over
   it. The test still asserted the broken link. Replaced with a regression
   guard that every entity link is an absolute URL.
3. **Stale colour literal (1 suite).** `StatusChip.test.tsx` pinned the
   pre-contrast-fix teal `#0D9488`; the managed token is now `#0F766E`
   (darkened to clear WCAG AA). Rebound the test to `NEXORA_TONE`.
4. **Non-portable Python invocation (1 suite).** `compatibilityPolicyParity`
   hard-coded the `python` binary. Now resolves `$PYTHON`/`$PYTHON_BIN`/
   `python3`/`python` and verifies the interpreter has a working standard
   library. Missing interpreter fails in CI, skips locally with a reason.
5. **Jest resolver cache collision (1 suite) — real defect.** See
   [`NXD-004`](DECISIONS.md). `packages/app` shared a jest cache `id` with 11
   other frontend projects, so its `moduleNameMapper` was silently bypassed
   whenever another project instantiated the shared resolver first. The suite
   passed in isolation and failed in the full run.

## Known Risks
- ~~`identityConstraints.test.ts` still fails intermittently under full-run
  load with no identified mechanism.~~ **Root-caused and fixed 2026-09-17**,
  see [`NXD-016`](DECISIONS.md) and Test Status. The risk was also stated
  backwards: it was a false red, not a gate that could go green over a missing
  constraint.
- ~~Legacy Marketplace is a static, hard-coded TypeScript array
  (`plugins/marketplace/src/data.ts`), not a registry.~~ **Closed in P2-S5c
  (2026-09-19).** The array is deleted; the registry is the only source and a
  failure of it is now a visible error, not a silent substitution — see
  [`NXD-026`](DECISIONS.md).
- Composer/Core contains domain-specific Golden Path logic (OEE, Machine
  State) inside `packages/platform-common`. **Wider than recorded** — the
  status audit of 2026-09-17 added
  [`GP-8`](HARDCODED_DOMAIN_INVENTORY.md): `nexora-industrial.ts` is 589 lines
  and 62 exports of manufacturing vocabulary in Core, larger than GP-1..GP-7
  combined and missed by the P0-S3 sweep, which looked for Golden Paths and
  composition lists rather than for a domain vocabulary.
- URS/Validation lifecycle integration is incomplete. **The audit of
  2026-09-17 found the gap is specifically at the end of the chain, and it is
  the platform's largest:**
  - `packages/platform-common/src/policy.ts:53-60` denies `validation.approve`,
    `risk.accept` and `baseline.modify` to **every role, including
    PLATFORM_ADMIN** — "Reserved Validation Expert controls, never
    auto-granted in v0.1". The permissions are defined and unit-tested, and no
    route or service authorizes against them. **There is no Validation
    Decision step in the product.**
  - `plugins/composer-backend/src/service.ts:378` sets
    `updated.approvedBy = actor`. The actor requesting the transition becomes
    the approver, with no check that they differ from the creator. **Product
    release has no Segregation of Duties.** The URS side does enforce it,
    through the approval chain and e-signature; the Product side does not.
  - The release gate never consults validation. The only occurrence of
    "validation" in `composer-backend/src/service.ts` is a comment. A Product
    version can reach RELEASED with no ValidationContext, no executed protocol
    and no evidence.
  - `ProtocolType` is `'IQ' | 'OQ' | 'UAT'`; there is no PQ.

  These are Phase 5 and nothing blocks them today. They are recorded here
  because the chain visibly does not close, and discovering that in Phase 5
  rather than now would put the GxP positioning on a claim the code does not
  support.
- **`ProductBaseline` does not record what was built.**
  `composer-backend/src/service.ts:546` snapshots the version, components
  (id/name/type), contracts (id/schemaType/version) and traceability links —
  and no Artifact versions, commit SHA, artifact digest, configuration or
  policies. Exact Artifact version provenance therefore has no carrier, and
  revalidation scope has nothing to diff against. Connecting the registry to
  the baseline is the fix, which is why it waits on Phase 2 finishing.
- Formal Validation approval and SoD require consolidation.
- Data Exchange, Lineage and Analytics concepts are not yet unified.
- ~~**Socket test flake.**~~ **Closed 2026-09-17.** `fetch` refuses the Fetch
  standard's blocked ports (6000, 6697, 10080, …) before opening a socket,
  raising `TypeError: fetch failed` with cause `bad port`; this container's
  `ip_local_port_range` is `1024 65535` instead of the usual `32768 60999`, so
  `app.listen(0)` can hand one straight to a test server. The guard now lives
  once, in `@internal/backend-test-utils`, and every affected file uses it.

  The sweep corrected the count in both directions — see
  [`NXD-024`](DECISIONS.md). **Thirteen** files bind an ephemeral port, not
  twelve. But only **nine** could ever hit this: the blocklist is a `fetch`
  rule, and `http.request` does not consult it, so the three
  `urs-composer-backend` HTTP suites and
  `validation-expert-backend/validation-context-integration.test.ts` were
  never affected. Eight needed fixing, not eleven.

  It stopped being theoretical first: a full run during P2-S5b failed on
  `data-products-backend/src/router.test.ts` with an empty `Cause:`, passing in
  isolation and on re-run.

## Phase 0 audit — discovered reality

### Domain ownership
`packages/platform-common/src/product.ts` is the single Product domain. It
already owns `Product`, `ProductVersion`, `ProductComponent`, `DataContract`,
`TraceabilityLink`, `ProductBaseline` and `ProductBaselineDelta`. No second
Product domain exists — the consolidation constraint currently holds.

Missing relative to the target model:
- No `Artifact` / `ArtifactVersion` type anywhere (Phase 2).
- No `Publisher` type anywhere (Phase 2).
- No `ProductDependency` / `Subscription` type (Phase 4).
- `DataContract` is **not** first-class: it hangs off `productComponentId` and
  has no owner, semantics, quality rules, SLA, classification, access policy,
  delivery mechanism or compatibility rules (Phase 4).

### Persistence
Only three backends own a database, all via the Backstage
`coreServices.database` service with their own `db/migrations.ts`:
`urs-composer-backend`, `composer-backend`, `validation-expert-backend`.
Everything else (`aas`, `data-products`, `entitlements`, `model-company`,
`plugin-directory`, `users`) persists to the filesystem or holds state in
memory. Phase 2's Artifact Registry needs real persistence and cannot follow
the filesystem pattern.

### Hard-coded domain in Core
`packages/platform-common/src/platform-component-library.ts` and
`composer.ts` hard-code OEE and Machine State compositions
(`OEE_DIRECT_COMPOSITION_REFS`, `MACHINE_STATE_COMPOSITION_REFS`,
`oeeBuiltWithSummary`, and an `'oee-data-product'` return type in the
composition resolver). This is the Phase 3 target: Golden Paths must become
dynamically resolvable Artifacts.

### Permissions
45 custom permissions across URS (5), Validation (8), Data Product (8),
Marketplace/Plugin Directory (4) and others, inventoried in
`packages/platform-common/src/permissions-inventory.md`. All ride the
Backstage permission framework — no second permission engine. The target
`artifact.*` / `publisher.manage` capability set does not exist yet (Phase 2).

### Composition layer
`packages/app` is 27k lines across 151 files. `guard:platform` reports it
within its configured composition limits, but it is far larger than a pure
wiring layer and should be watched as Phase 3/6 move UI into owned plugins.

## Migration Debt
- ~~The GxP invariant suites never run in CI.~~ **Resolved in P0-S2.** 62
  tests across six files (`urs-composer-backend`: `gxp-invariants`,
  `runtime-postgres-proof`, `wd-seed-persistence`, `p1a-verification`,
  `repository`; `validation-expert-backend`:
  `validation-context-integration`) skipped unless PostgreSQL answered on
  `TEST_DB_HOST:TEST_DB_PORT` (default `127.0.0.1:5435`), and
  `.github/workflows/ci.yml` defined no `services:` block. CI now provisions
  PostgreSQL and fails rather than skipping. The first real execution found a
  missing `await` in `validation-context-integration.test.ts`: the closing
  assertion of the URS → Validation integration proof was resolving a Promise
  against `toHaveLength` and had never actually run.
- `plugins/validation-expert-backend` imports another workspace's private
  source (`@internal/plugin-urs-composer-backend/src/__testUtils__/...`),
  flagged by `guard:platform` as a cross-plugin boundary warning.
- ~~Legacy Marketplace data must stay until the Marketplace reads the registry
  (P2-S5b)~~. **Resolved in P2-S5c.** The array and `registryParity.test.ts`
  are deleted; `artifactManifestFiles.test.ts` no longer carries a named
  twelve-id list either, since the directory it reads is now the only copy —
  see [`NXD-026`](DECISIONS.md).
- `packages/data-product-sdk` has no TypeScript sources; it is a Python
  package inside a Yarn workspace, which is why a missing interpreter could
  turn into a hard test failure.

## Blocked Decisions
**DEPENDENCY_CHANGE_REQUIRED — `supertest` (test-only).** Evidence gathered
2026-09-16 as the dependency gate requires; **not installed**, awaiting a
decision. Not blocking any phase.

> **Justification withdrawn 2026-09-17.** The "Reason" below — that the real
> TCP socket is the likeliest cause of the intermittent failure — was wrong.
> The cause was the Fetch blocked-port list ([`NXD-017`](DECISIONS.md)), fixed
> with a four-line rebind and no dependency. The evidence below stays on
> record because it is still accurate about the package, but `supertest`
> should now be approved on its own merits (in-process routers are faster and
> need no port at all) or dropped — not adopted as a flake fix.

- Package: `supertest@^7.2.2`, `@types/supertest@^7.2.1` — `devDependencies`
  only, in the backend plugin workspaces that currently bind sockets
- Existing alternative checked: the current pattern is `app.listen(0)` plus a
  real `fetch` in twelve files; there is no in-process HTTP test helper in the
  repository
- Backstage capability checked: `@backstage/backend-test-utils` provides
  service mocks and test databases, not in-process Express request driving
- Reason: the real TCP socket is the likeliest cause of the intermittent
  failure under Known Risks. In-process requests remove the socket and the
  port entirely
- Engine compatibility: `supertest` requires Node `>=14.18.0`; this repository
  is `22 || 24` — compatible
- Expected `yarn.lock` impact: `supertest`, `superagent@^10.3.0` and its tree
  (`component-emitter`, `cookiejar`, `debug`, `fast-safe-stringify`,
  `form-data`, `formidable`, `methods`, `mime`, `qs`) plus the two `@types`
  packages. Neither `supertest` nor `superagent` is in the lockfile today.
  `formidable` and `component-emitter` would be genuinely new; `methods`,
  `qs`, `mime`, `debug`, `fast-safe-stringify` and `cookie-signature` already
  have entries, so those would at most add a resolution
- Compatibility evidence: **no `@backstage/*`, React or Material UI package
  appears anywhere in that tree**, so the resolutions the guardrails protect
  are untouched. `supertest` works against any `http.Server`, so it needs no
  particular Express version; the repository is uniformly `express@^4.22.0`
- Residual risk: `formidable` (multipart parsing) is new transitive surface in
  a devDependency. It is not reachable from any production bundle

Until approved, the sockets stay. That is no longer a cost: the flake is
fixed at its actual cause rather than papered over with a retry.

**Resolved (2026-09-16) — pre-existing duplicate rows.** Decision: the
migration fails loudly and remediation is manual. Implemented in P1-S3, see
[`NXD-009`](DECISIONS.md).

## Last Commit
See `git log` on `ms/composer-ai-spec-and-ci-quality-gate`. Phase 0 landed as
three commits: the transformation memory, "fix(test): restore a green
baseline and stop the jest resolver collision" (P0-S1), "ci(test): run the GxP
and persistence suites instead of skipping them" (P0-S2) and the hard-coded
domain inventory (P0-S3).
