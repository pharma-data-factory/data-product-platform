# Nexora Transformation Status

## Current Phase
Post-plan. All eight phases of `IMPLEMENTATION_PLAN.md` have met their exit
criteria; Phase 7 closed on 2026-09-21. Work since then realizes
`PRODUCT_STRATEGY.md` directly, in three Waves (Wave 1 = `P-EXT-S1..S5`,
Wave 2 = `W2-1..4`, Wave 3 = `W3-1..8`) followed by a numbered remediation
series (`5-R1`, `6-R1..R3`, `7-R1..R6`, `A-2`, `A-3`) and a review-item series
(items 1–9). These IDs are not phases and have no exit criteria of their own.

## Current Vertical Slice
**Batch 1 — the journey the platform describes can be walked.** Uncommitted as
of 2026-09-25 and green on all four gates. Driving the URS → Product → Release
path as a user, rather than testing its modules, found it broken at four
joints, each the same shape as [`NXD-053`](DECISIONS.md): written, routed,
tested, and reachable from no caller.

- A requirement version could not leave DRAFT from the browser — no client
  method existed for the two transition routes and nothing called
  `signRequirementVersion`. A baseline is releasable only once every version it
  pins is APPROVED, so **no baseline a user created could ever be released** and
  `/baselines/approved`, the list the Product page binds against, was
  permanently empty.
- `createProductBaseline` and `approveProductBaseline` were called from no page,
  so `NO_APPROVED_BASELINE` was a blocker no user could clear.
- `updateProduct` dropped `dataClassification`, `lifecycle` and
  `declaredPolicies` in its mapping and validated nothing, so the three
  platform-policy obligations were unclearable — and
  `gxpRelevance: 'TOTALLY_MADE_UP_VALUE'` was stored and *satisfied*
  `gxp-relevance-set`.
- The approval chain could not be walked by one identity, correctly, and there
  was only one. Three demo identities now exist behind a local-only provider;
  the separation is unchanged. See [`NXD-057`](DECISIONS.md).

`releaseGateProgress.test.ts` measures the result instead of asserting it in
prose: it drives the gate with the operations the Product page now offers and
records which codes clear and which remain. Two remain deliberately —
`INCOMPLETE_TRACEABILITY` and `NO_URS_BASELINE`. Two storage defects were found
the same way: `baselines.approval_instance_id` was read off a column no
migration ever created, and the two approval workflows existed only in the
Postgres seed, so `submitBaseline` failed with `Workflow not found` on the
shipped `memory` mode. See [`NXD-058`](DECISIONS.md).

**The journey was then walked on a running stack, and it completes.** See
[`NXD-059`](DECISIONS.md). URS → review chain → QA signature → baseline → three
role-separated approvals → Product → binding → release gate, as three
identities. The gate ends at `INCOMPLETE_TRACEABILITY` and
`NO_APPROVED_VALIDATION_DECISION`; `NO_URS_BASELINE` is gone because the binding
is real. **This is the first time the deepest branch of the release gate has
been reached in the application**, and it retires the note that closes
[`NXD-054`](DECISIONS.md), [`NXD-055`](DECISIONS.md) and
[`NXD-056`](DECISIONS.md).

It did not complete on the first attempt. **Signing a requirement version was
impossible and had been since the feature was written**: the role lookup and the
PIN re-authentication were both made from inside `repository.withTransaction`,
which holds the only connection they need, so knex waited 60 seconds and the two
failures arrived disguised as a 401 about permissions and a 500. No version
could be signed, so none could reach APPROVED, so no baseline could be released.
Fixed — roles and second factor are resolved before the transaction opens, with
`transactionBoundary.test.ts` pinning the ordering. Six further findings are
recorded in `NXD-059` and **not** fixed; the most serious is that approval order
is not enforced.

**`/products` is the Product page, and it is reachable.** The 2026-09-24 slice
executed [`NXD-056`](DECISIONS.md): the page went into the sidebar under
*Build*, where the group previously offered `/create` and `/compose` and then no
destination, and the single 856-line scroll became six tabs — Overview,
Requirements, Architecture, Contracts, Tests, Validation.

Three of those tabs show data that already existed and no page had ever
displayed: contracts by coordinate with their exchange definition (closure
Slices 1 and 2), CI build provenance on the ProductBaseline (closure Slice 3),
and the verification/validation axes per requirement (Slice 1b). No new
endpoint was needed for any of them.

**`Development` is not built** — the seventh tab NXD-056 names. `Product` has
no repository field, no entity reference and no scaffolder bearing, so the tab
would hold only an explanation of what is missing. It lands with Step 2, which
creates that identity. Two defects were fixed in passing: the add-component
form wrote against the *latest* version while the picker selected any version
(the write-path twin of the bug NXD-055 fixed on the read path), and every
`TextField` on the page was unlabelled because Material UI v4 generates no
`id`. See the addendum on [`NXD-056`](DECISIONS.md).

**URS → Product Slice 1a/1b is done.** A Product Version can now be bound to an
approved URS baseline, holds that baseline's requirements as an immutable
snapshot, and reports per-requirement coverage across both axes — engineering
verification and formal validation. See [`NXD-055`](DECISIONS.md).

This is not from `PHASE_CLOSURE_PLAN.md`; it came out of a 2026-09-23 analysis
of the URS → Product Development handoff, which found the journey broken at one
joint and everything downstream blocked by it. The product side held no
requirements at all, so there was nothing to map, count, show coverage against
or hand to a developer. Four further steps are planned on top of it (one door
for product creation, export into the generated repo, CI coverage feedback,
then mandatory binding with change control); none is started. **Step 2 — "one
door", a `nexora:product:create` scaffolder action writing the repo, the
Catalog entity and the `products` row in one act — is now the next one**, and
two deferred items wait on it: the `Development` tab and the cross-link
between `/products` and `/data-products`.

One side effect is worth naming: the release gate's `NO_URS_BASELINE` check and
the `urs-baseline-bound` policy obligation have existed and been tested since
Phase 5, but nothing except `applySpecDraft` ever set `ursBaselineIds`, so on
the normal path they could not fire. `createProductBaseline` now inherits the
version's binding, which makes an already-written gate reachable.

Slices 0, 1, 2 and 3 of
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) are done. **Phase 4 is
closed** — `DataContract` is first-class and carries a provider-neutral
exchange definition, the two criteria the phase text names that were missing.
**Phase 5 is closed** — CI now writes release provenance into the
ProductBaseline, which was the last link in the phase's evidence chain.

A re-read of the literal exit criteria on 2026-09-22 corrected an earlier
over-count in this document. Per-namespace scoping is recorded below as
*deferred, not part of Phase 2*; GP-7 is a component registry, not the
"hard-coded domain composition" Phase 3 names; and Editions and Federation
appear in no phase text at all — they are Wave 3, post-plan. Counting those
against phases made five phases look open when three were. The remaining
phase-level gap is **Phase 7** (no multiple source/package providers). Phase 5's
gap — CI does not write baseline evidence — was closed by closure Slice 3.

The gate went red after the 2026-09-21 evening commits — 50 type errors, 9 lint
errors and 5 failing suites — and was **restored to green on 2026-09-22**. See
`## Test Status`.

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

**Phase 3 exit criteria are met:** generic Golden Path resolution, AI provider
abstraction, product generation (AI spec + catalog loader + owner), development
context (config summary), repository scaffolding (2 Golden Paths linked), and
the Hardcoded Domain Inventory reduced from 8 items to 2 (GP-7 waits on Phase
4, GP-8 waits on Phase 4/6).

**Phase 4 exit criteria are met:** DataContract is first-class (name, owner,
uniqueness); ProductDependency exists; initial lineage graph computable; contract
compatibility evaluation in platform-common; Data Quality contracts in the model.

**Phase 5 exit criteria are met:** CI evidence → ProductBaseline → ValidationContext
→ IQ/OQ/UAT/optional PQ → evidence → findings/retest → independent review →
Validation Decision → Release Gate. All links in the chain are implemented and
testable. See NXD-036, NXD-037.

**Phase 5 closed.** See above.

**Phase 6 closed.**

**Phase 7 exit criteria met:** external publishers, vendor Artifacts, publisher trust/certification,
per-namespace scoping (partial), entitlements verdrahtet, commercial marketplace trust badges.

**Off-plan work (2026-09-22).** Two commits that are not closure slices and
close no phase gap. Recorded here because `STATUS.md` had fallen behind them —
both wrote to `DECISIONS.md` and neither wrote here, which is DoD point 3 of
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) slipping. They were the right
work to interrupt for: `ab8d681` fixed a defect that was silently discarding
role changes and audit records in every container deployment.

- **`ab8d681` — users, roles and the audit trail live in the database.** See
  [`NXD-051`](DECISIONS.md). User records were kept in
  `catalog/users.seed.yaml` and rewritten in place, with the audit trail in
  JSONL files beside it; both paths resolved against `process.cwd()`, which
  differs between the dev server and the image. In a container the plugin
  wrote `/catalog/users.seed.yaml` while the catalog read
  `/app/catalog/users.seed.yaml` — **a role assignment had no effect** — and
  neither path was on a persistent volume, so **every role change and every
  audit record died with the container**. For a platform whose validation
  story rests on attributability that is not a deferrable defect.

  Records now live in `platform_users`, `user_audit_events` and
  `user_sign_in_events`, owned by `users-backend` through
  `coreServices.database`. `knex@^3.0.0` was added to that package — the same
  version three sibling plugins already declare and already in `yarn.lock`, so
  no new dependency entered the repository. The seed runs **once, against an
  empty table** (the `urs-composer-backend` pattern), so a restart never
  rewrites a role an administrator changed, and under
  `auth.environment: production` it installs only `users.bootstrapAdmin`
  rather than the eight committed demo accounts — two of which hold
  `platform-admins` and, because the seed never runs again, would have stayed.

  The Catalog reads `catalog/runtime/platform-users.yaml`, a projection
  rewritten *from* the database and never into it. An entity provider would be
  tidier but is registered through `catalogProcessingExtensionPoint`, and an
  extension point may only be consumed by a module of that plugin — which
  would then receive the catalog's database, not this one's.

- **`f39d801` — URS authoring is a governance tier plus an assignable role.**
  See [`NXD-050`](DECISIONS.md). Two axes, granted and audited separately: the
  platform tier (`urs.create` restated on DATA_PRODUCT_OWNER, added to
  BUSINESS_CAPABILITY_LEAD) and the URS domain groups (`urs-authors`,
  `urs-owners`, `urs-business-reviewers`, `urs-product-managers`,
  `urs-quality-reviewers`) applied on top by `decidePermission`. A developer
  authors requirements by holding `urs-authors`, not by being a developer.

  Collapsing the two into the tier would have removed `urs-quality-reviewers`
  and with it `urs.sign` — a 21 CFR Part 11 signature — and the separation
  between whoever writes a requirement and whoever approves it.
  BUSINESS_CAPABILITY_LEAD was also corrected: it ranks above DEVELOPER but
  inherited from VIEWER, so it held fewer rights than the tier below it.

  **No test pinned any of this** — removing `urs.create` from DEVELOPER left
  all 1822 tests green. The rules are now asserted directly.

**Phase-closure plan (2026-09-22 →).** Slices from
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md), newest first.

- **Follow-up to Slice 3 — the last three cross-plugin clients work.** See
  [`NXD-054`](DECISIONS.md). `urs-baseline-resolver`,
  `catalog-component-loader` and `validation-decision-resolver` now pass
  `auth.getOwnServiceCredentials()` instead of `{} as never`, and every
  silent failure path logs.

  **The characterisation in [`NXD-053`](DECISIONS.md) was wrong for two of the
  three and is corrected.** Only the catalog loader failed *open*. The URS and
  ValidationDecision resolvers fail **closed** — a failed call becomes a
  `NO_APPROVED_URS_BASELINE` or `NO_APPROVED_VALIDATION_DECISION` blocker. So
  they were not letting bad releases through; they were **blocking good ones**,
  reporting an approved baseline as unapproved and naming the product for a
  fault in the platform. No release was wrongly permitted by these two.

  **Fixing the clients was not enough.** Both target plugins authorize reads
  with `allow: ['user'], allowLimitedAccess: true`, which admits a forwarded
  limited *user* token but not a service principal — so a correctly minted
  token would still have been refused. Five read routes now use an
  `authorizeReadOrService` helper: `GET /baselines/:id`,
  `/requirement-sets/:id`, `/requirement-versions/:id`, `/contexts` and
  `/contexts/:id/decision`. Nothing writable was opened; recording a
  ValidationDecision is still PLATFORM_ADMIN with SoD intact.

  Service identity is the right answer rather than forwarding the caller's:
  whether a baseline is approved is a fact about a controlled record and must
  not vary with the URS permissions of whoever opened the page.

  **A second defect in the validation resolver.** `GET /contexts` answers
  `{ items: [...] }`; the client read it as a bare array, so `.find` threw on
  every call and `hasApprovedDecision` could never return `true` even with
  auth fixed. Both shapes are accepted now.

  `getOwnServiceCredentials` is **required, not optional**, so a mock that
  omits it fails to compile — the old signature let production pass `{}` while
  the mock passed nothing, which is why no test could have caught this.
  `crossPluginAuth.test.ts` adds 10 tests that assert the call *shape* rather
  than the parsed response.

  Verified live: all five routes accept a service principal (404 "Baseline not
  found", 200 `{"items":[]}` — not 401); the gate reported
  `NO_APPROVED_URS_BASELINE: … (HTTP 404)`, the real answer reached with a
  minted token; the log shows 2 authenticated requests to `urs-composer` and 3
  to `validation-expert`, **0 token-minting failures and 0 401/403**.
  **The APPROVED branch was not executed live** — producing an approved URS
  baseline needs several identities under SoD and local guest auth supplies
  one. That branch is covered by unit test only, and is the one step of the
  chain still unproven in the application.

- **Slice 3 — CI evidence reaches the ProductBaseline. Phase 5 closed.** See
  [`NXD-052`](DECISIONS.md). `POST /baselines/:id/provenance` records
  `releaseCommitSha`, `artifactDigest` and `provenanceTimestamp` on the
  baseline, written by the release build rather than typed by a human, and
  `.github/workflows/ci.yml` posts them after `docker/build-push-action`
  succeeds on `main`.

  Four things the slice had to decide, each recorded in `NXD-052`:

  - **Provenance is not part of the checksummed snapshot.** `snapshot`
    carries a `_provenance.snapshotChecksum` from `P-EXT-S1` that covers its
    own canonical JSON; writing CI evidence into it after the fact would
    invalidate the checksum the block exists to provide. The three fields are
    new columns on `product_baselines` instead, so the tamper-evidence of the
    snapshot and the provenance of the build stay separable.
  - **Write-once, not editable.** A second post with identical values is a
    200 (CI retries and re-runs are normal); a second post with *different*
    values is a 409. Release provenance is an attestation about a build that
    happened, so the platform records it or refuses it — it never overwrites
    one SHA with another.
  - **The audit event goes to `composer_audit_events`, not
    `user_audit_events`.** The latter belongs to `users-backend`, lives in
    that plugin's own `coreServices.database`, and carries a user/role schema
    (`actor`/`action`/`entity`). Writing into it from the Composer is the
    direct cross-plugin private-database access `AGENTS.md` forbids, and it is
    not reachable from this plugin's connection in any case. The Composer's
    own append-only trail already records `PRODUCT_BASELINE` events; the new
    one is `PROVENANCE_RECORDED`.
  - **CI authenticates as a service, not as a user.** The route is the first
    in the repository to accept `httpAuth.credentials(req, { allow:
    ['service'] })`, backed by Backstage's own
    `backend.auth.externalAccess` static-token mechanism. No new credential
    type and no new dependency — the mechanism was always there, unused.

  The gate learns `MISSING_CI_PROVENANCE`: a distinct blocker code rather
  than the generic `POLICY_OBLIGATION_UNMET`, because the remedy is not
  "fill in a field" but "run the release build". It fires only when the
  product declares a policy carrying the new `ci-provenance-recorded`
  obligation, so products that do not ask for build provenance are unaffected.

  **The CI step cannot fail the build.** It runs `continue-on-error` against a
  best-effort `curl`: a Composer that is unreachable from the runner must not
  turn a good build red. The absence then shows up at the release gate, where
  a human is already looking, which is the same fail-visible-not-fail-loud
  placement `5-R1` chose for policy resolution.

  **Executing the path found four defects that every test passed** — see
  [`NXD-053`](DECISIONS.md). None was introduced here; all four were in code
  already marked done, and all four share one shape: the unit tests exercise
  the modules directly, so nothing had ever gone through the wiring. The
  release gate answered 500 for *every* product because
  `platform-policy.ts` and `platform-policy.json` shared a basename and the
  backend resolved the JSON; `POST /policies/resolve` answered 500 on a
  dynamic `import()` that destructured to `undefined` under CJS; that route
  then rejected its only caller by admitting `user` credentials when the
  Composer calls it with a plugin token; and the Composer never sent the
  request at all, because its client passed `{} as never` as `onBehalfOf` and
  swallowed the resulting throw into a silent fail-open.

  Taken together this means **Phase 5's terminal control had never executed in
  the application**, and `5-R1`'s Policy Pack enforcement has reported nothing
  since it landed, while reading as a pass. Every fail-open return in the
  policy client now logs why.

  **Three sibling clients carried the same `onBehalfOf` defect. Closed —
  see [`NXD-054`](DECISIONS.md) and the entry below.**

  Verified live, not only in tests. Blocker list before the build:
  `INVALID_STATUS, INCOMPLETE_TRACEABILITY, POLICY_OBLIGATION_UNMET ×4,
  MISSING_CI_PROVENANCE, NO_URS_BASELINE`. After CI posted: the same list
  without `MISSING_CI_PROVENANCE`. A user token on the route is refused 403,
  a re-post of the same build returns 200 with an unchanged timestamp, a
  different build is refused 409, and a malformed SHA is refused 400.

- **Slice 2 — provider-neutral exchange definitions. Phase 4 closed.** See
  [`NXD-049`](DECISIONS.md). `DataContract.exchange` carries
  `deliveryMechanism`, `endpoint`, `accessMode`, `classification` and `sla`.
  The mechanism is an **open vocabulary** — validated for shape, never for
  membership in a list — because `ProductComponent.interfaceType` is a closed
  enum and the strategy makes exchange technologies providers, not Core domain
  truth. `s3-parquet` works today with no platform change. `accessMode` is
  closed (`OPEN | REQUEST | ENTITLEMENT`) and defaults to `REQUEST`, since an
  unstated access rule should not read as "help yourself".

  A new `exchange-declared` release-gate obligation blocks when *any* output
  contract lacks a mechanism.

  Exercising it exposed a defect that made the whole of 5-R1 inert:
  **`createProduct` never mapped `declaredPolicies`** from the request,
  although the request type declares it and the column exists. The gate only
  resolves Policy Packs when that field is non-empty, so for every
  API-created product it resolved nothing and reported nothing — and looked
  like a pass. Fixed here.

- **Slice 1 — `DataContract` is identified by its coordinate.** See
  [`NXD-048`](DECISIONS.md). Identity moves from
  `(product_component_id, lower(name))` to `namespace/name@version`;
  `product_component_id` becomes the relation to the providing component.
  `GET /contracts/resolve?ref=…` resolves a contract without the caller knowing
  which component — or which Product — declares it. The coordinate grammar is
  the Artifact one, reused: `isArtifactSegment` now delegates to a single
  `isNameSegment` in `product.ts`, so the two cannot drift.

  Names tighten from free text to lowercase kebab-case, and the migration
  refuses rather than guesses — it stops on an unnamed contract, a name that is
  not a segment, or two rows that would collide, listing every offender at
  once. Promoted rows land in a `legacy` namespace rather than one derived from
  the Product name, because Product names are free text and slugifying two of
  them can produce one segment.

  The executed path found a defect no test had: `/contracts/resolve` against an
  absent coordinate answered **500**, because `respondError` had no
  `NotFoundError` branch. Fixed, and the service tests now assert error types
  rather than only messages, since the router maps by instance check and this
  plugin has no router harness.

- **Slice 0 — the record made trustworthy.** See
  [`NXD-043`](DECISIONS.md)–[`NXD-047`](DECISIONS.md). Four image names for one
  artifact reduced to the one production already publishes
  (`data-product-platform`); `platform-core:1.0-rc2` deliberately untouched
  because formal validation records carry it as the validated product
  candidate. `DECISIONS.md` backfilled for Wave 1 and the remediation series —
  about twenty commits that had produced two decision records between them,
  including that policy resolution fails *open* and why. GP-8 struck from
  `HARDCODED_DOMAIN_INVENTORY.md`, leaving GP-7 as the only open row.

**Post-plan strategy work (2026-09-21, 16:22–19:00).** Everything below down to
the Docker entry landed after Phase 7 closed and is not part of the eight-phase
plan. `DECISIONS.md` records this work only as far as
[`NXD-042`](DECISIONS.md) (Wave 3); the remediation series that follows it has
no decision records yet.

- **Review items 1–9 — post-implementation review fixes.** A numbered review of
  the Wave 3 and remediation work; all nine closed across five commits
  (`2fc06a3`, `124ff36`, `4835e4c`, `e226bb7`, `beeab2a`). The list itself was
  never written to the repository, so only the commits record it.
  - Policy obligations were surfaced wholesale as blockers instead of being
    evaluated. `checkReleaseGate` now maps all nine checks of
    `gxp-data-product-policy.yaml` onto real product data
    (`product-owner-set` → `product.owner`, `urs-baseline-bound` →
    `approvedBaseline.ursBaselineIds`, `quality-checks-declared` → any
    `QualityRule`, …). `appliesTo` scoping is honoured: `all` always,
    `gxp` only when `gxpRelevance` is set and not `NONE`, `commercial` only
    when `declaredPolicies` is non-empty. An unknown check id raises
    `POLICY_OBLIGATION_UNMET` rather than passing silently — the same
    fail-loud principle as `platform-policy.ts`.
  - `ArtifactManifest.spec.policyDocument` is typed with `obligations[]`;
    `policyResolver.ts` reads the typed field instead of a duplicated inline
    type.
  - `GET /artifacts?includeVersions=true&includeFederated=true` merges remote
    registries into the local list, local coordinates winning. The Marketplace
    query passes the flag.
  - `schema_snapshots` persists the A-2 workflow (below).
  - `bootstrapPlatformProduct` wrote lifecycle `'production'`, which is not a
    member of the `ProductLifecycle` union — corrected to `'PRODUCTION'`.
  - `ConfigSummary` renders a `SECRET` badge for `type: 'secret'` keys and
    shows each key's description inline. Keys without schema metadata are
    unaffected.
  - The SSE client map moved off the `(service as any).__sseClients` property
    bag onto a real `ComposerService` field injected through
    `ComposerServiceOptions`. The router reads `service.sseClients` with no
    cast.
  - `packages/nexora-industrial-vocab` gained 39 unit tests (376 lines) over
    the annotation keys, the four parse helpers and their fallback paths,
    `entityRefOf`/`entityNameFromRef`, the two entity predicates, the
    converters, the filters, `groupAssetsByHierarchy` and
    `relatedDataProducts`.

- **GP-8 closed — `nexora-industrial.ts` is a 9-line shim.** The last and
  largest item of the hard-coded domain inventory. All 62 exports
  (`NEXORA_ANNOTATIONS`, `DataProductHealth`, `ConnectivityInterface`,
  `EquipmentStateView`, `MetricValue`, `CapabilityGroup`, the parse helpers)
  now live in `packages/nexora-industrial-vocab/src/index.ts` (598 lines), and
  `platform-common/src/nexora-industrial.ts` is nothing but
  `export * from '@internal/nexora-industrial-vocab'` under a `@deprecated`
  notice. No consumer import changed. The dependency direction is
  vocab → platform-common for `CatalogEntityLike`, platform-common → vocab for
  the shim re-export. **Core is domain-neutral.** Landed in two steps: `7-R1`
  created the package as a pure re-export so consumers could migrate
  incrementally, `b3fc357` moved the content and reversed the direction.

  This move is the source of 16 of the 50 open typecheck errors: the extracted
  file uses `CatalogEntityLike` in nine signatures without importing it.

- **5-R1 / 7-R4 — Policy Packs are enforced by the Release Gate.**
  `nexora/gxp-data-product-policy@1.0.0` exists as a `POLICY_PACK` Artifact
  (`catalog/artifacts/nexora/gxp-data-product-policy.yaml`) with 8 obligations
  across Product Identity, Validation Evidence, Data Handling and Quality,
  derived from FDA 21 CFR Part 11, EU Annex 11 and GAMP 5, distributed with the
  life-sciences edition. `Product.declaredPolicies` (nullable
  `declared_policies` TEXT column, JSON array of coordinates) records which
  packs a product claims. `checkReleaseGate` resolves them through an injected
  `policyResolverClient` and raises `POLICY_PACK_UNRESOLVABLE` or
  `POLICY_OBLIGATION_UNMET`. `createHttpPolicyResolverClient` follows the same
  cross-plugin HTTP pattern as `UrsBaselineResolver` and
  `ValidationDecisionResolver`, and **fails open** — an unreachable resolver
  returns null and does not block a release.

- **6-R1..R3 — Consumer experience.**
  R1: all 8 component profiles carry a typed `configurationSchema[]`
  (`health`, `observability`, `rest-api`, `rest-source`, `mqtt-consumer`,
  `timeseries`, `aas-foundation`, `unified-namespace`). Each key has type,
  `required`, description, default and example; `type: 'secret'` marks
  `SOURCE_API_TOKEN`, `MQTT_PASSWORD` and `UNS_MQTT_PASSWORD` as never-log,
  never-display. The legacy flat `configurationKeys[]` stays for
  backward compatibility and `compositionConfigSummary` prefers the schema.
  R2: `GET /subscribe/notifications?consumer=X` is a Server-Sent Events stream
  pushed by `dispatchUpgradeNotifications`, so consumers no longer poll. Built
  on Express alone — no new dependency. 30s heartbeat and
  `X-Accel-Buffering: no` keep it alive through nginx. Polling via
  `GET /notifications` remains the fallback for missed pushes.
  R3: `LineageDAGView.tsx` is an interactive SVG graph — rank-based layout,
  Bezier edges with arrowheads, drag-to-pan, hover states — replacing the
  column layout. Again no charting library.

- **7-R2/R3/R5/R6 — Ecosystem.**
  R2: `createFederationClient` fans `GET /artifacts` out to every enabled
  remote registry via `Promise.allSettled`, so one unreachable peer cannot
  block the rest. Namespace whitelisting, 15s `AbortSignal.timeout` per peer,
  trust enrichment from `registry.defaultTrustLevel`, and
  `loadFederationConfig()` reading `artifactRegistry.federation` from
  app-config.
  R3: `PATCH /publishers/:id/promote` (PLATFORM_ADMIN only) completes the
  self-registration → COMMUNITY → review → PARTNER path opened by `P-EXT-S2`.
  Both `trust_level` and `member_groups` are nullable, so pre-Phase-7 rows are
  untouched.
  R5: `PRODUCT_TYPES` gains `PLATFORM_PRODUCT`, and `bootstrapPlatformProduct()`
  registers `nexora-core` on plugin init — idempotent, non-fatal, declaring
  `nexora/gxp-data-product-policy@1.0.0`. Nexora is now a managed Product of
  the platform it provides, closing the "Nexora manages Nexora" principle
  that `W3-3` set up on the catalog side.
  R6: all 8 scaffolder templates now ship `agent-instructions.md` — controlled
  artefacts (`nexora.yaml`, `composition.yaml`, `urs.yaml`, `contracts/`,
  `dataprod/`) versus free implementation space (`app/`, `tests/`,
  `Dockerfile`), requirements traceability, contract obligations, security
  rules and AI autonomy limits.

- **A-2 / A-3 — Drift detection and federation sync.**
  A-2: `detectSchemaDrift(baseline, current, version)` in
  `contract-compatibility.ts` compares two `SchemaSnapshot`s through
  `evaluateContractCompatibility`. The `schema_snapshots` table and
  `captureSchemaSnapshot(contractId, actor)` make it operational:
  `POST /contracts/:id/snapshot` captures and, when a previous snapshot
  exists, returns a `driftResult` in the same response;
  `GET /contracts/:id/snapshots` lists them. A `BREAKING_CHANGE` status is
  the trigger for notifying subscribers.
  A-3: the artifact-registry plugin reads the federation config at startup and
  runs an initial fan-out plus a `setInterval` sync, logging artifact and
  unreachable-registry counts. Best-effort: a scheduler failure does not stop
  plugin startup. **This is an in-process interval, not a durable job** — a
  real cron (pg-boss or the Backstage scheduler) is the intended upgrade.

- **W3-1..8 — Wave 3.** See [`NXD-042`](DECISIONS.md).
  W3-1: `getFullLineageDAG(versionId, maxDepth)` — BFS to N hops with cycle
  detection, `GET /versions/:id/lineage/dag?depth=N` (max 10).
  W3-2: `nexora-industrial.ts` marked `@deprecated` with a migration plan
  (superseded by the GP-8 closure above).
  W3-3: `catalog/nexora-core-product.yaml` registers the platform as a
  Backstage Component and as the `nexora/nexora-core` DATA_PRODUCT Artifact.
  W3-4: first `LineageDAGView.tsx`, column layout (superseded by `6-R3`).
  W3-5: `agent-instructions.md` in the first 5 templates (completed by `7-R6`).
  W3-6: `policyResolver.ts` — `resolvePolicies(refs, service)` fetches
  POLICY_PACK manifests, returns their obligations and surfaces unresolved
  refs. Route `POST /artifact-registry/policies/resolve`.
  W3-7: `registry-federation.ts` types (`FederatedRegistry`,
  `FederatedArtifact`, `FederatedSearchResult`, `FederationConfig`) — the
  contract the `7-R2` client implements.
  W3-8: `catalog/editions.yaml` — four editions (`nexora-core`,
  `nexora-life-sciences`, `nexora-manufacturing`, `nexora-enterprise`) with an
  `extends` hierarchy, typed as `PlatformEdition` / `EditionCatalogue`. Adding
  an edition needs no Core change.
  Reported 440 tests, 0 failures at the time of the commit.

- **W2-1..4 — Wave 2.** See [`NXD-041`](DECISIONS.md).
  W2-1: `upgrade_notifications` table plus `dispatchUpgradeNotifications`
  (one record per active subscriber), `POST /contracts/:id/notify`,
  `GET /notifications`, `PATCH /notifications/:id/read`. Producer announces,
  consumers poll — the push path arrived later as `6-R2`.
  W2-2: `ConfigKeySchema { key, description, type, required, defaultValue,
  example }` with `ConfigKeyType` of `string|number|boolean|url|secret`;
  `ComponentLibraryProfile.configurationSchema?` supersedes the flat key list.
  W2-3: `GET /versions/:id/revalidation-scope` diffs the current version
  against the previous approved baseline and returns added/removed components
  and contracts plus a recommendation ("Full IQ and targeted OQ/UAT for changed
  components" / "Regression test only" / "First baseline"). Null when no
  approved baseline exists.
  W2-4: `spec.policies?` (exact-version Policy Pack coordinates, validated as
  `namespace/name@exact-version`) and `spec.requirements?` (URS requirement
  IDs) in the Artifact manifest. Closes section 7 of the product strategy.
  Reported 280 tests, 0 failures.

- **P-EXT-S1..S5 — Wave 1.** No `NXD` record was written for this wave.
  S1: `ProductBaseline.snapshot` gains a `_provenance` block
  (`snapshotChecksum` as `sha256:hex`, `snapshotTimestamp`, `createdBy`); the
  audit event carries the checksum so tampering is detectable.
  S2: `POST /publishers/self-register` lets a DEVELOPER register a COMMUNITY
  external publisher and adds the registrant to `memberGroups` — the first
  read path for the `memberGroups` field that `NXD-014` recorded as written
  but unread.
  S3: change impact analysis — `GET /contracts/:id/impact` and
  `GET /impact/artifact?name=`, one hop over direct `ProductDependency` links.
  S4: `ContractSubscription` and the `contract_subscriptions` table (unique per
  contract + consumer), with subscribe, list-by-contract, list-mine and
  `ACTIVE|PAUSED|CANCELLED` status transitions.
  S5: the `UpgradeNotification` type (`CONTRACT_VERSION_BUMP`,
  `ARTIFACT_VERSION_BUMP`, `BREAKING_CHANGE`, `DEPRECATION`,
  `SECURITY_UPDATE`), persisted a wave later by `W2-1`.
  Reported 121 tests, 0 failures.

- **Docker: the platform runs as an image.** `docker-compose.yml` offers a
  single-container mode (`docker compose up nexora`, backend on 7007 serving
  the built frontend — the production pattern, no CORS) and a split mode
  (`--profile split`, nginx on 3000 proxying `/api/*`, `/.backstage/*`,
  `/oauth2/*` and the SSE route to the backend), both against PostgreSQL 16 on
  the `nexora_db` volume. Four fixes were needed to make the image build:
  `scripts/link-internal-packages.js` had to be copied *before*
  `yarn workspaces focus --all --production` (its postinstall runs during that
  step), the script early-exits on `NODE_ENV=production` as a second guard,
  `model-company/` was missing from the `COPY` list although the plugin reads
  its YAML at startup, and `app-config.docker-local.yaml` was added as a
  guest-only overlay so local runs need no GitHub credentials.

- **P7-S1..S5 — Phase 7.** See [`NXD-039`](DECISIONS.md), [`NXD-040`](DECISIONS.md).
  S1: Publisher `trustLevel` (INTERNAL/PARTNER/COMMUNITY) + `externalPublisher` flag + DB migration.
  S2: Per-namespace permission scoping — `certify`/`publish` check actor in `publisher.memberGroups`. Partial NXD-014 closure.
  S3: `MarketplaceOfferingView` + `listArtifactsWithVersions` carry publisher trust data.
  S4: `MarketplaceItem.publisherTrustLevel/externalPublisher`; Marketplace table shows "Publisher" column with `✓ Partner` / `⚠ Community` trust badges.
  S5: Marketplace detail page shows trust disclaimer for Community publishers and certification note for Partners. Entitlements fully integrated (PENDING_ACCESS, NOT_ENTITLED, ENTITLED flows already existed; trust context added).

- **P6-S1..S6 — Phase 6.** See [`NXD-038`](DECISIONS.md).
  S1: `AnalyticsProvider` model + catalog annotation `dataprod.platform/analytics-providers` + OverviewTab panel.
  S2: Governed AI Data Analyst — `POST /api/composer/ai/analyze-product`;
  governance-bounded system prompt prevents data fabrication or false validation claims.
  S3: Safe Data Preview row cap (100 rows); `preview: true` flag.
  S4: `DependencyCard` — "Used By" and "Depends On" are navigable links to product detail pages.
  S5: Usage Recording — `GET /consume/usage/:entityRef` returns access stats; access is recorded on each product view.
  S6: Live Quality Health — `QualityTab` shows live `DataProductHealth` checks from `nexoraDataQualityApiRef` alongside declared annotation metadata (Runtime Health vs. Data Health distinction).

- **P5-S2..S5 — Phase 5 completion.**
  S2: SoD on APPROVED transition — version author cannot approve own work.
  S3: HTTP `ValidationDecisionResolver` wired in `plugin.ts`; the release gate
  check is now exercised in production, not just in tests.
  S4: `ProtocolType` gains `'PQ'` (optional); `parsePqProtocol` returns `[]`
  when no PQ protocol file exists.
  S5: `ProductBaseline.snapshot` now includes `releaseCommitSha`,
  `artifactDigest`, contract `name`, and declared `dependencies` (contractIds
  at baseline time). See [`NXD-037`](DECISIONS.md).

- **P5-S1 — Validation Decision step, SoD, release gate integration.**
  `ValidationDecision { id, contextId, status, justification, conditions, decidedBy, decidedAt }`
  is the terminal step of the validation lifecycle. `validation.approve` is
  enabled for `PLATFORM_ADMIN` only. Service enforces Segregation of Duties
  (decider ≠ context creator) and one-decision-per-context invariant.
  Routes: `POST /contexts/:id/decision`, `GET /contexts/:id/decision`.
  `ValidationDecisionResolver` interface is injected into `ComposerService`;
  `checkReleaseGate` adds `NO_APPROVED_VALIDATION_DECISION` blocker when the
  resolver reports no APPROVED decision. 11 tests (9 decision invariants + 2
  release gate). `risk.accept` and `baseline.modify` remain reserved.
  See [`NXD-036`](DECISIONS.md).

- **P4-S6 — Data Quality contracts: declarative quality rules in DataContract.**
  `QualityRule` and `QualityRuleType` are added to `platform-common/src/product.ts`.
  Supported rule types: `completeness`, `uniqueness`, `range`, `regex` — matching
  the Python SDK's `run_check` / `unique_field_check` vocabulary.
  `DataContract.qualityRules: QualityRule[]` is stored as JSON in a new
  `quality_rules` column (nullable migration, safe on existing DBs). The service
  validates rule names, types and fields at creation time. 4 new tests.

- **P4-S5 — Contract compatibility in platform-common + API endpoint.**

- **P4-S4 — Initial data lineage graph.** `GET /versions/:id/lineage` returns
  one-hop upstream (what this version consumes) and downstream (who consumes this
  version's contracts), traced through ProductDependency + DataContract →
  ProductComponent → ProductVersion → Product. 3 tests.

- **P4-S3 — ProductDependency domain model and API.**

- **P4-S2 — Contract GET endpoints.**

- **P4-S1 — DataContract identity: name, owner, uniqueness.** `DataContract`
  gains `name: string` (required, trimmed) and `owner?: string`. DB migration
  adds both columns as nullable (existing rows unaffected) and a unique index on
  `(product_component_id, lower(name))`. The service enforces name presence and
  case-insensitive uniqueness per component via `findDataContractByName`. 16
  tests (5 new identity cases + 11 pre-existing validation cases). See
  [`NXD-034`](DECISIONS.md).

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
Nothing in flight. Batch 1 is committed (`b7378b0`) and the live walk that
followed it is recorded in [`NXD-059`](DECISIONS.md).

**Open from the walk, in the order they matter** — none of these is fixed:

1. ~~**Approval order is not enforced.**~~ **Closed 2026-09-25** — a step is
   refused while any required step with a lower `sequence` is still open, and
   the refusal names the blocker. Only required steps block.
2. ~~**A Product baseline can be approved by whoever created it.**~~
   **Closed 2026-09-25** — the rule P5-S2 put on the version transition now
   covers the baseline too.
3. Approval steps carry no `stepNumber` over the API, so no client can number
   the chain.
4. Three refusals answer 500 instead of 409/400: re-approving an approved step,
   binding an unapproved URS baseline, and (before the walk) the product
   governance vocabulary.
5. An unknown requirement-set id answers 200 with an empty list on two routes
   and 404 on a third, which also disagree about which identifier they take.

Next planned step is unchanged: **Step 2 — "one door"**, a
`nexora:product:create` scaffolder action writing the repo, the Catalog entity
and the `products` row in one act.

## Next
**Sequencing now lives in [`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md)**
(written 2026-09-22). A code audit for that plan found four phases still open
against `IMPLEMENTATION_PLAN.md` — 2, 3, 4 and 7 — and that the entries below
understated Phase 4 in particular: `DataContract` was never promoted to a
first-class namespace despite `product.ts:192` saying a later slice would do
it, and provider-neutral exchange definitions do not exist at all. Phase 5's
CI-evidence chain is also not automated. The nine slices, their order and the
Definition of Done are in that document; the notes below remain accurate as
context.

**0 — `addProductComponent` does not check the version status.** The service
(`plugins/composer-backend/src/service.ts:351`) will add a component to a
`RELEASED` version. NXD-056's slice closed this in the UI — the form refuses
outside `DRAFT` and says why — but a UI refusal is not a platform rule, and an
API client can still change the architecture of a released version. The guard
belongs next to the one `bindUrsBaseline` already has.

**1 — ~~Restore the green gate.~~ Done 2026-09-22.** All four gates pass again;
see `## Test Status` for what was wrong and what each fix was. One item was
left deliberately open: `build-image` tags `pharma-data-factory:mvp-1.0` while
`docker-compose.yml` tags `nexora:latest`, so two product names are live at
once. `brandSeparation.test.ts` now accepts either and says so in a comment.
**Pick one name and tighten the assertion back to it.**

**2 — `DECISIONS.md` stops at [`NXD-042`](DECISIONS.md).** Wave 1
(`P-EXT-S1..S5`) never got a record, and neither did the whole remediation
series — `5-R1` (fail-open policy resolution in the release gate), `7-R5`
(`PLATFORM_PRODUCT` as a product type) and `A-3` (an in-process interval chosen
over a durable job) are architecture decisions that currently exist only as
commit messages.

**3 — `A-3`'s scheduler is an in-process `setInterval`.** It dies with the
process, runs once per replica, and has no retry or backoff. A durable job
(pg-boss or the Backstage scheduler) is the intended upgrade and was named as
such when it landed.

**4 — Re-audit what Phase 3 still owes.** The previous text here listed
dependency and compatibility resolution, configuration schemas, Product
generation, Development Context and AI provider abstraction as "none of which
exists". That is now wrong in four places: dependency and compatibility
resolution landed in `P4-S3`/`P4-S5`, configuration schemas in `W2-2`/`6-R1`,
Development Context in `P3-S8`, and the AI provider abstraction is partial
after `P3-S4` (OpenAI and Anthropic clients behind `ComposerLLMClient`). What
genuinely remains needs a fresh look at the code rather than a copy of the old
list.

GP-8 is **closed** — see the Completed entry. That leaves **GP-7** as the only
open row in `HARDCODED_DOMAIN_INVENTORY.md`: `RUNTIME_PACKAGE_*` and
`CATALOG_ONLY_COMPONENT_NAMES` in `platform-component-library.ts` are still a
fixed component registry in Core, rated Medium. The inventory table itself has
not been updated for the GP-8 closure and still shows the row as open.

Deferred, not part of Phase 2: **per-namespace permission scoping.** The eight
registry permissions are platform-wide, so a DATA_PRODUCT_OWNER may certify in
any namespace, not only their own.

> Partly overtaken by events. `Publisher.memberGroups` is no longer write-only:
> `P7-S2` reads it in the `certify` and `publish` checks, `P-EXT-S2` seeds it
> with the self-registrant, and `7-R3` added the update path
> (`PATCH /publishers/:id/promote`). What remains open is the list-filtering
> problem described below, not the missing plumbing.

Closing the rest still needs ground the repository has never used: all eight
permissions are
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
**GREEN.** Verified on 2026-09-25 the way CI runs it (`CI=true`, PostgreSQL up
via `docker-compose.test.yml`), after the walk fixes.

| Gate | Command | Result |
| --- | --- | --- |
| Guardrails | `yarn guard:platform` | PASS (9 pass, 9 documented warnings, 0 fail) |
| Typecheck | `yarn tsc` | PASS |
| Lint | `yarn lint:all` | PASS |
| Unit tests | `CI=true yarn test` | PASS — 222 suites, 1961 tests, **0 skipped** |

Eight suites are new today: the governance vocabulary, the product update path,
release-gate progress, the approval-workflow seed in both persistence modes, the
approval-instance column, the review chain, the guest role, and the transaction
boundary. Batch 1 alone measured 221 suites / 1958 tests; the 2026-09-24 figures
were 215 and 1909.

**The gate did not catch the defect that mattered most today**, and it is worth
being plain about why. Signing a requirement version was impossible on a real
connection pool for as long as the feature has existed, and every suite passed
throughout, because they drive the service with an in-memory repository and a
stub catalog where the two offending calls cost nothing. See
[`NXD-059`](DECISIONS.md). `transactionBoundary.test.ts` now pins the ordering
rather than the symptom, and was mutation-checked against the fix.

### The 2026-09-24 flake — NXD-016 regressed in Slice 1a, now fixed

`Slice 1a › enforces one row per pinned requirement version in the database`
failed three full-repository runs in eight, always on the same assertion, and
passed everywhere else: 25 consecutive runs of the file alone under CPU load,
nine runs of `yarn test plugins/composer-backend` including `--maxWorkers=12`,
and serially. The "green at 214 suites / 1903 tests" recorded on 2026-09-23 was
therefore a run that happened to pass.

**The constraint always fired.** A probe capturing the rejection showed the
same `SqliteError` carrying the same message —
`UNIQUE constraint failed: product_requirements.product_version_id,
product_requirements.urs_requirement_version_id` — on every run, while
`rejection instanceof Error` flipped between `true` and `false` from run to
run. That is the mechanism [`NXD-016`](DECISIONS.md) already records:
better-sqlite3 is a native module whose binding is loaded once per worker
process, so its `SqliteError` carries the `Error` intrinsic of whichever jest
module realm loaded it first. When another project's file got there first,
`instanceof Error` reads false inside this file, and `toThrow()` reports
*"Received function did not throw"* for a rejection that did happen.

The literal message was the tell and was misread for several runs. Jest says
*"Received promise resolved instead of rejected"* when nothing is thrown. "Did
not throw" meant a value **was** thrown and was not an `Error`.

**Fix.** `expectRefusedByDatabase` — which `identityConstraints.test.ts` had
carried as a local function since NXD-016, mechanism spelled out in its doc
comment — moved to
`plugins/composer-backend/src/__testUtils__/databaseRefusal.ts`, and both
suites import it. `productRequirements.test.ts` now asserts the constraint by
name, which is a stronger claim than the bare `.rejects.toThrow()` it replaced.

The standing rule, since it did not stick the first time: **a bare
`.rejects.toThrow()` on a database-level refusal is a latent flake in this
repository.** Slice 1a introduced one days after NXD-016 explained why. The
helper is now importable, which is the only reason it will not recur.

One other suite is load-sensitive and is **not** fixed: `Plugin Directory UI ›
renders directory summary and Validation Expert entry` failed one full run on a
`waitFor` left at the 1 s default. It passes in isolation and in its project.

Slice 1a/1b added 21 tests in `productRequirements.test.ts` and a new
`ursBaselineResolver.test.ts`, and changed one existing fixture: the AI spec
draft's stub resolver returned a requirement with no stable `requirementId`,
which the new binding refuses. That was a test double predating the field, not
a behaviour the product ever had.

### The 2026-09-22 repair
Earlier the same day the gate was red: 50 type errors in 12 files, 9 lint errors
in 4 workspaces and 5 failing suites, all of it fallout from the 2026-09-21
evening commits, which were not put through steps 7–10 of the working method.
Recorded here because the causes are instructive, not just the counts.

**Type errors.** The largest cluster, 16 of the 50, was the GP-8 extraction:
`nexora-industrial-vocab/src/index.ts` used `CatalogEntityLike` in nine
signatures without importing it, and two `relation` callbacks lost their
inference with it. Fixed with one `import type` — type-only, because
platform-common re-exports this package as a shim and a value import would
close a runtime cycle. Fourteen more were Marketplace fixtures that never
gained the `publisherTrustLevel` and `externalPublisher` that `P7-S4` made
required; they now get those defaults from one `.map` rather than twelve
repetitions. The rest: `detectSchemaDrift`, `SchemaSnapshot` and
`SchemaDriftResult` were never re-exported from platform-common's index;
`SUBSCRIPTION_STATUSES` and `UPGRADE_NOTIFICATION_TYPES` are `const`s that sat
in an `export type` block, so using them as values raised TS1362;
`llm-client.ts` called two prompt builders that exist in `prompt-template.ts`
but were not imported; `getArtifactChangeImpact` called the paginated
`listProducts()` with no arguments and treated `{ items, total }` as an array;
and `DataProductDetailPage.tsx` read `.value` off a `ProviderResult`, whose
field is `data`.

**Lint.** `packages/nexora-industrial-vocab` had no `.eslintrc.js` at all —
created in `7-R1` without one, so the default parser choked on the first
`import` and the package holding all 62 vocabulary exports was silently
unlinted. It now has the same one-line config as every sibling. The rest were
two `useEffect` cleanups returning inconsistently, four nested ternaries (the
lineage node colours are now a `NodeRole` lookup table, the Marketplace trust
badge a `publisherLabel` function, the revalidation recommendation an
if/else chain), and one shadowed `components` that was a redundant second
query for a list already in scope.

**Failing suites.** Four asserted on strings in `docker-compose.yml` that
`f2d4ad5` removed when it replaced the file wholesale. Two of those were real
regressions, not stale tests, and were fixed in the compose file rather than
the test:
- **CC-001 was genuinely weakened.** The new compose mounted a named volume at
  `/app/.runtime` but called it `nexora_runtime` and dropped the explicit
  `CREATE_AUTHORIZATION_AUDIT_PATH` pin, breaking the convention that
  `docker-compose.production.yml` and `.validation.yml` both follow. The volume
  is renamed back to `create_authorization_audit` and the env var restored.
- **The "not the production image" warning was lost** — and the new file needs
  it more than the old one did, because it runs with `NODE_ENV=production`
  against `app-config.production.yaml` and so reads as production at a glance.
  Restored in the header comment.

The fifth failure was `colourTokens` catching a real violation: review item 7's
`SECRET` badge hard-coded `#b71c1c` and `#fff`. It now uses
`NEXORA_TONE.danger`.

**One assertion was deliberately relaxed rather than satisfied.**
`brandSeparation.test.ts` required `image: pharma-data-factory` in the compose
file, which now says `nexora:latest` while `build-image` still tags
`pharma-data-factory:mvp-1.0`. Both names are live; picking one is a product
decision, not a test fix. The assertion now accepts either and still rejects
`image: backstage`, which is the guarantee it actually exists to make. See
`## Next`.

### Test infrastructure notes (unchanged)

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

> **Historical snapshot, not current state.** This section records what the
> audit found at the start of the transformation and is deliberately left as
> written. Most of what it lists as missing now exists: the `Artifact` /
> `ArtifactVersion` and `Publisher` types landed in Phase 2, `ProductDependency`
> and `Subscription` in Phase 4 and `P-EXT-S4`, `DataContract` became
> first-class in `P4-S1`, and the hard-coded OEE and Machine State
> compositions were deleted across `P3-S1`–`P3-S5`. Read `## Completed` for the
> current picture.

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
- ~~`packages/nexora-industrial-vocab` has no ESLint config.~~ **Resolved
  2026-09-22**; it now carries the same `.eslintrc.js` as every sibling
  package.
- Four deployment guard tests in `packages/backend/src/` pin invariants by
  matching literal strings in `docker-compose.yml`. Replacing that file in
  `f2d4ad5` broke all four at once, and two of the four turned out to be real
  regressions hidden behind brittle assertions. String-matching a compose file
  is a poor way to state a deployment guarantee; parsing the YAML and asserting
  on the structure would survive a rewrite. Added 2026-09-22.
- Two product names are live at once: `build-image` tags
  `pharma-data-factory:mvp-1.0`, `docker-compose.yml` tags `nexora:latest`.
  `brandSeparation.test.ts` accepts both until one is chosen. Added
  2026-09-22.

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
"fix(walk): a transaction does no I/O it does not own", 2026-09-25, on
`ms/composer-ai-spec-and-ci-quality-gate`.

**No hash here, deliberately.** A commit cannot record its own id, so writing
one means either a stale value or a second commit whose only job is to name the
first — which is then itself unnamed. This entry was wrong for three days for
exactly that reason: it said `beeab2a` while HEAD was `164039f`. `git log -1`
is authoritative; this section carries the subject and the date.

As of 2026-09-25 the branch is **5 commits ahead of its remote**; the last
pushed commit is `f054b3c`. The working tree is clean.

For historical reference, Phase 0 landed as three commits: the transformation
memory, "fix(test): restore a green baseline and stop the jest resolver
collision" (P0-S1), "ci(test): run the GxP and persistence suites instead of
skipping them" (P0-S2) and the hard-coded domain inventory (P0-S3).
