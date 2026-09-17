# Nexora Transformation Status

## Current Phase
Phase 2 — Artifact Registry and Marketplace 2.0

## Current Vertical Slice
P2-S5a — Manifests on disk, loaded into the registry (**done**).

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

## In Progress
Nothing in flight.

## Next
1. **P2-S5b — Move Marketplace reads to the registry.** The content is there;
   this is the read switch and the array's retirement. One decision it cannot
   avoid: *which certification the UI shows.* The legacy claim and the
   registry's own status are two distinct facts and they disagree — three
   offerings display CERTIFIED, and none of the 12 has been through this
   registry's review, because registration deliberately cannot grant it. See
   [`NXD-019`](DECISIONS.md). Showing the legacy badge from registry-sourced
   data would launder an unearned claim through a system built to prevent
   exactly that; showing the real status changes what users see. That is a
   product call, not a technical one.

   Note also that the Marketplace is a frontend plugin and the registry is
   behind `artifact.read`, so this slice needs a client against the registry
   API, not a direct read.
2. **Sweep the blocked-port guard into the other eleven socket-binding test
   files** ([`NXD-017`](DECISIONS.md)). Small and mechanical — the same guard
   already in `artifact-registry-backend/src/router.test.ts`. Worth a shared
   test helper at that point rather than a twelfth copy. Not phase-blocking,
   but it is a live intermittent-CI source until it is done.

Deferred within Phase 2: **per-namespace permission scoping.** The eight
registry permissions are platform-wide today, so a DATA_PRODUCT_OWNER may
certify in any namespace, not only their own. `Publisher.memberGroups` is the
field a later slice resolves against — see [`NXD-014`](DECISIONS.md).

Carried into Phase 4 rather than done early: **`DataContract` identity**. A
contract is keyed to a `productComponentId` and has no name, owner or
independent version, so it cannot be referenced or versioned on its own.
Phase 4 needs the whole first-class model in one designed migration — see
[`NXD-010`](DECISIONS.md).

## Test Status
Verified on 2026-09-17, running the gate the way CI runs it (`CI=true`,
PostgreSQL up, Python toolchain installed):

| Gate | Command | Result |
| --- | --- | --- |
| Guardrails | `yarn guard:platform` | PASS (9 pass, 9 documented warnings, 0 fail) |
| Typecheck | `yarn tsc` | PASS |
| Lint | `yarn lint:all` | PASS |
| Unit tests | `yarn test` | PASS — 203 suites, 1697 tests, **0 skipped** |

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
- Legacy Marketplace is a static, hard-coded TypeScript array
  (`plugins/marketplace/src/data.ts`), not a registry. **Still true after
  P2-S4** — the array is what the UI reads. What changed is that every entry
  in it is now provably representable in the registry, so P2-S5 can switch the
  read without discovering the mapping mid-flight.
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
- **Socket test flake — root-caused 2026-09-17, fixed in one of twelve files.**
  Previously recorded here as an unreproducible failure in
  `plugins/entitlements-backend/src/router.test.ts` under parallel load. The
  mechanism is now known and it is not load at all: `fetch` refuses the Fetch
  standard's **blocked ports** (6000, 6697, 10080, …) before opening a socket,
  raising `TypeError: fetch failed` with cause `bad port`. Twelve backend test
  files bind with `app.listen(0)`, and this container's `ip_local_port_range`
  is `1024 65535` instead of the usual `32768 60999`, so the OS can hand one
  of those ports straight to a test server. Reproduced directly and on demand.
  See [`NXD-017`](DECISIONS.md).

  Fixed in `plugins/artifact-registry-backend/src/router.test.ts`, which
  rebinds when it draws a blocked port. **The other eleven files still carry
  the bug** — same four-line guard, deliberately left to a follow-up rather
  than swept into the P2-S3 commit. They are the remaining risk here.

  This also removes the stated justification for the `supertest` dependency
  request under Blocked Decisions: the flake it was meant to fix has a fix
  that needs no dependency.

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
- Legacy Marketplace data must stay until the Marketplace reads the registry
  (P2-S5b). Model parity is proven as of P2-S4
  (`plugins/marketplace/src/registryParity.test.ts`) and the registry now holds
  the twelve as of P2-S5a — but nothing *reads* them, so deleting the array
  would still empty the UI. The twelve therefore exist twice. Two suites hold
  the copies in step: `registryParity.test.ts` (array to manifest) and
  `packages/platform-common/src/artifactManifestFiles.test.ts` (the files
  themselves). Each carries the same named list of twelve ids, because the
  array lives in a frontend plugin and nothing that may read the filesystem is
  allowed to depend on one. That seam is deliberate and temporary; it is
  deleted with the array.
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
