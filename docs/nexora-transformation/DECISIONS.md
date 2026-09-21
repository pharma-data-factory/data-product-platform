# Nexora Transformation Decisions

Use this file for durable architecture decisions.

## Decision template

### NXD-XXX — Title
- Date:
- Context:
- Decision:
- Alternatives considered:
- Consequences:
- Affected components:

---

### NXD-001 — Backstage remains the platform kernel
- Date: 2026-09-15
- Context: Nexora needs identity, permissions, catalog, scaffolder, plugin runtime, search and documentation capabilities without owning platform plumbing.
- Decision: Backstage remains the technical kernel. Nexora extends it through supported public APIs, plugins, modules and extension points.
- Alternatives considered: Replace Backstage; fork Backstage; custom portal kernel.
- Consequences: Backstage upgradeability is protected and Nexora domain logic remains in owned packages/plugins.
- Affected components: all.

### NXD-002 — Producer and Consumer are capabilities
- Date: 2026-09-15
- Context: The same user/team may consume and publish.
- Decision: No global Producer/Consumer mode. Access is determined by permissions, capabilities, publisher membership, lifecycle and policy gates.
- Alternatives considered: Separate portals; global installation mode.
- Consequences: One Nexora platform and shared lifecycle.
- Affected components: identity, permissions, Marketplace, Product Studio.

### NXD-003 — AI proposes; humans govern
- Date: 2026-09-15
- Context: AI assists development and analysis but controlled approvals require accountability.
- Decision: AI may implement and propose but may not approve controlled Requirements, regulated risk, Validation or Release.
- Alternatives considered: autonomous AI approval.
- Consequences: AI provider integration remains separated from governance decision authority.
- Affected components: Product Studio, AI providers, URS, Validation, Release.

### NXD-004 — `packages/app` owns an explicit jest project id
- Date: 2026-09-16
- Context: `packages/app/src/App.test.tsx` passed when run alone and failed in
  the full repository run with `Cannot find module
  '@backstage/plugin-app-module-user-settings'`. That package ships no
  `dist/index.cjs.js` despite declaring it as `main`, so the app carries a
  `moduleNameMapper` pointing at the ESM build. The Backstage CLI derives each
  jest project's cache `id` from a hash of the Backstage version and the
  project's `transform` only (`cli-module-test-jest/config/jest.js`), so
  `packages/app` shared one id with 11 other frontend projects that have
  identical transforms. Jest keys its resolver cache on that id, so whichever
  project instantiated the resolver first supplied it to all of them — and the
  app's `moduleNameMapper` was bypassed. The error text named the app's rootDir
  relative to `plugins/validation-expert/src`, which is what identified the
  collision.
- Decision: set an explicit `jest.id` for `packages/app`. Any workspace that
  needs resolver-affecting config (`moduleNameMapper`, `resolver`,
  `modulePaths`) must also declare its own `jest.id`, because the generated id
  does not account for those fields.
- Alternatives considered: patch or vendor the upstream package to add the
  missing CJS entry point (forbidden by `AGENTS.md` — no `node_modules`
  mutation, no patching); move the mapping to the root `jest` config (the
  per-package `jest` field is merged with `Object.assign`, so any package
  defining its own `moduleNameMapper` would still drop it); pin jest
  `maxWorkers` (masks the collision rather than removing it, and the failure is
  deterministic, not a race).
- Consequences: `packages/app` no longer shares a jest module/resolver cache
  with the plugin projects, at the cost of one additional cache bucket. The
  shallow `Object.assign` merge also meant the app's `jest` field had been
  silently discarding the CLI's default `jest-css-modules` mapping; that entry
  is restored alongside the id, and `packages/app/src/index.tsx` does import a
  `.css` file.
- Affected components: `packages/app` test configuration.

### NXD-005 — Infrastructure-dependent tests skip locally but must run in CI
- Date: 2026-09-16
- Context: Six suites (the URS GxP invariants, the persistence and runtime
  PostgreSQL proofs, the seed-persistence and P1A verifications, and the
  URS → Validation integration) skip themselves when PostgreSQL does not
  answer. `.github/workflows/ci.yml` provisioned no database, so 62 tests
  skipped in every CI run while the pipeline reported green. The Python SDK
  parity test had the mirror-image problem: it hard-coded the `python` binary
  and failed on any machine where the interpreter is `python3`. Running the
  PostgreSQL suites for the first time immediately surfaced a real defect — a
  missing `await` meant the final assertion of the URS → Validation
  integration proof had never executed.
- Decision: a test that depends on external infrastructure skips on a
  developer machine and **fails** in CI. The skip path must name what to
  install. CI provisions the infrastructure; the probe tests the capability
  actually needed (can this interpreter import the SDK?), not a proxy for it.
- Alternatives considered: require PostgreSQL for every local run (punishes
  developers without Docker and would have made the baseline red for the wrong
  reason); leave the suites skipped and rely on manual verification runs (this
  is what allowed the defect to survive); delete the skip logic and let the
  suites fail locally (same problem, louder).
- Consequences: CI runs 188 suites / 1399 tests with nothing skipped. A
  developer without Docker or Python still gets a green local run and a
  message explaining what is not being covered. Regressions in the GxP
  invariants and persistence guarantees are now caught by the pipeline rather
  than by whoever next runs the suites by hand.
- Affected components: `.github/workflows/ci.yml`, `docker-compose.test.yml`,
  `plugins/urs-composer-backend` test harness,
  `packages/backend/src/compatibilityPolicyParity.test.ts`.

### NXD-006 — ProductVersion label is validated; the ordinal is a sequence
- Date: 2026-09-16
- Context: `createProductVersion` derived `versionNumber` from
  `versions.length + 1` and accepted any caller-supplied string as the version
  label, unvalidated, straight from `req.body`. Three consequences, all
  reachable through the HTTP API: a Product version could be labelled
  `latest`, `v1` or an empty string; supplying an out-of-order label such as
  `3.0` as the second version made the next generated label `3.0` too, which
  hit the `(product_id, version)` unique index and surfaced as a 500; and the
  ordinal drifted from the labels, so `listProductVersions`, which orders by
  it, no longer reflected creation order. ProductVersion is the anchor for
  ProductBaseline, ValidationContext, release identity and — from Phase 4 —
  dependency and change-impact analysis, so unvalidated identity here
  propagates into every one of them.
- Decision: three rules.
  1. A version label is `MAJOR.MINOR` or `MAJOR.MINOR.PATCH`, non-negative,
     no leading zeros. Leading zeros are rejected because `01.0` and `1.0`
     would be distinct rows naming the same version.
  2. `versionNumber` is a per-product sequence of `max + 1`. It orders
     versions by creation and is never reused, independently of the labels.
  3. A generated label clears the highest existing *label*, not the row count,
     so it cannot collide with an explicitly supplied one. A duplicate label
     is a `ConflictError` (HTTP 409), not a driver error behind a 500.
  The rules live in `packages/platform-common/src/product.ts` as
  framework-independent functions, per the Phase 1 focus on stable contracts
  and invariants.
- Alternatives considered: derive `versionNumber` from the label's major
  (collides as soon as two versions share a major, e.g. `1.0` and `1.1`);
  full semver with pre-release and build metadata (more identity surface than
  the lifecycle currently uses — `MAJOR.MINOR.PATCH` can be widened later
  without invalidating stored labels); add a unique index on
  `(product_id, version_number)` (worth doing, but a schema change on a table
  holding data is a separate, reversible-migration decision rather than part
  of this slice).
- Consequences: existing rows are untouched — validation applies on create
  only, and `nextProductVersionLabel` deliberately tolerates unparseable
  historical labels so that a legacy row cannot wedge the sequence. Callers
  that relied on sending arbitrary version strings now receive a 400. No data
  migration.
- Affected components: `packages/platform-common/src/product.ts`,
  `plugins/composer-backend` service and router.

### NXD-007 — ProductBaseline labels: presence and uniqueness, not format
- Date: 2026-09-16
- Context: `createProductBaseline` had the same defects as
  `createProductVersion` before [`NXD-006`](#nxd-006--productversion-label-is-validated-the-ordinal-is-a-sequence),
  and one more. `baselineVersion` was generated as `${existing.length + 1}.0`,
  any string was accepted, and — unlike `product_versions` — the
  `product_baselines` table carries **no unique index**, so a duplicate label
  was simply stored. A ValidationContext binds the exact validated candidate,
  and a ProductBaseline is part of that binding; two baselines of one
  ProductVersion sharing a label make the validated candidate ambiguous.
  Separately, the method superseded the currently APPROVED baseline *before*
  it had finished deciding whether the request was valid.
- Decision: adopt the rule the URS side already reached for requirement-set
  baselines (`assertBaselineVersionAvailable`): a baseline label is checked
  for **presence and case-insensitive uniqueness within its parent, not for
  format**, because it often has to match a document number in an external QMS
  ("SOP-1234 Rev B"). A duplicate is a `ConflictError` → HTTP 409. All
  validation happens before the first write, so a rejected request cannot
  leave a product version with a superseded baseline and no replacement.
  The generated label clears the highest existing label rather than the row
  count, via the shared `nextMajorVersionLabel`.
- Alternatives considered: impose the ProductVersion grammar on baselines
  (would reject legitimate QMS identifiers, and contradicts the reasoning
  already recorded in `urs-composer-backend/domain/versioning.ts`); add the
  unique index now (correct, but a schema change against a table holding data
  belongs in a slice with a reversible migration); leave uniqueness to the
  database (there is no constraint to leave it to).
- Consequences: the service is now the only thing preventing duplicate
  baseline labels, which means the check is racy under concurrent creates for
  the same product version. That is strictly better than no check, and the
  unique index that would close it is tracked as P1-S3. `nextMajorVersionLabel`
  was renamed from `nextProductVersionLabel` (introduced one commit earlier in
  NXD-006) now that it serves both concepts.
- Affected components: `packages/platform-common/src/product.ts`,
  `plugins/composer-backend` service.

### NXD-008 — Duplicated baseline-label logic is not yet consolidated
- Date: 2026-09-16
- Context: `urs-composer-backend` has `nextBaselineVersion` and
  `assertBaselineVersionAvailable` implementing the same rules that NXD-007
  puts in `platform-common`. Behaviourally the "next label" functions agree on
  every input checked (numeric labels, unparseable labels, labels with a
  leading integer).
- Decision: do **not** fold the URS implementations into the shared ones in
  this slice. Fix the defect first; consolidate as its own change.
- Alternatives considered: consolidate now — rejected because it would mix a
  defect fix with a refactor of GxP-relevant code paths, and the two should be
  reviewable separately.
- Consequences: one duplicated 12-line function and one duplicated uniqueness
  check remain. Tracked as a Phase 1 consolidation candidate in `STATUS.md`.
  The URS suites now run in CI (NXD-005), so the consolidation is verifiable
  when it happens.
- Affected components: `plugins/urs-composer-backend/src/domain/versioning.ts`,
  `plugins/urs-composer-backend/src/service.ts`.
- **Resolved** in the following slice (P1-S4). `nextBaselineVersion` is now
  `nextMajorVersionLabel` re-exported under the name the URS domain speaks,
  and `assertBaselineVersionAvailable` uses the shared
  `findVersionLabelClash`. Equivalence was checked across the URS test vectors
  and edge cases (leading zeros, QMS labels, blank strings, mixed sets) before
  the swap; all 418 URS tests pass afterwards, including the GxP invariants
  against real PostgreSQL.

### NXD-009 — Identity constraints in the database; migration stops on conflict
- Date: 2026-09-16
- Context: NXD-006 and NXD-007 made duplicate version ordinals and duplicate
  baseline labels unreachable through the service, but an application check is
  not a constraint — two concurrent creates can both pass it — and
  `product_baselines` had no index of any kind. Data written before those
  changes may already contain duplicates.
- Decision: add `product_versions_ordinal_unique` on
  `(product_id, version_number)` and `product_baselines_label_unique` on
  `(product_version_id, lower(baseline_version))`. The expression index makes
  the database agree with the service, which treats "Rev-A" and "rev-a" as one
  identity; a plain index would permit what the service forbids. Before
  installing them the migration scans for rows that would violate them and, if
  it finds any, **stops with the offending keys listed and changes nothing**.
- Alternatives considered: relabel duplicates automatically (rewrites a
  GxP-relevant identifier that an external QMS or an existing ValidationContext
  may reference — not a decision a migration should make unattended); ship a
  read-only detection report first and constrain in a later release (safer for
  rollout, but leaves the race open for another cycle); rely on the service
  check alone (does not survive concurrency).
- Consequences: a deployment carrying ambiguous data fails to migrate and is
  blocked until a human decides which row keeps the label. That is the
  intended outcome: the data was already ambiguous and the constraint only
  makes it visible. The error names the exact keys so remediation is targeted.
  Verified on both dialects — SQLite for the domain suite, and a dedicated
  PostgreSQL test (`db/migrations.postgres.test.ts`) because a schema change
  proven only on SQLite is proven on the wrong database.
- Affected components: `plugins/composer-backend/src/db/migrations.ts`.

### NXD-010 — DataContract: validate inputs now, identity in Phase 4
- Date: 2026-09-16
- Context: `addDataContract` cast `request.schemaType` straight to
  `DataContract['schemaType']`. `DATA_CONTRACT_SCHEMA_TYPES` has always
  existed and was never enforced anywhere, so any string became a stored
  schema type and every consumer had to cope with values the type said were
  impossible. `version` was likewise unvalidated free text defaulting to
  '1.0'. Separately, a DataContract has no name — a row is identified by a
  UUID and its parent component — so there is no well-defined key to make
  unique.
- Decision: validate what exists; do not invent identity. `schemaType` is
  narrowed with a type guard instead of cast, and `version` follows the same
  semantic-version rules as a ProductVersion label. Giving DataContract an
  identity, an owner and the rest of the first-class field set stays Phase 4,
  where `IMPLEMENTATION_PLAN.md` puts it.
- Alternatives considered: add a `name` and a unique key now — rejected
  because it would commit to a uniqueness key before the Phase 4 model is
  designed, and would mean two migrations against one table. The full field
  set (semantics, quality rules, SLA, classification, access policy, delivery
  mechanisms, compatibility) should land as one designed change.
- Consequences: no schema change and no migration. Existing rows are
  untouched; validation applies on create. Callers sending a schema type
  outside the supported set, or a non-version version, now receive a 400 where
  they previously got a stored row. Phase 4 still has to supply contract
  identity before contracts can be referenced, versioned or used for impact
  analysis independently of their component.
- Affected components: `packages/platform-common/src/product.ts`,
  `plugins/composer-backend` service.

### NXD-011 — Do not hand a knex QueryBuilder to `expect().rejects`
- Date: 2026-09-16
- Context: `identityConstraints.test.ts`, added with NXD-009, failed in about
  60% of full repository runs (2 of 3 measured, 3 of 5 including earlier runs)
  while passing every time the composer-backend project ran alone. Diagnostics
  showed the unique indexes present and the data genuinely colliding, yet the
  duplicate insert reported "did not throw". A pool-size theory was tested and
  ruled out: the better-sqlite3 pool is min 1 / max 1.
- Decision: never pass a knex QueryBuilder directly to `expect(...).rejects`.
  A builder is a lazily-executed thenable, not a Promise; wrap the query in an
  `async` function so the assertion is made against a real Promise and the
  query's execution point is unambiguous.
- Alternatives considered: retry the test (hides it); drop the assertions
  (removes the only proof the indexes enforce anything); keep investigating
  jest's thenable handling (the wrapper is correct regardless of the precise
  internal cause, and an intermittently red pipeline is worse than an
  unexplained jest internal).
- Consequences: four consecutive full runs of 1461 tests pass, against 3
  failures in 5 runs before. The root cause inside jest is not proven — what
  is established is that the builder form is unreliable here and the Promise
  form is not. Other suites using `expect(builder).rejects` would be worth
  auditing if the symptom reappears elsewhere.
- Affected components: `plugins/composer-backend/src/identityConstraints.test.ts`.
- **Superseded in part (2026-09-17).** The builder-vs-Promise point stands and
  is still the rule. But it was *not* what made this suite flake, and the
  "four consecutive passes" above were luck, not a fix — the suite went on
  failing intermittently. The actual cause is a native-module realm crossing,
  root-caused in NXD-016. Read the decision above as a style rule, not as a
  closed flake investigation.

### NXD-012 — Artifacts reuse the Golden Path lifecycle
- Date: 2026-09-16
- Context: Phase 2 needs an Artifact lifecycle covering the producer actions —
  Create, Develop, Test, Submit, Review, Certify, Publish, Version, Deprecate.
  `releases.ts` already defines `GOLDEN_PATH_LIFECYCLE_STATES`
  (DRAFT → TESTING → CERTIFIED → RELEASED → DEPRECATED → RETIRED) with
  transition rules and role gating that express the same progression.
- Decision: `ArtifactLifecycle` is `GoldenPathLifecycle`, and
  `ARTIFACT_LIFECYCLE_STATES` is the same array. Only the name is local to the
  Artifact domain. A Golden Path is itself one Artifact kind, so a separate
  lifecycle would have had to be kept in step with this one by hand.
- Alternatives considered: declare a distinct set (PUBLISHED, WITHDRAWN and so
  on) — rejected as exactly the duplication this transformation removes, and
  it would leave two answers to "is this certified?"; rename the Golden Path
  constant to the Artifact one now — deferred, since Golden Path release code
  and the release catalogue read it today and the rename is not needed to make
  progress.
- Consequences: one lifecycle across Artifact kinds, and the existing
  transition and role-gating logic applies unchanged. A test asserts the two
  arrays are identical, so a future divergence has to be deliberate rather
  than accidental.
- Affected components: `packages/platform-common/src/artifact.ts`,
  `packages/platform-common/src/releases.ts`.

### NXD-013 — Artifact dependencies pin exact versions
- Date: 2026-09-16
- Context: `spec.dependencies` in a `nexora.yaml` could accept ranges
  (`^1.0`, `1.x`) or exact versions.
- Decision: exact only — `namespace/name@version`, validated by the shared
  version grammar. A range is a manifest error.
- Alternatives considered: allow ranges with resolution at install time, which
  is what general-purpose package managers do.
- Consequences: a range would make the set of Artifacts a Product was built
  from depend on *when* it was resolved. A validated Product has to be able to
  state exactly what it was built from, and a ValidationContext binds exact
  Artifact versions, so resolution-time variability cannot be allowed to reach
  it. The cost is that upgrades become an explicit act — which Phase 6 already
  treats as one ("Upgrade" is a listed consumer action) rather than something
  that happens silently on reinstall.
- Affected components: `packages/platform-common/src/artifact.ts`.

### NXD-014 — Registry authority is granular permissions, not Producer/Consumer roles
- Date: 2026-09-17
- Context: Phase 2 calls for "Producer/Consumer permissions". The obvious
  reading is two new platform roles. But the platform already has a five-tier
  role model (VIEWER → DEVELOPER → BUSINESS_CAPABILITY_LEAD →
  DATA_PRODUCT_OWNER → PLATFORM_ADMIN) whose grants are named permission sets,
  and nearly everyone is both a producer and a consumer depending on which
  namespace they are looking at.
- Decision: no Producer or Consumer role. The registry declares eight
  permissions — `artifact.read/create/submit/review/certify/publish/deprecate`
  and `publisher.manage` — and tiers them across the existing roles: reading
  at VIEWER, registering/submitting/reviewing at DEVELOPER, certifying,
  publishing and deprecating at DATA_PRODUCT_OWNER, and claiming a namespace
  at PLATFORM_ADMIN.
  Reviewing is deliberately *not* a lifecycle transition: it sets
  `certificationStatus` to TESTED and leaves `lifecycle` at TESTING. Certifying
  is the act that advances the lifecycle, and it refuses to run unless the
  review already happened.
- Alternatives considered: add PRODUCER and CONSUMER roles — rejected, it
  creates a second, parallel authority model that would have to be reconciled
  with the tier model at every call site, and "producer" is a relationship to
  a namespace rather than a property of a person. Grant certify and publish to
  DEVELOPER for convenience — rejected: it lets the author of a version
  certify and release it on their own authority, which is the separation of
  duties the tiering exists to create.
- Consequences: the split between `artifact.review` (DEVELOPER) and
  `artifact.certify` (DATA_PRODUCT_OWNER) means no single grant carries a
  version from draft to released. `publisher.manage` sits above release
  authority because claiming a namespace decides who is accountable for
  everything published under it, not merely what it contains. Per-namespace
  scoping — "this team produces into `acme`" — is not expressed yet; the
  permissions are platform-wide today and `Publisher.memberGroups` is the
  field a later slice would resolve against.
- Affected components: `packages/platform-common/src/permissions.ts`,
  `packages/platform-common/src/policy.ts`,
  `plugins/artifact-registry-backend/src/router.ts`.

### NXD-015 — Lifecycle transitions are guarded by revision, not by a lock
- Date: 2026-09-17
- Context: every transition reads the version, checks the precondition
  ("publishing requires CERTIFIED") and writes, in three statements. Between
  the read and the write another caller can move the same row, so the
  precondition check is advisory unless something binds it to the write. This
  is the same gap NXD-009 closed for identity, on the mutation path.
- Decision: the update is guarded on the revision that was read
  (`where id = ? and revision = ?`), bumps it, and the service raises
  `ConflictError` when it matches no row. This is the optimistic-concurrency
  pattern `urs-composer-backend/src/postgres-repository.ts` already uses.
- Alternatives considered: wrap read-check-write in a transaction with
  `select ... for update` — correct, but pessimistic locking is not used
  anywhere in the repository today and `for update` has no SQLite equivalent,
  so the test suite would stop exercising the same code as production. Leave
  it unguarded because the transitions are nearly idempotent — rejected: the
  `revision` column exists precisely to make a lost update detectable, and
  writing it without checking it is worse than not having it.
- Consequences: a losing caller gets a 409 telling it to re-read, rather than
  silently overwriting. The guard is exercised by a test that races two
  submissions of the same version.
- Affected components: `plugins/artifact-registry-backend/src/repository.ts`,
  `plugins/artifact-registry-backend/src/service.ts`.

### NXD-016 — Assert database refusals on the message, not with `.rejects.toThrow()`
- Date: 2026-09-17
- Context: the flake NXD-011 was opened for never closed. `identityConstraints.test.ts`
  kept failing in roughly 2 of 10 full composer-backend runs with "Received
  function did not throw", while passing every run in isolation. Instrumenting
  the catch showed the correlation exactly: every failing round logged
  `isErrorInstance=false`, every passing round `isErrorInstance=true` — always
  the same `SqliteError`, always with a correct UNIQUE message. The constraint
  fired every single time; the assertion was what failed.
  better-sqlite3 is a native module, so its binding is loaded once per jest
  *worker process* and the `SqliteError` it raises carries the `Error`
  intrinsic of whichever jest module realm loaded it first. When another suite
  in the same worker got there first, `error instanceof Error` is false in the
  later file, and jest reports a non-Error rejection value as "Received
  function did not throw" (verified against a scratch test; a resolved promise
  instead says "Received promise resolved instead of rejected"). That single
  misleading message is what sent NXD-011 after the thenable.
- Decision: for errors raised by a *native* driver, assert on the message
  rather than the type. A local `expectRefusedByDatabase(write, pattern)`
  helper awaits the write, fails loudly with a written-out explanation if the
  write was *accepted* (the case that actually matters — a missing
  constraint), and otherwise matches
  `String((raised as {message?: unknown})?.message ?? raised)` against the
  pattern. Matching the message is realm-blind.
- Alternatives considered: `expect.assertions()` plus a manual try/catch in
  every test (same thing, repeated at each call site); forcing jest to one
  worker (`--runInBand` repo-wide costs far more than the bug); a custom jest
  matcher or `serializer`/`snapshotResolver` shim (more machinery than a
  nine-line helper); leaving `.rejects.toThrow()` and retrying the suite
  (hides a red that was telling the truth about *something*). Pure-JS drivers
  like `pg` are re-instantiated per test file, so their errors are same-realm
  and `.rejects.toThrow()` stays correct there — this is deliberately not a
  repo-wide ban.
- Consequences: the risk this flake represented was a false **red**, not a
  false green. A green `yarn test` was never covering up a missing constraint,
  so no identity guarantee was ever unverified — the correction to STATUS's
  Known Risks matters, because it had the direction backwards.
  `--runInBand` turns the flake from ~2-in-10 into deterministic, which is now
  the repro: every file shares one process, so whichever suite loads the
  binding first owns the intrinsic. Verified by reverting one assertion under
  `--runInBand` and watching "Received function did not throw" come back.
  The helper is duplicated in two packages rather than shared: the only
  plausible home, `platform-common`, is a runtime export surface and a jest
  helper does not belong in it. A test-utils workspace is worth creating if a
  third package needs it.
  `jest/expect-expect` cannot see through the helper, so both packages declare
  it in `assertFunctionNames` rather than carrying per-test disables.
- Affected components:
  `plugins/composer-backend/src/identityConstraints.test.ts`,
  `plugins/artifact-registry-backend/src/service.test.ts`,
  `plugins/composer-backend/.eslintrc.js`,
  `plugins/artifact-registry-backend/.eslintrc.js`.

### NXD-017 — Test servers must rebind off the Fetch blocked-port list
- Date: 2026-09-17
- Context: while stressing NXD-016, `artifact-registry-backend` failed about 1
  run in 15 — but in `router.test.ts`, on a different test each time, with
  `TypeError: fetch failed` and cause `bad port`. This is the flake STATUS
  recorded under Known Risks as unexplained and "not reproduced on demand"
  (seen once in `entitlements-backend/src/router.test.ts` with an empty error
  cause). It is now root-caused. `bad port` is not a network error: it is the
  Fetch standard's blocked-port list, which `fetch` refuses *before* opening a
  socket. Twelve backend test files bind with `app.listen(0)`, and this
  container's `ip_local_port_range` is `1024 65535` rather than the usual
  `32768 60999`, so the OS can hand back 6000, 6697, 10080 and friends.
  Confirmed directly: a server on port 6000 plus `fetch` reproduces
  `TypeError: fetch failed` / cause `bad port` every time.
- Decision: the `listen` helper checks the port it was assigned against the
  blocked list and rebinds if it drew one, bounded at 20 attempts. Only ports
  ≥1024 are listed, because nothing below that is reachable from an
  unprivileged `listen(0)`.
- Alternatives considered: `supertest`, which is what the Blocked Decisions
  entry proposed and which would remove sockets entirely — no longer needed
  for *this* bug, and it should be approved on its own merits rather than as a
  flake fix for a flake that is now fixed. Widening the container's
  `ip_local_port_range` — fixes one machine, not CI or anyone else's. Pinning
  a fixed port per suite — reintroduces collisions under parallel runs.
  Retrying the `fetch` — retries a request that is deterministically refused.
- Consequences: 20 consecutive `--runInBand` runs pass, against 2 failures in
  the ~40 runs before. The other eleven socket-binding test files have the
  same latent bug and are **not** fixed here; that is a follow-up, and the
  remedy is this same four-line guard. Because the diagnosis was wrong before
  (a real socket under parallel load), the Blocked Decisions entry for
  `supertest` loses its stated justification.
- Affected components: `plugins/artifact-registry-backend/src/router.test.ts`;
  latent in eleven other backend `router.test.ts` files.

### NXD-018 — The Marketplace category travels as manifest metadata, not as a kind
- Date: 2026-09-17
- Context: the legacy Marketplace sorts its offerings into five display
  categories (Templates, Connectors, Data Products, Platform Components,
  Solutions). The registry has seven Artifact kinds. The two taxonomies are
  neither the same size nor the same idea: a kind says what an Artifact *is*
  and is what every dependency on it means; a category says which shelf it
  sits on. Mapping the Marketplace onto the registry needs an answer for the
  offerings whose category has no kind, and for reading the category back.
- Decision: category → kind is a one-way derivation at registration
  (`MARKETPLACE_CATEGORY_KINDS`), and the category itself is stored verbatim
  under `spec.marketplace` in the manifest. Reading back uses the stored
  category rather than inverting the table.
- Alternatives considered: make the category a first-class field on `Artifact`
  — rejected, because it puts a Marketplace presentation concern into the
  domain model every other consumer also carries, and Phase 6's consumer
  experience is likely to want a different grouping. Invert the kind table on
  read — rejected, because the mapping is not injective in principle: two
  categories may legitimately land on one kind, and the inverse would then
  silently pick one. Add a `SOLUTION` kind so the table is total — rejected as
  inventing product semantics; no offering uses that category today, and what
  a Solution is in registry terms is a product question, not a mapping detail.
- Consequences: an offering whose category has no kind is *reported* by
  `validateMarketplaceOffering` and produces no manifest, rather than being
  filed under a near-enough kind. `Solutions` is that case today and the
  parity suite names it as a known, deliberate gap; the first offering to use
  it turns the gap into a red test rather than into silently mis-filed data.
  The round trip is checkable, and it is checked for all twelve offerings.
- Affected components: `packages/platform-common/src/marketplace-artifact.ts`,
  `plugins/marketplace/src/registryParity.test.ts`.

### NXD-019 — A manifest may not declare its own certification
- Date: 2026-09-17
- Context: the legacy offerings carry `certificationStatus`, and three of the
  twelve claim CERTIFIED. The obvious mapping is onto
  `ArtifactVersion.certificationStatus`, so the Marketplace shows the same
  badge after the switch as before it. But P2-S3 deliberately made
  registration yield DRAFT with no certification status, and made certifying
  refuse to run without a recorded review ([`NXD-014`](DECISIONS.md)).
- Decision: the legacy value travels as Marketplace metadata under
  `spec.marketplace.certificationStatus` — a record of what the old UI
  displayed — and nothing in a manifest may set the registry's own
  certification or lifecycle. A test asserts the manifest carries neither.
- Alternatives considered: map it onto the ArtifactVersion at registration —
  rejected, because it lets the artifact being reviewed declare the outcome of
  its own review, which is the separation of duties the whole lifecycle
  exists to enforce; a GxP platform cannot have a certification whose only
  provenance is that someone typed it into the thing being certified. Drop the
  field — rejected, because then parity is not parity: the Marketplace would
  lose a badge it shows today with no decision having been taken about it.
- Consequences: the legacy claim and the registry's own status are two
  distinct facts, and the read-switch slice has to decide which one the
  Marketplace displays. That is the honest state of affairs — the twelve
  offerings have never been through this registry's review — and it is better
  surfaced as a decision than papered over by a mapping.
- Affected components: `packages/platform-common/src/marketplace-artifact.ts`,
  `plugins/marketplace/src/registryParity.test.ts`.

### NXD-020 — Registry content is files on disk, loaded at startup
- Date: 2026-09-17
- Context: the registry needed its first content. Two ways to get the twelve
  legacy offerings in: seed them from `marketplaceItems` at startup, or commit
  them as `nexora.yaml` files the backend reads.
- Decision: files, under `catalog/artifacts/<namespace>/`, loaded by
  `manifestLoader.ts` when the plugin initialises. A `kind: Publisher`
  document declares namespace ownership; everything else is an Artifact
  manifest. Registration goes through the same service an HTTP caller uses,
  so the rules are enforced once and in one place.
- Alternatives considered: seed from the array — rejected, because it makes
  the frontend plugin the registry's source of truth and inverts the
  dependency the transformation is trying to establish; the array is the thing
  being retired, not the thing to build on. A database migration that inserts
  the rows — rejected, because content is not schema: a wrong manifest should
  be fixable by editing a file and restarting, not by writing a second
  migration to correct the first.
- Consequences: "manifest driven" becomes literally true — a capability enters
  the registry by being a file. It also means the twelve exist in two places
  until the array is deleted, which is the cost of not deleting working
  behaviour before parity. Two tests hold them in step, and the seam is named
  in both.
- Three properties the loader must have, and has: **idempotent**, because a
  backend restarts often and a loader that duplicates or throws on the second
  run is worse than none; **non-fatal**, because a malformed manifest must not
  be able to stop the platform starting; and **draft-only**, because loading a
  file must never be a way to publish. Verified live: 12 registered on first
  start, 0 registered / 12 already present on reload.
- Affected components: `plugins/artifact-registry-backend/src/manifestLoader.ts`,
  `plugins/artifact-registry-backend/src/plugin.ts`, `catalog/artifacts/`.

### NXD-021 — A repo-relative content path is resolved by walking up
- Date: 2026-09-17
- Context: `yarn start` from the repo root runs the backend with cwd at the
  root; `backstage-cli package start` — the production-shaped `serve` mode —
  runs it with cwd at `packages/backend`. A default of `catalog/artifacts` is
  therefore correct from one and wrong from the other. This was not
  theoretical: the first live run logged `directory
  .../packages/backend/catalog/artifacts does not exist` and loaded nothing.
- Decision: resolve a relative manifest directory by walking up from the
  working directory to the first candidate that exists, bounded at six levels,
  falling back to the cwd-relative path so a genuinely missing directory is
  reported against the location the operator meant. Absolute paths pass
  through untouched.
- Alternatives considered: require an absolute path in config — pushes a
  deployment detail onto every environment, including tests. Pin the default
  to the repo root found by walking up for a marker file — more machinery for
  the same answer.
- Consequences: the same config works in both start modes. This is the
  **second** copy of this logic in the repository; `resolveFactoryPath` in
  `model-company-backend` solves the same problem the same way, and its
  comment describes the same two cwds. Two copies is one too many. A third
  caller should move it into `platform-common` rather than copy it again —
  recorded so that the next person meets the decision rather than the
  precedent.
- Affected components:
  `plugins/artifact-registry-backend/src/manifestLoader.ts`;
  duplicate of `plugins/model-company-backend/src/factory.ts`.

### NXD-022 — The Marketplace reads the registry over HTTP, with the array as fallback
- Date: 2026-09-17
- Context: the registry holds the twelve offerings as of P2-S5a but nothing
  reads them. The Marketplace is a frontend plugin; the registry is a backend
  one behind `artifact.read`.
- Decision: a read-only client in the Marketplace calls
  `GET /artifacts?includeVersions=true` and converts the embedded manifests
  back into offerings through `marketplaceViewOfManifest`. `loadOfferings`
  never rejects: a registry that fails, or answers with nothing renderable,
  falls back to `marketplaceItems` and logs why. The array stays.
- Alternatives considered: read the registry's tables directly — rejected, the
  permissioned API is the boundary the registry was given one for, and a
  private path for the first consumer is a private path for all of them. Cut
  over with no fallback — rejected; the migration architecture warns against
  exactly the switch that cannot be undone, and an empty Marketplace on a
  working installation is a worse failure than twelve cards from an array.
  Expose a Marketplace-shaped endpoint on the registry — rejected, it puts a
  consumer's presentation concern inside the registry.
- `includeVersions` is opt-in on the existing listing rather than a new route:
  a caller needing every manifest would otherwise turn one catalogue page into
  N+1 round trips, and a caller needing only the list should not pay for every
  manifest. It is behind the same `artifact.read` permission, tested
  explicitly, because the expanded shape carries more and must not be a way
  around the gate the plain listing is behind.
- Consequences: the Marketplace has a real consumer relationship with the
  registry, and the fallback means the read path can be wrong without being
  catastrophic — which is also its risk, so the fallback warns loudly in the
  console. Unchanged for the user: same twelve cards, same order, same badges.
- Affected components: `plugins/marketplace/src/artifactRegistryApi.ts`,
  `plugins/marketplace/src/offeringSource.ts`,
  `plugins/marketplace/src/components/`,
  `plugins/artifact-registry-backend/src/router.ts`,
  `packages/platform-common/src/marketplace-artifact.ts`.

### NXD-023 — Card order is preserved from the array, and is not an Artifact property
- Date: 2026-09-17
- Context: the registry returns artifacts ordered by name. Switching the
  source therefore re-sorted the catalogue alphabetically. Nothing in the
  tests caught it — order was not asserted — and it was visible immediately on
  screen the first time the switch ran against the real app.
- Decision: `offeringsFromRegistryResponse` sorts by each offering's position
  in `marketplaceItems`, with anything the array never had placed after it in
  name order. The position is derived from the array rather than restated, so
  it is not another copy of the twelve.
- Alternatives considered: accept the alphabetical order — rejected, order is
  visible and parity means not changing what the user sees while the switch is
  being proven; being strict about the certification badge and loose about
  ordering would not be a consistent reading of the same rule. Add a display
  order to the manifest — rejected, an Artifact's identity should not carry a
  Marketplace shelf position, and inventing one would mean choosing a curation
  on the platform's behalf.
- Consequences: the UI is unchanged today. What is preserved, though, is the
  order the offerings were *added over time*, not a designed one — so this is
  fidelity to an accident. Whether the Marketplace wants a deliberate order,
  and where it would live, is a question for after the array is deleted; this
  function is what gets replaced or removed then.
- Affected components: `plugins/marketplace/src/offeringSource.ts`.

### NXD-024 — The blocked-port guard is a shared helper, and four files never needed it
- Date: 2026-09-17
- Context: [`NXD-017`](DECISIONS.md) fixed the Fetch blocked-port flake in one
  file and recorded that "twelve backend test files bind with `app.listen(0)`"
  with "the other eleven" still carrying the bug. Sweeping it revealed both
  numbers were wrong, and in opposite directions.
- **Thirteen files bind an ephemeral port, not twelve.** The original count
  missed one.
- **Only nine of them can hit the bug.** The blocklist is a *Fetch* standard
  rule: `fetch` refuses those ports before opening a socket. `http.request`
  does not consult it at all. Four files —
  `urs-composer-backend/{authorize-approve-proof, p1b-http-final-verification,
  seeded-baseline-http}.test.ts` and
  `validation-expert-backend/validation-context-integration.test.ts` — drive
  their servers with `http.request` and were never affected. Eight needed
  fixing, not eleven.
- Decision: `listenOnFetchablePort` in a new `@internal/backend-test-utils`
  workspace, used by all nine. The blocklist is a spec detail that will change;
  nine copies of it is nine chances for one to fall behind, and the original
  entry already anticipated this ("worth a shared test helper at that point
  rather than a twelfth copy").
- Alternatives considered: copy the guard into each file — rejected on the
  duplication the original entry already called out. Put the helper in
  `platform-common` — rejected; it is a Node HTTP test concern, and
  `platform-common` is framework-independent domain code that also ships to
  the frontend. Widen the container's `ip_local_port_range` — fixes one
  machine, not CI.
- Consequences: the flake class is closed for every file that could have it,
  and the blocklist has one home. The helper is unit-tested against a stand-in
  server that hands back chosen ports, because the real bug depends on what
  the OS happens to offer and cannot be provoked on demand. It also bounds its
  retries: twenty blocked ports in a row is a broken assumption, not bad luck,
  and a suite that hangs is worse than one that fails with a reason.
- This was not preventive. The flake failed a full run during P2-S5b, in
  `data-products-backend/src/router.test.ts` — one of the eight — with an
  empty `Cause:`, passing in isolation and on re-run.
- Affected components: `packages/backend-test-utils/`, and the nine test files
  listed above minus the four that use `http.request`.

### NXD-025 — Marketplace certification comes from the ArtifactVersion, not the manifest
- Date: 2026-09-19
- Context: P2-S5b deferred a question rather than answering it: once
  `marketplaceItems` is deleted, which certification does the Marketplace show?
  Three offerings display CERTIFIED today as a value carried in
  `spec.marketplace.certificationStatus` — legacy display metadata, per
  NXD-019 — while none of the twelve has ever been through this registry's own
  review, because registration deliberately cannot grant one. Carrying the
  legacy claim across the read switch was licensed by parity; carrying it
  forever was explicitly left open.
- Decision: the manifest can no longer state a certification at all —
  `certificationStatus` is removed from `MarketplaceManifestView` and from
  every manifest under `catalog/artifacts/nexora/` — and the Marketplace shows
  the registry's own `ArtifactVersion.certificationStatus` instead, joined onto
  the manifest-derived view in `marketplaceOfferingsFromRegistry`. An Artifact
  version that has not been reviewed shows `DEVELOPMENT`
  (`UNCERTIFIED_STATUS`), the floor of the scale and the true statement about
  content nothing has certified, rather than a blank or an inherited claim.
  This is a visible regression for `aas-data-product` and `oee-data-product`,
  whose cards lose their CERTIFIED badge until they are actually reviewed and
  certified in the registry — which is the point: the badge now means what it
  says.
- Alternatives considered: keep the legacy value as a labelled "legacy" badge
  alongside the registry status — rejected, it keeps an unearned claim visible
  under a new name rather than retiring it, and doubles the certification UI
  for a distinction most readers of a marketplace card have no reason to
  parse. Show both facts side by side — rejected for the same reason with less
  excuse: two certification lines on one card reads as the platform being
  unsure which one is true. Leave the manifest field in place but stop reading
  it — rejected, a field the code no longer reads is exactly the kind of
  contradiction NXD-019 already refuses to let a manifest state.
- Consequences: `marketplace-artifact.ts` splits `MarketplaceManifestView`
  (what a manifest states) from `MarketplaceOfferingView` (that plus the
  registry's certification), so the type system says which half each fact
  comes from. `marketplaceViewOfManifest` additionally refuses a manifest whose
  category maps to a different kind than the one it declares — a check the
  forward-mapping direction enforced by construction but the read direction
  never had, now that reading manifests is the only direction this module has.
  `marketplaceOfferingToManifest`, `validateMarketplaceOffering`,
  `marketplaceNamespaceFor` and `marketplaceOfferingView` are deleted along
  with `marketplaceItems`: they existed to prove an offering could become a
  manifest, and the migration they served is finished — the twelve
  hand-authored manifests are now edited directly, not generated.
- Affected components: `packages/platform-common/src/marketplace-artifact.ts`,
  `catalog/artifacts/nexora/*.yaml`, `plugins/marketplace/src/offeringSource.ts`.

### NXD-026 — `marketplaceItems` is deleted; card order is the registry's
- Date: 2026-09-19
- Context: P2-S5c. The read switch (NXD-022) has been the source in practice
  since P2-S5b, with the array kept only as a fallback nobody had needed to
  fall back to, plus two hand-maintained lists of the same twelve ids
  (`registryParity.test.ts`, `artifactManifestFiles.test.ts`) whose only job
  was to keep the array and the manifest directory in step. NXD-023 named the
  array's retirement as the point at which `inLegacyOrder` "gets deleted or
  replaced."
- Decision: delete `marketplaceItems`, its fallback branch in `loadOfferings`,
  and `inLegacyOrder`. `loadOfferings` now rejects when the registry call
  fails, which the Marketplace pages already render as an error state
  (`JourneyState`) rather than a substitution nobody notices. Card order is
  whatever the registry returns — by name today. The two twelve-id lists go
  with the array: `registryParity.test.ts` is deleted outright (its subject no
  longer exists), and `artifactManifestFiles.test.ts` asserts the directory is
  non-empty and internally consistent rather than naming its contents, since a
  list beside the directory it counts would be the second copy this
  transformation exists to remove.
- Alternatives considered: keep a fallback against total registry outage —
  rejected; the migration architecture's own reasoning for a fallback was
  proving parity during the switch, not permanent resilience against a backend
  the rest of the platform already depends on. Invent a deliberate display
  order to replace `inLegacyOrder` — rejected as a product decision with no
  product behind it yet; NXD-023 already named this as a question for *after*
  the array is gone, not a design to smuggle in while removing it.
- Consequences: the Marketplace's card order changes from
  insertion-into-the-array order to alphabetical-by-name, a visible but
  small change, now that nothing is proving parity against a legacy source
  anymore. A registry outage now empties the Marketplace with a visible error
  instead of silently substituting twelve cards — an honest failure rather
  than a hidden one, and the tradeoff the fallback's own doc comment always
  named as temporary. `data.test.ts` keeps a private, unexported fixture array
  of the same twelve entries so the pure functions in `data.ts`
  (`enrichMarketplaceItem`, `filterMarketplaceItems`,
  `goldenPathCreateHighlights`, `marketplaceCreateAllowed`) stay covered
  against representative data without resurrecting a production array.
- Affected components: `plugins/marketplace/src/data.ts`,
  `plugins/marketplace/src/offeringSource.ts`,
  `plugins/marketplace/src/components/MarketplacePage.tsx`,
  `plugins/marketplace/src/components/MarketplaceDetailPage.tsx`; deletes
  `plugins/marketplace/src/registryParity.test.ts`.

### NXD-027 — Compositions are Artifacts, and the component list is not a dependency

- Context: P3-S1a, the first Phase 3 slice. GP-1 records that Core restates
  six composition component lists as TypeScript constants "duplicated from
  `catalog/compositions/*.yaml`". Auditing before implementing showed the
  relationship was the other way around: **nothing read those YAML files at
  runtime.** The only reference to the directory in non-test code was a
  comment. The constants were the de-facto truth; the manifests were
  documentation, kept in step by `compositionManifestParity.test.ts`. So the
  work was not "stop duplicating the manifests" but "give the manifests a
  runtime at all".
- Decision: compositions become `GOLDEN_PATH` Artifacts under
  `catalog/artifacts/nexora/`, and `catalog/compositions/` is deleted. The
  registry already loads that directory, versions what it finds, serves it
  behind the permissioned API and hands the manifest to the frontend verbatim,
  so a composition needs no pipeline of its own. `GOLDEN_PATH` was already a
  declared `ArtifactKind` that no manifest used.
- The component list travels in `spec.components`, **not** `spec.dependencies`.
  A composition's entries are Backstage Catalog entity refs
  (`component:default/health`) with version *constraints* (`1.x`);
  `spec.dependencies` holds Artifact refs with exact pins and would reject
  them. Platform Components are Catalog entities and AGENTS.md says to keep
  them there, so a composition points at the Catalog rather than restating it.
  Making them Artifacts purely to reuse the dependency field was considered
  and rejected: it would move six entities out of the Catalog to satisfy a
  field name.
- `spec.components[].optional` is new. The old format could not express
  optionality, which is why `EQUIPMENT_USE_LOG_OPTIONAL_REFS` existed only in
  Core with no manifest counterpart and the parity test could only assert the
  two sets were disjoint. Both halves are now in the manifest and both are
  checked against it.
- `validateArtifactManifest` now requires a non-empty, well-formed
  `spec.components` for `GOLDEN_PATH`, and rejects the key on any other kind.
  The list is the entire content of this kind; a typo that resolved to an
  empty composition would be a silently wrong answer rather than a loud one.
- Alternatives considered: serve compositions from a second loader over their
  existing `dataprod.platform/v1alpha1` format — rejected, it keeps two
  manifest families and two code paths forever to avoid one rename. Generate
  the Core constants from the manifests at build time — rejected; it removes
  the hand-maintenance but leaves a generated second copy and no runtime
  resolution, which is what Phase 3 is actually for.
- Consequences: the registry holds 20 artifacts across 5 kinds instead of 12
  across 4. **The Marketplace is unchanged at 12 cards** — a manifest with no
  `spec.marketplace` block yields no view, which `artifactManifestFiles.test.ts`
  now asserts over the real composition files rather than leaving to
  inference. Verified live: startup logged
  `8 registered, 12 already present, 0 publishers created, 0 failed`.
  The Core constants are **not** deleted by this slice — they still feed
  `composer.ts` and `oeeBuiltWithSummary`, which are GP-2/GP-3/GP-4 and out of
  scope. `compositionManifestParity.test.ts` therefore survives, repointed at
  the new location, and still guards the duplication until those consumers
  read the registry.
- Affected components: `catalog/artifacts/nexora/` (8 new manifests),
  `packages/platform-common/src/artifact.ts`,
  `packages/platform-common/src/composition.ts`,
  `packages/backend/src/__testUtils__/goldenPathCompositions.ts`; deletes
  `catalog/compositions/`.

### NXD-028 — The Mode B example is renamed rather than sharing a name

- Context: `catalog/compositions/oee-data-product.yaml` would have become
  `nexora/oee-data-product` as an Artifact, which is already the coordinate of
  the OEE **DATA_PRODUCT** manifest. The registry enforces a unique
  `(namespace, name)` and refuses a kind change between versions, so the two
  could not coexist and the second to load would have failed.
- Decision: the composition is renamed `oee-data-product-uns`, after the
  Unified Namespace that is the whole point of the Mode B example. The
  DATA_PRODUCT keeps the plain name.
- Alternatives considered: give compositions their own namespace — rejected,
  it needs a second publisher and splits one publisher's content across two
  namespaces to dodge one collision. Rename the DATA_PRODUCT — rejected, it is
  the one of the two that is referenced outside the repository.
- Consequences: one identifier changes. It was referenced only by a test
  assertion and by documentation, both updated. This is the first case of the
  registry's identity rules constraining what content may be called, which is
  the rule working rather than a problem with it.

### NXD-029 — The composition lists leave Core; consumers read the registry

- Context: P3-S1b, the read switch that closes GP-1. P3-S1a gave the manifests
  a runtime but nothing read them: Core still held six `*_COMPOSITION_REFS`
  constants and a `LIBRARY_COMPOSITION_USAGE` table restating them, and five
  pages imported those.
- Decision: the lists are inputs, not imports. `usageLabelsForComponent`,
  `toLibraryComponents`, `composerPresets`, `officialGoldenPathForSelection`,
  `officialGoldenPathForDraft`, `sortCompositionRefs`, `composerDraftToManifest`
  and `serializeCompositionYaml` all take the component lists from their
  caller. 97 lines of constants are deleted, and
  `compositionManifestParity.test.ts` with them — it existed to hold the
  constants and the files in step, and there is nothing left to hold.
- `useGoldenPathCompositions` in the Marketplace plugin is the one loader. It
  lives beside the registry client because five pages across two workspaces
  need it and `packages/app` is a composition layer. Failure is surfaced rather
  than swallowed: a page that cannot reach the registry shows an error instead
  of an empty "used by" list, which would read as "nothing uses this component"
  — a wrong answer dressed as a real one. Same rule as NXD-026.
- Two new manifest fields, both replacing something Core knew and a file did
  not. `spec.usage` (`kind` + `label`) carries what
  `LIBRARY_COMPOSITION_USAGE` held; the label is stated rather than derived
  from `displayName` because the two genuinely differ and the rule would have
  exceptions in it ("MQTT Temperature (conceptual)" is listed as "MQTT
  Temperature", but "Equipment Use Log (design example)" keeps its
  parenthetical). `spec.builtFrom` on the OEE **DATA_PRODUCT** names the
  composition it is built from, replacing an `item.id === 'oee-data-product'`
  literal in the Marketplace detail page: the "Built with" panel now appears
  because a manifest names a composition, not because the UI recognises a
  product.
- GP-4 closes as a consequence. `oeeBuiltWithSummary(catalog)` is
  `builtWithSummary(catalog, componentRefs, productLabel)` — Core describes the
  shape of a "built with" panel without naming which product it describes. The
  presentational component in the Marketplace plugin is still called
  `OeeBuiltWith`; that is a plugin-local name, not the Core API GP-4 records.
- **Visible change: "used by" labels reorder.** The hand-written table listed
  OEE first because it was written first. The derived table sorts by
  composition name so the answer does not depend on the order the registry
  returns, so `mqtt-consumer` now reads "Machine Metrics Reference, OEE Data
  Product" rather than the reverse. Asserted explicitly rather than left to
  discovery. Alternatives considered: sort by label — same reordering, less
  obvious rule; preserve the old order — it would have to be restated
  somewhere, which is the thing being removed.
- Alternatives considered: fetch compositions inside each page — rejected, five
  copies of the same extraction. Keep a Core default so signatures stay
  unchanged — rejected, a default would be the constant under another name.
- Consequences: `sortCompositionRefs` and the two functions that call it take
  the preferred order optionally, defaulting to alphabetical. That default is
  only reached from `validateComposerDraft`, where order does not affect the
  result; the displayed manifest and YAML are passed the real order from
  ComposePage. GP-1 and GP-4 are removed from the inventory. GP-2 and GP-3 are
  untouched: `officialGoldenPathForSelection` still returns the literal
  `'oee-data-product'`, and the preset ids are still Core's.
- Affected components: `packages/platform-common/src/{artifact,composition,
  composer,platform-component-library,marketplace-artifact}.ts`,
  `plugins/marketplace/src/useGoldenPathCompositions.ts`, five pages; deletes
  `packages/backend/src/compositionManifestParity.test.ts`.

### NXD-030 — A registered version is immutable, so editing a manifest in place does not propagate

- Context: found while verifying P3-S1b live. Adding `spec.usage` to six
  composition manifests changed no behaviour on the running instance — the
  loader logged `8 registered, 12 already present` and kept serving the
  manifests it had stored at `1.0.0`. The new fields only appeared after the
  registry database was dropped and reloaded (`20 registered, 0 already
  present, 0 failed`).
- Decision: this is the loader behaving correctly, not a defect. A registered
  ArtifactVersion is immutable content; a loader that silently rewrote stored
  manifests would make "version 1.0.0" mean whatever was last on disk, which a
  validated Product cannot rest on. Editing a manifest in place is therefore a
  development-time act, and reaching a running registry requires a version
  bump.
- Not fixed here, and deliberately: bumping the seven changed manifests to
  1.1.0 purely to defeat a stale dev database would put a version number on
  content for no product reason, and would change the version the OEE card
  displays. The platform has no installation whose registry must survive this
  change.
- Consequences: recorded as a known operational constraint rather than left to
  be rediscovered. Anyone editing a manifest on a running instance must bump
  `metadata.version` or reset the registry. A future slice that lets producers
  edit content will need the version bump to be part of the act, not an extra
  step someone can forget.

### NXD-031 — Golden Path identity resolves from all registered compositions; presets are manifest-driven (GP-2, GP-3)

- Context: `officialGoldenPathForSelection` returned the literal `'oee-data-product'` after set-comparing the selection against a single composition's refs. `composerPresets` embedded `'oee-reference'` and `'design-example'` in Core's `ComposerPreset.kind`. Both hardcodes meant a second Golden Path required editing Core and widening a union type.
- Decision: `officialGoldenPathForSelection` and `officialGoldenPathForDraft` now accept `ReadonlyMap<string, readonly string[]>` (composition name → required refs from manifests whose `spec.usage.kind === 'runtime'`) and return `string | undefined` — the composition name, not a domain literal. `ComposerPreset.kind` is now `'baseline' | 'official' | 'example'`. `composerPresets` derives one preset per entry in the maps it receives. The Composer navigates to the DATA_PRODUCT Marketplace page and scaffold template via `GoldenPathCompositions.builtFromIndex` (composition name → DATA_PRODUCT name, built from `spec.builtFrom` on DATA_PRODUCT manifests).
- Alternatives considered: returning the DATA_PRODUCT name directly — rejected because the function would need to know about the builtFrom mapping, mixing two concerns; keeping the old API and extending it with an overload — rejected because the text-matching exclusions were wrong in the first place and the old return type would remain.
- Consequences: adding a new official Golden Path now requires only a manifest with `spec.usage.kind: runtime`; Core is untouched. The corresponding DATA_PRODUCT must carry `spec.builtFrom` pointing at the composition if the Composer should offer a Marketplace link and scaffold button for it.

### NXD-032 — Delete embedded EUL YAML and parseEquipmentUseLogExample (GP-6)

- Context: `EQUIPMENT_USE_LOG_COMPOSITION_YAML` was a template literal copy of `catalog/compositions/equipment-use-log.yaml` (now `catalog/artifacts/nexora/equipment-use-log.yaml`). `parseEquipmentUseLogExample()` parsed it back into a `GoldenPathComposition`. After P3-S2 removed the last production import in `composer.ts`, no production code consumed either export.
- Decision: delete both. Two tests that validated the embedded copy now read from the disk manifest via `compositionOnDisk()` (platform-common) and `readGoldenPathComposition()` (backend). The parity guard (embedded vs disk) is redundant now that the disk manifest is the only copy.
- Consequences: the test suite still asserts that the EUL manifest on disk is a valid composition and has the expected component set — the guarantee is preserved, the duplication is not.

### NXD-033 — Delete WAVE1_COMPONENT_TITLES from Core; move to app layer (GP-5)

- Context: `WAVE1_COMPONENT_TITLES` was a `Record<string, string>` in `platform-common/platform-component-library.ts` mapping the six OEE Wave 1 component slugs to display titles. Core named a specific product's components by display name, which is domain knowledge.
- Decision: delete from Core and `index.ts`. `DeveloperHubPage.tsx` declares an equivalent local constant `OEE_COMPONENT_TITLES` — the app layer is allowed to know which product it is displaying. `builtWithSummary` loses the middle fallback and uses `match?.title || name`; when the catalog entity is present its own `metadata.title` is used, which is correct.
- Consequences: if a Catalog entity for a Wave 1 component has no title, the slug appears as-is (e.g. `mqtt-consumer`). In practice all six entities carry titles in the catalog, so no visible change.

### NXD-034 — DataContract identity: name, owner, uniqueness (P4-S1)

- Context: `DataContract` had no name or owner (NXD-010 deferred this to Phase 4). A row was identified only by UUID and `productComponentId`. It could not be referenced or versioned independently, so dependency and subscription semantics could not be built on top.
- Decision: add `name: string` (required, trimmed, case-insensitive unique per component) and `owner?: string` (optional). DB migration adds both columns as nullable (so existing rows are not affected) and a unique index on `(product_component_id, lower(name))`. The service enforces name presence on all new contracts and produces a `ConflictError` on case-insensitive name collisions before the DB constraint fires. `findDataContractByName` is added to the repository. `CreateDataContractRequest` now requires `name`.
- Alternatives considered: making `name` non-nullable in the migration — rejected because existing rows would require a fallback value, which would be a controlled-identifier decision the migration should not make unattended (same reasoning as NXD-009). Nullable column + service enforcement is the established pattern.
- Consequences: contracts created before Phase 4 have `name: ''` in the domain object (the column is NULL in the DB; `rowToDataContract` maps NULL to ''). All new contracts must supply a name. Making contracts fully first-class (own namespace, independent references across products) is the next Phase 4 slice.

### NXD-035 — Data Quality contracts as declarative quality rules (P4-S6)

- Context: The Python data-product SDK already implements quality check execution (`dataprod.quality`), but there was no TypeScript representation of what quality checks a contract declares. Consumers and the platform had no machine-readable way to know what quality obligations a contract carries.
- Decision: add `QualityRule` to `DataContract` with four types (`completeness`, `uniqueness`, `range`, `regex`) matching the Python SDK vocabulary. Rules are stored as JSON in `quality_rules` column (nullable migration). The service validates rule type and field at creation time. The `mandatory` flag distinguishes blocking rules from informational ones.
- Consequences: A data product implementation can now be checked against its declared rules rather than requiring out-of-band documentation. The execution side (Python) reads these rules from the contract spec it receives; Phase 5 (CI evidence → ProductBaseline) will close the loop.

### NXD-036 — Validation Decision step, SoD, release gate integration (P5-S1)

- Context: `validation.approve` was denied to every role in `policy.ts` ("Reserved — never granted in v0.1"). No `ValidationDecision` model existed, so the chain `CI evidence → ProductBaseline → ValidationContext → IQ/OQ/UAT → evidence → findings/retest → independent review → Validation Decision → Release Gate` did not close. The release gate also set `approvedBy = actor` (SoD gap).
- Decision: Enable `validation.approve` for `PLATFORM_ADMIN` only (added to `ADMIN_PERMISSION_NAMES`). Add `ValidationDecision` model with statuses `APPROVED | CONDITIONAL | REJECTED`. Add `validation_decisions` DB table (one decision per context, unique constraint). Service enforces: (a) context exists, (b) status is valid, (c) justification is non-empty, (d) SoD — decider must differ from context creator. Add `POST /contexts/:id/decision` and `GET /contexts/:id/decision` routes. Add `ValidationDecisionResolver` interface to `ComposerService`; release gate adds `NO_APPROVED_VALIDATION_DECISION` blocker when the resolver reports no APPROVED decision for a referenced URS baseline.
- Consequences: `PLATFORM_ADMIN` can now record validation decisions. No other role can. SoD is enforced at the service layer. risk.accept and baseline.modify remain reserved.

### NXD-037 — Phase 5 completion: SoD on APPROVED, ValidationDecisionResolver wired, PQ added, baseline provenance (P5-S2..S5)

- P5-S2: SoD on ProductVersion APPROVED transition. `transitionProductVersionStatus` now throws InputError when actor === version.createdBy at APPROVED. The version author cannot approve their own work. New test asserts the refusal; all existing tests updated to use a separate `approver` actor.
- P5-S3: HTTP ValidationDecisionResolver wired in composer-backend/plugin.ts. `createHttpValidationDecisionResolver` fetches validation-expert contexts by baselineId, then queries the decision endpoint. Best-effort: any failure returns false (gate blocks rather than throws). The resolver is now injected into ComposerService so the release gate check is actually exercised in production.
- P5-S4: PQ added to ProtocolType (`'IQ' | 'OQ' | 'UAT' | 'PQ'`). `parsePqProtocol` reads `execution/PQ/PQ-Protocol.md`; returns [] when absent (PQ is optional). `getProtocol` dispatches to it. Router and coverage loop updated.
- P5-S5: ProductBaseline snapshot now includes `releaseCommitSha`, `artifactDigest` (when present on the version), contract `name` (Phase 4 field), and `dependencies` (ProductDependency IDs + contractIds at baseline time). Revalidation scope diff is now possible.

### NXD-038 — Phase 6: Analytics Providers, AI Data Analyst, Safe Preview (P6-S1..S3)

- P6-S1: `AnalyticsProvider` model added to `DataProductDescriptor`. Seven supported types (`PowerBI`, `Tableau`, `Looker`, `Metabase`, `Jupyter`, `Grafana`, `Custom`). Declared via `dataprod.platform/analytics-providers` JSON annotation. Unknown types coerce to `Custom`. Rendered in the OverviewTab when providers are declared. 3 new tests in `descriptor.test.ts`.
- P6-S2: Governed AI Data Analyst backend. `ComposerLLMClient` gains `analyzeProduct(question, productContext)`. `POST /api/composer/ai/analyze-product` accepts `{ question, productContext }` and returns `{ answer }`. The LLM sees only the product descriptor — no raw data. `buildProductAnalystSystemPrompt` enforces governance: no data fabrication, no false validation claims, always cite source. `analyzeDataProduct(baseUrl, question, productContext)` added to `composerApi.ts` for the frontend. Mock returns a labeled stub.
- P6-S3: Safe Data Preview row cap. `GET /consume/query` upstream responses are capped at 100 rows. Response includes `preview: true` when rows were truncated. Prevents accidental bulk extraction via the Control Plane.

### NXD-039 — Publisher Trust, Per-Namespace Scoping, Vendor Artifact Display (P7-S1..S3)

- P7-S1: Publisher Trust Level. `Publisher` gains `trustLevel: 'INTERNAL' | 'PARTNER' | 'COMMUNITY'` and `externalPublisher: boolean`. DB migration adds both columns as nullable (existing rows default to INTERNAL/false). `CreatePublisherRequest` accepts these fields. The service validates `trustLevel` against `PUBLISHER_TRUST_LEVELS`.
- P7-S2: Per-Namespace Permission Scoping (partial, NXD-014). `assertPublisherMembership` checks that `actor` is in `publisher.memberGroups` before certifying or publishing. Empty memberGroups = unrestricted (existing behaviour). The `certify` and `publish` router routes now pass the actor. This is the inline check NXD-014 recorded; full ResourcePermission integration requires per-permission conditional decisions not yet implemented in the repository.
- P7-S3: Vendor Artifact display. `MarketplaceOfferingView` gains `publisherTrustLevel` and `externalPublisher`. `listArtifactsWithVersions` enriches each artifact with its publisher's trust fields. `marketplaceOfferingsFromRegistry` propagates them. The Marketplace UI can now show Partner badges and Community disclaimers without an extra round-trip.

### NXD-040 — Vendor Artifact trust display in Marketplace (P7-S4)

- `MarketplaceItem` gains `publisherTrustLevel: string` and `externalPublisher: boolean`. `offeringViewToItem` maps these from `MarketplaceOfferingView` (which in turn receives them from `listArtifactsWithVersions` → publisher lookup). `MarketplacePage` renders a "Publisher" column: internal publishers show `item.provider`; external publishers show `✓ Partner` (PARTNER trust) or `⚠ Community` (COMMUNITY trust). The Marketplace table now exposes trust visually without requiring a separate publisher-detail screen.

### NXD-041 — Wave 2 Core Features: Notifications, Config Schema, Revalidation, Policies (W2-1..4)

- W2-1: Upgrade Notifications dispatch. `upgrade_notifications` DB table. `dispatchUpgradeNotifications(contractId, newVersion, summary, breaking)` creates one notification per active subscriber. Routes: `POST /contracts/:id/notify`, `GET /notifications?consumer=`, `PATCH /notifications/:id/read`. Producers announce upgrades; consumers poll for notifications.
- W2-2: Configuration Schema. `ConfigKeySchema { key, description, type, required, defaultValue, example }` with `ConfigKeyType = 'string'|'number'|'boolean'|'url'|'secret'`. `ComponentLibraryProfile.configurationSchema?` supersedes legacy `configurationKeys[]`. `compositionConfigSummary` uses schema when available, falls back to flat list. Type `secret` prevents logging/display.
- W2-3: Revalidation Scope. `GET /versions/:id/revalidation-scope` diffs the current approved baseline against the previous one. Returns `addedComponents`, `removedComponents`, `addedContracts`, `removedContracts`, `hasChanges`, and a `recommendation` string. Validators use this to scope IQ/OQ/UAT without full re-testing.
- W2-4: Policy references in Artifact Manifest. `spec.policies?: string[]` accepts exact-version Policy Pack coordinates (e.g. `nexora/gxp-data-product-policy@1.0.0`). `spec.requirements?: string[]` references URS requirement IDs. `validateArtifactManifest` validates both fields including the coordinate format for policies.
