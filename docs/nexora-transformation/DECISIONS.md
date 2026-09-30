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
  3. A generated label clears the highest existing _label_, not the row count,
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
  Separately, the method superseded the currently APPROVED baseline _before_
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
  is still the rule. But it was _not_ what made this suite flake, and the
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
  from depend on _when_ it was resolved. A validated Product has to be able to
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
  publishing and deprecating at DATA*PRODUCT_OWNER, and claiming a namespace
  at PLATFORM_ADMIN.
  Reviewing is deliberately \_not* a lifecycle transition: it sets
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
  _worker process_ and the `SqliteError` it raises carries the `Error`
  intrinsic of whichever jest module realm loaded it first. When another suite
  in the same worker got there first, `error instanceof Error` is false in the
  later file, and jest reports a non-Error rejection value as "Received
  function did not throw" (verified against a scratch test; a resolved promise
  instead says "Received promise resolved instead of rejected"). That single
  misleading message is what sent NXD-011 after the thenable.
- Decision: for errors raised by a _native_ driver, assert on the message
  rather than the type. A local `expectRefusedByDatabase(write, pattern)`
  helper awaits the write, fails loudly with a written-out explanation if the
  write was _accepted_ (the case that actually matters — a missing
  constraint), and otherwise matches
  `String((raised as {message?: unknown})?.message ?? raised)` against the
  pattern. Matching the message is realm-blind.
- Alternatives considered: `expect.assertions()` plus a manual try/catch in
  every test (same thing, repeated at each call site); forcing jest to one
  worker (`--runInBand` repo-wide costs far more than the bug); a custom jest
  matcher or `serializer`/`snapshotResolver` shim (more machinery than a
  nine-line helper); leaving `.rejects.toThrow()` and retrying the suite
  (hides a red that was telling the truth about _something_). Pure-JS drivers
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
  Fetch standard's blocked-port list, which `fetch` refuses _before_ opening a
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
  for _this_ bug, and it should be approved on its own merits rather than as a
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
  neither the same size nor the same idea: a kind says what an Artifact _is_
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
- Consequences: an offering whose category has no kind is _reported_ by
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
  order the offerings were _added over time_, not a designed one — so this is
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
- **Only nine of them can hit the bug.** The blocklist is a _Fetch_ standard
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
  product behind it yet; NXD-023 already named this as a question for _after_
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
  (`component:default/health`) with version _constraints_ (`1.x`);
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

### NXD-042 — Wave 3: Agent Instructions, Policy Resolver, Editions, Nexora-as-Product, Multi-hop Lineage, GP-8 Deprecation, Visual Lineage, Federation Foundation (W3-1..8)

- W3-5: Agent Instructions in all data product templates. `agent-instructions.md` added to oee-data-product, mqtt-temperature-product, rest-equipment-product, machine-state-consumer, aas-data-product. Covers controlled artefacts, implementation scope, requirements traceability, contract obligations, security rules, and AI autonomy limits ("Nexora defines and governs; you implement").
- W3-6: Policy Pack Resolver. `plugins/artifact-registry-backend/src/policyResolver.ts` resolves `spec.policies[]` coordinates against the registry, reads POLICY_PACK manifests' `spec.policyDocument.obligations[]`, and returns a typed `PolicyResolutionResult`. Exposed via `POST /artifact-registry/policies/resolve`.
- W3-8: Formal Editions. `catalog/editions.yaml` declares `nexora-core`, `nexora-life-sciences`, `nexora-manufacturing`, `nexora-enterprise` with capabilities, featured artifacts and extends hierarchy. `PlatformEdition` and `EditionCatalogue` types exported from platform-common.
- W3-3: Nexora manages Nexora. `catalog/nexora-core-product.yaml` registers the platform itself as a Backstage Component (`type: platform-product`) and as a `nexora/nexora-core` DATA_PRODUCT Artifact with `spec.policies` reference. Implements the "Nexora manages Nexora" principle.
- W3-1: Multi-hop Lineage DAG. `getFullLineageDAG(versionId, maxDepth=5)` in ComposerService performs BFS traversal up to N hops upstream and downstream. Returns `{ nodes, edges }` as a DAG. Cycle detection via visited set. Route: `GET /versions/:id/lineage/dag?depth=N`.
- W3-2: GP-8 Deprecation Notice. `nexora-industrial.ts` receives a prominent JSDoc `@deprecated` block with migration plan: create `nexora/industrial-vocabulary@1.0.0` COMPONENT Artifact, move exports, delete file. No new vocabulary to be added to this file.
- W3-4: Visual Lineage UI. `LineageDAGView` component added to data-products plugin. Layered column layout (Upstream → Root → Downstream). Consumes the `/impact/artifact` endpoint. Replaces plain text `<ul>` in the Lineage tab with a structured visual.
- W3-7: Multi-Registry Federation Foundation. `packages/platform-common/src/registry-federation.ts` defines `FederatedRegistry`, `FederatedArtifact`, `FederatedSearchResult`, `FederationConfig`. Types only — the HTTP fan-out client is the next slice.

### NXD-043 — Local container images take the name production already publishes

Four names existed for one artifact: `docker-compose.production.yml` defaults to
`ghcr.io/pharma-data-factory/data-product-platform:mvp-1.0`, `build-image` tagged
`pharma-data-factory:mvp-1.0`, `docker-compose.yml` tagged `nexora:latest`, and
`docker-compose.validation.yml` defaults to `platform-core:1.0-rc2`.

Decision: local images use `data-product-platform` — the repository component of
the GHCR path production already publishes. `build-image` produces
`data-product-platform:mvp-1.0`, `docker-compose.yml` uses
`data-product-platform:local`.

This is not a rebrand. Production's published name was never in question; the
two local names had drifted from it, so what a developer builds locally now
carries the same name as what ships. `pharma-data-factory` remains the GitHub
organisation and stays in the GHCR path, in schema `$id` URLs and in the 100-odd
documentation references — none of those are image names.

**`platform-core:1.0-rc2` is deliberately untouched.** It appears in formal
validation records (`docs/validation/00-phase0/`, `docs/archive/validation-expert-design.md`)
as the validated product candidate `platform-core-v1.0-rc2`. A name carried by
GxP evidence is a controlled identifier, not drift; renaming it would invalidate
the traceability those records establish.

`brandSeparation.test.ts` is tightened back to the single name. The guarantee it
exists to make — the stack pins an image this project owns, never a stock
upstream one — is unchanged.

### NXD-044 — Wave 1 open strategy items (P-EXT-S1..S5)

Recorded 2026-09-22; the wave landed 2026-09-21 in `17c8446` without a decision
entry.

- P-EXT-S1: Evidence provenance. `ProductBaseline.snapshot` carries a
  `_provenance` block with `snapshotChecksum` (`sha256:hex`),
  `snapshotTimestamp` and `createdBy`, and the audit event records the checksum.
  A baseline whose content is altered after the fact no longer matches its own
  checksum, so tampering is detectable rather than merely discouraged.
- P-EXT-S2: Publisher self-registration. `POST /publishers/self-register` lets a
  DEVELOPER create a COMMUNITY external publisher and adds the registrant to
  `memberGroups`. Promotion to PARTNER stays with a Platform Admin. This trades
  an admin bottleneck for a trust tier that cannot publish — a COMMUNITY
  publisher may submit DRAFT artifacts only. It is also the first read path for
  `memberGroups`, which [`NXD-014`](DECISIONS.md) had recorded as written but
  unread.
- P-EXT-S3: Change impact analysis. `GET /contracts/:id/impact` and
  `GET /impact/artifact?name=` answer "who breaks if this changes", one hop over
  direct `ProductDependency` links. One hop, not transitive: multi-hop arrived
  later as `W3-1`.
- P-EXT-S4: Contract subscriptions. `ContractSubscription` and the
  `contract_subscriptions` table, unique per contract and consumer, with
  `ACTIVE | PAUSED | CANCELLED`. A subscription is an operational registration,
  not an entitlement — it says "tell me when this changes", not "I may read
  this".
- P-EXT-S5: The `UpgradeNotification` type only. Persistence and dispatch were
  deliberately deferred to `W2-1` rather than shipped half-wired.

### NXD-045 — Policy Packs resolve into the Release Gate, and resolution fails open (5-R1, 7-R4)

`Product.declaredPolicies` (nullable `declared_policies` column, JSON array of
coordinates) records which Policy Packs a product claims.
`nexora/gxp-data-product-policy@1.0.0` is a POLICY_PACK Artifact with 8
obligations derived from FDA 21 CFR Part 11, EU Annex 11 and GAMP 5.
`checkReleaseGate` resolves the declared coordinates through an injected
`policyResolverClient` and raises `POLICY_PACK_UNRESOLVABLE` or
`POLICY_OBLIGATION_UNMET`.

**The resolver fails open: an unreachable resolver returns null and does not
block a release.** This is the deliberate part of the decision and it cuts
against instinct for a GxP control. The reasoning: the resolver is a
cross-plugin HTTP call, so its availability is an infrastructure property, not a
compliance property. Failing closed would convert every registry restart into a
release freeze, which trains people to bypass the gate. The obligations that
genuinely must hold are also checked directly against product data by
`platform-policy.ts`, which has no network dependency and fails loudly. The
policy pack layer adds distributable, versioned obligations on top of that
floor — it is not the floor itself.

An unknown check id raises `POLICY_OBLIGATION_UNMET` rather than passing
silently, matching the fail-loud rule in `platform-policy.ts`.

### NXD-046 — Nexora Core is a PLATFORM_PRODUCT on the normal lifecycle (7-R5, W3-3)

`PRODUCT_TYPES` gains `PLATFORM_PRODUCT` alongside `DATA_PRODUCT` and `SERVICE`,
and `bootstrapPlatformProduct()` registers `nexora-core` on plugin init —
idempotent, non-fatal, declaring `nexora/gxp-data-product-policy@1.0.0`.

The decision is that a platform product follows the **same** lifecycle as every
other product: Requirements → Baselines → Validation → Release Gate. No parallel
path, no exemption. This is what "Nexora manages Nexora with Nexora" has to mean
to be more than a slogan — if the platform needed its own lifecycle, the claim
would be false.

Bootstrap is non-fatal by design: a failure to register the platform product
must not prevent the platform from starting, or a self-referential bug becomes
unrecoverable without a database edit.

### NXD-047 — Federation syncs on an in-process interval, knowingly (A-3, 7-R2)

The artifact-registry plugin reads `artifactRegistry.federation` at startup and
runs an initial fan-out plus a `setInterval` sync. The fan-out uses
`Promise.allSettled` so one unreachable peer cannot block the others, with a 15s
`AbortSignal.timeout` per peer.

`setInterval` was chosen over a durable job with its limits accepted and stated:
the schedule dies with the process, runs once per replica rather than once per
cluster, and has no retry or backoff. This is tolerable only because federation
sync is idempotent and advisory — a missed sync delays the appearance of remote
artifacts, it does not corrupt local state. It would not be tolerable for
anything that writes.

A durable job (pg-boss or the Backstage scheduler) is the upgrade, and it is
scoped as part of Slice 5 in [`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md).
Until then federation is unconfigured in every `app-config`, so the scheduler
has never actually run.

### NXD-048 — A DataContract is identified by its coordinate, not by its component (closure Slice 1)

`DataContract` was keyed by `(product_component_id, lower(name))`. A consumer in
another Product therefore had no way to name a contract: the only route in was
the component that happened to declare it, and that component is an
implementation detail the producer may reorganise. `product.ts` carried a
comment promising a later Phase 4 slice would fix this; NXD-010 described what
it required. Neither happened until now.

Identity is now `namespace/name@version`, the same grammar as an Artifact
coordinate — reused rather than reinvented, and `isArtifactSegment` now
delegates to a single `isNameSegment` in `product.ts` so the two cannot drift.
`product_component_id` stays as the relation to the providing component.

**Names are lowercase kebab-case, tightened from free text.** This is the part
that costs something: a mixed-case name used to be accepted and folded
case-insensitively. It is now refused. The reason is that a coordinate is an
identity, and `slice1/Orders@1.0` and `slice1/orders@1.0` being two spellings of
one thing is precisely the ambiguity a coordinate exists to remove — especially
for a ref that may end up quoted in a validation record.

**The migration refuses rather than guesses**, following NXD-009. It stops on a
contract with no name, a name that is not a segment, or two rows that would land
on the same coordinate, and reports every offending row in one message so
remediation is a single pass.

Promoted rows land in a `legacy` namespace. Deriving one from the owning
Product's name was considered and rejected: Product names are free text
("Contract Product"), so derivation would either fail for almost every row or
require slugifying — and two different names can slug to the same segment, which
re-introduces the ambiguity. `legacy` states what is true: this contract was
identified by its component and has not been given a real namespace yet.

Exercising `GET /contracts/resolve` against an absent coordinate returned 500:
`respondError` had no `NotFoundError` branch, so "no such contract" read as "the
platform is broken". Fixed. The service tests now assert the error _types_, not
just their messages, because the router maps them by instance check and this
plugin has no router test harness.

### NXD-049 — Exchange is provider-neutral: the delivery mechanism is a string, not an enum (closure Slice 2)

Phase 4 asks for "provider-neutral exchange definitions". `DataContract` gains
an optional `exchange` block: `deliveryMechanism`, `endpoint`, `accessMode`,
`classification` and `sla`.

**`deliveryMechanism` is an open vocabulary.** This is the decision, and it cuts
against the rest of the model — `ProductComponent.interfaceType` is a closed set
(`REST | EVENT | MQTT | KAFKA | DB | FILE`), so adding a transport there needs a
Core release. `NEXORA_STRATEGY.md` makes exchange technologies providers rather
than Nexora domain truth, and a team publishing over something Core has never
heard of must not wait for one. The validator checks the _shape_ of the value —
lowercase kebab-case, the same grammar as a coordinate segment — and never its
membership in a list. `s3-parquet` is accepted today with no platform change.

The cost is real and accepted: two teams can spell the same transport
differently (`kafka` vs `apache-kafka`) and Core will not notice. A registry of
known mechanisms belongs in an Artifact if that becomes a problem, not in Core.

`endpoint` is deliberately opaque. Its meaning belongs to the mechanism — a URL
for `rest`, a topic for `kafka`, a bucket path for `s3-parquet`. Core stores and
returns it and makes no claim about it.

`accessMode` **is** a closed set (`OPEN | REQUEST | ENTITLEMENT`), because those
are statements about governance rather than technology; a fourth would mean a
new governance concept. It defaults to `REQUEST` rather than `OPEN` — an
unstated access rule should not read as "help yourself".

`classification` reuses `DATA_CLASSIFICATIONS` rather than introducing a second
sensitivity scale.

**Release gate.** A new `exchange-declared` obligation blocks a release when any
output contract lacks a mechanism — `every`, not `some`: a single silent
contract is the one a consumer trips over. The coordinate names a contract; the
exchange definition is what makes it reachable.

**Found while testing this.** `createProduct` never mapped `declaredPolicies`
from the request onto the Product, although `CreateProductRequest` declares it
and the `products` table has the column. Since `checkReleaseGate` only resolves
Policy Packs when `declaredPolicies` is non-empty, **the entire 5-R1 mechanism
was inert for every product created through the API** — the gate resolved
nothing, reported nothing, and looked like it had passed. Fixed here because the
new obligation could not otherwise be exercised at all. It is the second defect
in two slices that only surfaced because the Definition of Done requires running
the thing.

### NXD-050 — URS authoring is a governance tier plus an assignable domain role

Requested: only `data-product-owners`, `business-capability-leads` and
`platform-admins` may work on URS — but a developer must still be able to hold
those roles, and every change must be attributable under ALCOA and GMP.

Two mechanisms already grant URS rights and they stay separate, which is what
makes the request satisfiable:

- **Platform tier** — what someone is on the platform. `urs.create` leaves
  DEVELOPER and is restated on DATA_PRODUCT_OWNER (which inherited it) and
  added to BUSINESS_CAPABILITY_LEAD.
- **URS domain group** — what someone does with requirements, independent of
  tier. `urs-authors`, `urs-owners`, `urs-business-reviewers`,
  `urs-product-managers`, `urs-quality-reviewers`, applied by
  `decidePermission` on top of the tier.

So a developer authors requirements by being given `urs-authors`, not by being
a developer. The two axes are granted separately and audited separately, which
is the point: the audit trail records that _this person_ changed _this URS_,
and the role they held to do it is visible as a separate, separately-revocable
grant. Collapsing URS rights into the tier would have removed
`urs-quality-reviewers` and with it `urs.sign` — a 21 CFR Part 11 signature —
and the separation between whoever writes a requirement and whoever approves
it.

**BUSINESS_CAPABILITY_LEAD was inconsistent** and is corrected here. It ranks
above DEVELOPER (3 vs 2) but inherited from VIEWER, so it held `urs.read` and
nothing else — fewer rights than the tier below it. It now authors
(`urs.create`, `urs.manage`) but does not approve or sign: whoever writes a
requirement must not also be the one who signs it off.

**No test pinned any of this.** Removing `urs.create` from DEVELOPER left all
1822 tests green. For a permission deciding who may author a regulated
requirement that is not acceptable, so the rule is now asserted directly —
including the case the request turns on: a DEVELOPER plus `urs-authors` may
author, and still may not approve.

Attribution was verified rather than assumed. `audit_events` is append-only,
`urs_requirement_version_immutability()` raises `URS_IMMUTABLE` on a frozen
version, `updateRequirementSet` writes `updatedBy: actor`, and the persistence
guard refuses `memory` mode when `auth.environment` is production — a rule that
exists because production once ran the audit trail in process memory.

### NXD-051 — Users, roles and the audit trail live in the database; seeds are first-install only

User records were kept in `catalog/users.seed.yaml`, rewritten in place by the
users-backend, with the audit trail appended to JSONL files beside it. Both
paths resolved against `process.cwd()`, which is `packages/backend` for the dev
server and `/app` in the image. In a container the plugin therefore wrote
`/catalog/users.seed.yaml` while the catalog read
`/app/catalog/users.seed.yaml` — **a role assignment had no effect** — and
neither path was on a persistent volume, so every role change and every audit
record **died with the container**.

Records now live in `platform_users`, `user_audit_events` and
`user_sign_in_events`, owned by the users-backend through
`coreServices.database`. `knex@^3.0.0` was added to the package; it is the same
version three sibling plugins already declare and was already in the lockfile,
so no new dependency entered the repository.

**The seed runs once, against an empty table** — the pattern
`urs-composer-backend` established and proves in `wd-seed-persistence.test.ts`.
A restart does not rewrite a role an administrator changed, which is the whole
point. Content that _should_ be re-read on every start — components, templates,
Golden Paths — stays a catalog file location, because it is versioned in git
and is not edited at runtime.

**Demo accounts are refused in production.** The committed file carries
`viewer`, `developer`, `owner`, `admin` and four `urs-*` reviewers, two of them
holding `platform-admins`. Seeding those into a real deployment would create
administrators nobody asked for, and because the seed never runs again they
would stay. Under `auth.environment: production` the seed installs only
`users.bootstrapAdmin`, and says loudly if that is unset.

**The catalog reads a projection, not the store.** `catalog/runtime/platform-users.yaml`
is rewritten from the database at startup and after every change. A Catalog
entity provider would be tidier, but an entity provider is registered through
`catalogProcessingExtensionPoint`, and an extension point may only be consumed
by a module _of that plugin_ — a `createBackendModule({ pluginId: 'catalog' })`
would then receive the catalog's `coreServices.database`, not this plugin's, so
the provider and the router would read different databases. The projection
keeps the property that matters: the file is written _from_ the database,
never into it, and losing it costs nothing.

**EMU logins are accepted.** The login pattern allowed only `[a-z0-9-]`, so
`schmeckm_roche` — a GitHub Enterprise Managed User, where the organisation
shortcode is appended with an underscore — could not be created at all. Since
the entity name must equal the GitHub login for
`usernameMatchingUserEntityName` to resolve it, and this endpoint is the only
supported way to create one, an EMU account could not be given any role.

**The audit records what changed, not a copy of the entity**: `entity` already
holds the name, and `oldValue`/`newValue` carry `memberOf`, which is what a GMP
reviewer asks about. Both sides are stored, because "who granted this role" is
only answerable if the trail says what it was before. Removing a user leaves
their audit records standing.

Two mistakes made and corrected while building this, both worth recording. A
`seq` column was first declared inside the `createTable` block — a column added
there never reaches a database whose table already exists, and the read failed
with `no such column: seq` against a database created one start earlier. The
replacement attempt failed too: SQLite cannot add an autoincrement column to an
existing table. Ordering is now `(timestamp, id)` — deterministic without a
migration the dev database cannot perform.

### NXD-052 — CI writes release provenance to the ProductBaseline, write-once, as a service (closure Slice 3)

Phase 5 names the chain "CI evidence → ProductBaseline". `releaseCommitSha` and
`artifactDigest` have existed on the baseline snapshot since `P5-S5`, and
nothing ever wrote them: the only writers were a request body and a copy from
the version row. A field meant to identify one build was whatever a human last
typed. `POST /baselines/:id/provenance` closes that.

**Provenance is a set of columns, not a snapshot field.** `snapshot` carries
`_provenance.snapshotChecksum` from `P-EXT-S1`, a SHA-256 over its own
canonical JSON. Provenance arrives _after_ the baseline exists, so writing it
into the snapshot would invalidate the checksum the block exists to provide.
Snapshot tamper-evidence and build provenance are two different claims about
two different things and are stored separately. `release_commit_sha`,
`artifact_digest`, `provenance_timestamp` and `provenance_recorded_by` are
nullable — every baseline that already exists predates CI being able to post,
and a baseline for a version that is never built legitimately has none.
Absence is a release-gate question, not a schema violation.

**Write-once.** Re-posting identical evidence returns 200 and changes nothing,
including the timestamp, because a retried or re-run CI job is normal and
should not need to know whether its predecessor got through. Posting
_different_ evidence is a 409. Only one artifact was validated against a given
baseline; quietly replacing the SHA would make a controlled record describe a
build nobody checked. A SUPERSEDED baseline is refused outright — it is a
historical record and does not acquire new evidence. Approval status is
otherwise irrelevant: the release build normally runs _after_ approval, and
appending a fact about a build is not an edit to the controlled content.

**Both values are checked against a grammar**, unlike baseline _labels_, which
`NXD-007` deliberately checks only for presence. The reasoning is opposite in
each case and consistent underneath: a label often has to match a document
number in an external QMS, so Nexora cannot impose a shape on it, whereas a
commit SHA and an OCI digest have exactly one machine-issued shape each. An
abbreviated SHA is rejected because the record's whole purpose is to resolve
back to one commit years later.

**The blocker gets its own code.** `MISSING_CI_PROVENANCE`, not
`POLICY_OBLIGATION_UNMET`. Every other obligation on that list is answered by a
person filling something in; this one is answered by a build running. It fires
only when the product declares a policy carrying the new
`ci-provenance-recorded` obligation, so nothing that has not asked for build
provenance is blocked on it.

**CI authenticates as a service.** This is the first route in the repository to
accept `httpAuth.credentials(req, { allow: ['service'] })`, backed by
Backstage's own `backend.auth.externalAccess` static token — configured, not
invented, and no new credential type. The permission framework is deliberately
not consulted for it: the platform resolves a `PlatformRole` from catalog group
membership, and a service principal has no catalog identity, so asking the
policy would compare against an empty role set and deny. Possession of the
token is the authorization, which is the model Backstage intends here. A user
token on this route is refused with 403 — asserting what CI built is the one
thing a person must not be able to do by hand.

**The audit event goes to `composer_audit_events`.** The request named
`user_audit_events`; that table belongs to `users-backend`, lives in that
plugin's own `coreServices.database`, and carries a user/role schema
(`actor`/`action`/`entity`). Writing into it from the Composer is the direct
cross-plugin private-database access `AGENTS.md` forbids, and it is not
reachable from this plugin's connection in any case. The Composer's own
append-only trail already records `PRODUCT_BASELINE` events; the new one is
`PROVENANCE_RECORDED`.

**The obligation was added to `gxp-data-product-policy@1.0.0` without a version
bump**, following the `exchange-declared` precedent from Slice 2. This is a
known wart, not an oversight: bumping to `1.1.0` would strand every product
that declares `@1.0.0`, including the `nexora-core` product that
`bootstrapPlatformProduct` registers, and `NXD-030` records that an edited
manifest does not reach a registry already holding that coordinate — so a fresh
registry sees the new obligation and an existing one does not. Policy-pack
versioning needs its own slice; it should not be improvised inside this one.

**The CI step cannot fail the build.** `continue-on-error`, a best-effort
`curl`, and a warning annotation on a non-200. This is the first time CI writes
back into the platform, and an unreachable Composer must not turn a good build
red; the absence surfaces at the release gate instead, where a human is already
looking. Same fail-visible-not-fail-loud placement `5-R1` chose for policy
resolution. The step is inert until `NEXORA_COMPOSER_URL`,
`NEXORA_PROVENANCE_TOKEN` and `NEXORA_BASELINE_ID` are configured, and says so
rather than pretending to have posted.

### NXD-053 — Four defects that every test passed and no execution had ever reached

Executing Slice 3's path end-to-end, as `PHASE_CLOSURE_PLAN.md` DoD point 2
requires, found four defects in code that was already marked done. None was
introduced by Slice 3. All four share one shape: **the unit tests exercise the
modules directly, so nothing ever went through the wiring.** They are recorded
together because the pattern matters more than any one of them.

1. **The release gate answered 500 for every product.**
   `plugins/composer-backend/src/platform-policy.ts` and `platform-policy.json`
   shared a basename, so `import { evaluatePlatformPolicy } from
'./platform-policy'` in `service.ts` resolved to the **JSON** in the running
   backend — which exports no functions. Jest resolves `.ts` before `.json`, so
   the entire suite passed. The JSON is now `platform-policy.document.json`.
   Phase 5's terminal control had never once executed in the application.

2. **`POST /policies/resolve` answered 500.** The route did
   `const { resolvePolicies } = await import('./policyResolver')`; the plugin
   transpiles to CJS, where `await import()` of a CJS module yields
   `{ default: exports }`, so the destructured binding was `undefined`. Now a
   static import.

3. **The route rejected its only caller.** It authorized with
   `allow: ['user']`, but the Composer's release gate calls it with a _plugin_
   token — a service principal — so it answered 401. Added
   `authorizeReadOrService`.

4. **The Composer never sent the request at all.**
   `createHttpPolicyResolverClient` passed `onBehalfOf: {} as never` to
   `getPluginRequestToken`, which throws; the surrounding `catch` returned null
   with no log, and null means fail-open (`NXD-045`). Now
   `auth.getOwnServiceCredentials()`, and **every fail-open return logs why** —
   a fail-open path with no log is indistinguishable from a pass, which is
   precisely how this survived.

Defects 2–4 stacked: each on its own was enough to make `5-R1`'s Policy Pack
enforcement inert, so fixing fewer than all three would have changed nothing
observable. Slice 2 had already found and fixed a _fourth_ independent cause
(`createProduct` never mapped `declaredPolicies`). Between them, the release
gate has reported no policy obligation since `5-R1` landed, while reading as a
pass.

**Three sibling clients carry defect 4 unfixed** —
`urs-baseline-resolver.ts:61`, `catalog-component-loader.ts:41` and
`validation-decision-resolver.ts:41` all pass `onBehalfOf: {} as never`, and
all three fail open or fall back silently. They are left alone here on purpose:
each needs its own executed path to verify (a real URS baseline, a real
catalog, a real validation decision), and fixing them blind would repeat the
mistake this record exists to describe. The consequence while they stand is
that the release gate's `NO_APPROVED_URS_BASELINE` and
`NO_APPROVED_VALIDATION_DECISION` checks, and the catalog context for AI spec
generation, are also inert in the running application.

### NXD-054 — The three remaining cross-plugin clients, and the correction NXD-053 needs

Closes the residual gap `NXD-053` recorded. `urs-baseline-resolver.ts`,
`catalog-component-loader.ts` and `validation-decision-resolver.ts` all passed
`onBehalfOf: {} as never` to `getPluginRequestToken`, which throws, and all
three swallowed the throw. They now pass `auth.getOwnServiceCredentials()`.

**`NXD-053` mischaracterised two of these three and is corrected here.** It
called them "inert", by analogy with the policy resolver, which genuinely
failed open. Only the catalog loader does that. The other two fail **closed**:

- `resolveApprovedBaseline` _throws_ on a failed request, and the gate converts
  the throw into a `NO_APPROVED_URS_BASELINE` blocker.
- `hasApprovedDecision` returns `false`, which the gate converts into
  `NO_APPROVED_VALIDATION_DECISION`.

So these two were not letting bad releases through — they were **blocking good
ones**, reporting a properly approved baseline as unapproved. Safer than the
alternative, and still wrong, because the blocker names the product when the
fault is in the platform. Stating it accurately matters: "inert" would have
had someone looking for releases that should have been stopped, and there were
none.

**Fixing the clients was not sufficient; the routes had to change too.** Both
`urs-composer` and `validation-expert` authorize reads with
`allow: ['user'], allowLimitedAccess: true`. `allowLimitedAccess` admits a
limited _user_ token forwarded on someone's behalf — it does not admit a
service principal, so a correctly minted service token would still have been
refused. Five read routes now use an `authorizeReadOrService` helper:
`GET /baselines/:id`, `GET /requirement-sets/:id`,
`GET /requirement-versions/:id`, `GET /contexts` and
`GET /contexts/:id/decision`.

**Service identity rather than the caller's is the right answer here, not just
the easy one.** The alternative is threading the requesting user's credentials
through `ComposerService` into each resolver. That would make the gate's verdict
depend on the caller's URS and validation permissions — so a developer without
URS read access would see `NO_APPROVED_URS_BASELINE` on a perfectly releasable
product. Whether a baseline is approved is a fact about a controlled record; it
must not vary with who asks. Nothing writable was opened: recording a
ValidationDecision is still `POST /contexts/:id/decision`, PLATFORM_ADMIN only,
with Segregation of Duties intact.

**A second, independent defect in the validation resolver.** `GET /contexts`
answers `{ items: [...] }`; the client typed the body as a bare array and
called `.find` on it, which throws, which the catch turned into "not approved".
Even with authentication fixed, `hasApprovedDecision` could not have returned
`true` under any circumstances. It now accepts either shape.

**Every silent failure path now logs.** This is the part that generalises. A
`catch {}` around a call that fails open — or fails closed onto a
product-shaped blocker — is why four defects survived across two plugins and
several months: the symptom was always indistinguishable from a legitimate
finding. `getOwnServiceCredentials` is also declared **required**, not
optional, so a test mock that omits it fails to compile; the old signature let
production pass `{}` while the mock passed nothing, and no test could have
noticed.

**What was executed, and what was not.** Live against a running backend: a
service principal is accepted by all five routes (404 "Baseline not found" and
200 `{"items":[]}`, not 401); the Composer's gate produced
`NO_APPROVED_URS_BASELINE: … (HTTP 404)` — the real answer from urs-composer,
reached with a minted token — and the log shows two authenticated requests to
`urs-composer` and three to `validation-expert`, with zero token-minting
failures and zero 401/403. **The APPROVED branch was not executed live.**
Producing an approved URS baseline requires several distinct identities under
Segregation of Duties, and local guest auth supplies one; that branch is
covered by `crossPluginAuth.test.ts` instead. Recorded as a limitation rather
than glossed, because it is the one step of the chain still proven only by
test.

### NXD-055 — A Product Version holds its requirements as a snapshot, not a pointer (Slice 1a/1b)

An analysis of the URS → Product Development handoff found the journey broken
at exactly one joint. The URS side is complete — lifecycle, e-signatures with
SoD, an immutable `Baseline` with a stable UUID, PostgreSQL triggers that
content-freeze released versions. The Product side received none of it:
`Product` had no URS field at all, `ProductVersion.baselineId` pointed at a
_ProductBaseline_, and the only URS binding anywhere was
`ProductBaseline.ursBaselineIds` — a nullable JSON column on an optional child
record, written by exactly one code path (`applySpecDraft`, fed by a UUID
pasted into a free-text box on `/compose`, from a draft held in a
non-persistent `Map`). The frontend client hard-coded an empty body, and no
component called it.

Requirement _text_ was read exactly once, by `resolveBaselineContext`, to build
an LLM prompt, and thrown away. So there was nothing on the product side to
map, count, show coverage against, or hand to a developer — every other gap in
the handoff was downstream of that one absence.

**`ProductRequirement` is a copy, not a reference.** The product implements the
requirements in the wording it was built against; a pointer into a living URS
cannot answer "which text was tested?", which is the question an inspection
asks. `contentHash` carries the URS side's own SHA-256 over the signed content,
so the copy can be proven to be that wording. Rows are written once and never
updated — a revised baseline produces a new binding on a new version.

This also means the Product Composer stores requirement text it does not own.
That is deliberate and is the same trade `ValidationContext` already makes for
`requirementIds`: a controlled record has to survive the revision of its
source, and a cross-plugin read at display time would show today's wording
against yesterday's evidence.

**Three refusals, each chosen rather than defaulted.** Binding requires the
version to be `DRAFT` (the requirements a version implements are part of what
was approved); refuses a second binding (rebinding is change control — a new
version keeps both relationships on the record, overwriting keeps neither); and
refuses a requirement with no stable `requirementRef`, because a requirement
nothing can reference produces coverage that can never be satisfied.

**`resolveBaselineContext` now rejects a partial requirement list instead of
warning.** Its own comment already said "a partial requirement list is worse
than none for a GxP context: it looks complete" — and then returned it. Both
callers were wrong in the same way: the binding would freeze a snapshot missing
requirements nobody would notice were absent, and spec generation would ask the
model to design against a subset while the draft claimed the baseline. Neither
caller can distinguish a short list from a short baseline, so the decision
belongs in the resolver. Enrichment from the requirement _set_ (solution name,
capabilities) still degrades to a warning — losing it degrades the context,
losing a requirement corrupts it.

**Identity is `(product_version_id, urs_requirement_version_id)`, in the
database as well as the service** (NXD-009). The service refuses a rebind, so
the unique index is the only thing that can stop a concurrent second write.

**Verification and validation are two axes, not one status** —
`NEXORA_STRATEGY.md`: "Engineering Verification and formal Pharma Validation
are separate but traceable." Both hang off the same `requirementRef`, which is
the stable logical id (`URS-OEE-014`) that `ValidationContext` already speaks;
the version UUID is the identity key but never the join key. Slice 1b reads
per-requirement coverage from the Validation Expert through the existing
`GET /contexts/:id/coverage`.

**`getValidationCoverage` returns `undefined` where `hasApprovedDecision`
returns `false`.** The gate needs a verdict and must fail closed. A coverage
table must not: rendering an unreachable validation-expert as "nothing is
validated" states something about the product that was never checked. The UI
shows "Validated — unknown" for that case rather than zero.

**The release gate was already written and could not fire.** `NO_URS_BASELINE`
and the `urs-baseline-bound` obligation have existed and been tested since
Phase 5, but only `applySpecDraft` ever set `ursBaselineIds`, so on the normal
path the check was unreachable. `createProductBaseline` now inherits the
version's binding when the caller states none, which makes a dormant gate live
without touching the gate. An explicit `ursBaselineIds` still wins, for a
version bound before this existed.

**Two defects fixed in passing, both inside the path this slice touches.**
`applySpecDraft` created components and discarded their `traceabilityRefs`,
even though the prompt demands them and the draft carries them — so every
AI-generated product failed its own release gate on `INCOMPLETE_TRACEABILITY`.
It now creates the `IMPLEMENTS` links, skipping refs that match no requirement
in the baseline (a link to a requirement the baseline does not contain is worse
than a missing one). And `ProductDetailPage` loaded components for the _latest_
version while the picker selected any version; requirements are per-version by
definition, so the mismatch had to be resolved rather than inherited.

**The free-text requirement id is gone.** The traceability form's `sourceId`
was a text box with placeholder `URS-OUT-001`; a typo stored fine, counted as
coverage, and pointed at nothing. It is now a select over the bound baseline.
Coverage still matches links written against either the ref or the version
UUID, so links created before this slice keep counting.

**What was executed, and what was not.** The gate is green — 214 suites, 1903
tests, `tsc`, `lint:all` and `guard:platform` all pass, including 21 new tests
covering the binding, the snapshot, both coverage axes and the identity
constraint on SQLite.

The migration was additionally executed against real PostgreSQL, since NXD-009
makes that the standing rule for an identity constraint and the composer suites
are SQLite-only. Four things were observed rather than assumed: all sixteen
columns of `product_requirements` exist; `product_versions.urs_baseline_id` is
added; the unique index refuses a second row for the same
`(product_version_id, urs_requirement_version_id)`; and the foreign key refuses
a requirement whose version does not exist. It was also run against a schema
that predates the slice — the pre-existing version row survives with
`urs_baseline_id` NULL — and run four times over, unchanged after the first.
This was a one-off execution, not a committed suite: the PostgreSQL helper
lives in `urs-composer-backend` and importing it would add a second
`CROSS_PLUGIN_BOUNDARY` warning to the one already on record.

**The slice has not been exercised against a running stack.** Producing an
approved URS baseline requires several distinct identities under Segregation of
Duties, the same limitation NXD-054 recorded. Recorded rather than glossed:
this repository has found four defects that every test passed and no execution
had ever reached (NXD-053), and the UI path in particular is not yet outside
that class.

### NXD-056 — `/products` is the Product page; the catalog page stays the consumer view

Two pages both call themselves a product. `/products/:productId` is backed by
the Composer domain — versions, baselines, requirements, traceability, release
gate — has no tabs, and is not in the sidebar. `/data-products/:name` is backed
by a Catalog entity, has ten tabs, and is where users actually are. Slice 1a put
the requirements on the first one, which forced the question.

**Decision: they stay separate.** `/products` is the Product page and gets the
owner-facing tab set (Overview, Requirements, Architecture, Contracts,
Development, Tests, Validation). `/data-products` keeps the consumer-facing
view.

They answer different questions for different people. `/products` answers "is
this fit to release?" — read by the product owner and QA. `/data-products`
answers "can I use this data?" — read by a consumer. Seven of its ten tabs
(Data, API, Realtime, Quality, Lineage, Ownership, and most of Contracts) are
consumer-facing. Putting GxP evidence between them serves both badly.

**The load-bearing reason not to merge now: the two records have no shared
identity.** The scaffolder creates the Catalog entity, `POST /products` creates
the Composer row, and nothing joins them. Making the catalog page the product
page today would require a key onto the Composer row, and the only available
one is a Catalog annotation — which is exactly what
`dataprod.platform/urs-baseline` already is: the same fact in two places, never
synchronised, read by nobody. Repeating that pattern to solve a UI question
would be the second instance of the defect class, not a fix.

Step 2 of the URS → Product roadmap ("one door" — a `nexora:product:create`
scaffolder action that writes the repo, the entity and the `products` row in
one act) gives the two records a shared identity at birth. A merge, or a
cross-link, is only clean after that. So the page decision is taken now and the
merge is deliberately not.

**Consequences, in order.** `/products` goes into the sidebar under _Build_ —
that group currently offers `/create` and `/compose` and then no destination,
so the product page is its missing end, and a page holding release governance
that cannot be navigated to is a defect on its own. Tabs replace the single
scroll; the content for Overview, Requirements, Architecture and Tests is
already on the page, so it is re-sorting, not new work. A one-line cross-link
in each direction follows Step 2.

**If this is reversed** and the catalog page becomes the product page, Step 2
must be pulled forward ahead of any further UI work. Without the shared
identity there is no way to attach the requirements view there except the
annotation this record rejects.

#### Addendum, 2026-09-24 — executed with six tabs, not seven

The tab set ships as Overview · Requirements · Architecture · Contracts ·
Tests · Validation. **`Development` is not built.** Nothing on the Product
joins it to a repository: `Product` has no repository field, no entity
reference and no scaffolder bearing, which is precisely the shared identity
Step 2 creates. The tab would have had a heading and an explanation of what is
missing, and nothing else. A tab that resolves to an apology is worse than a
tab that is not there — the record's own argument against attaching the
requirements view to the catalog page through an annotation is the same
argument: do not build the joint before the identity exists.

It goes in when Step 2 lands, next to the cross-link that was already deferred
to the same step. String tab keys rather than the numeric index
`URSRequirementSetPage` uses, so inserting it later moves nothing.

**The record said four tabs were "re-sorting, not new work". That was true of
four and wrong about the rest being expensive.** Contracts, Tests and
Validation turned out to need no new endpoint and no new backend work at all —
the data was already reaching the browser or already had a route:
`GET /components/:id/contracts` and `GET /versions/:id/dependencies` for
Contracts, `ProductBaseline.provenance` for build evidence, and the coverage
row's `testIds`/`runIds`/`findingIds`/`validated` for the other two. Slices 1,
2 and 3 of the closure plan had each landed a backend capability that no page
displayed. Three tabs of this slice are that backlog becoming visible.

**Two defects found while moving the code, both fixed here.**

`addComponent` wrote against `latestVersion` while the picker selected any
version, so a component added while viewing 1.0.0 landed silently on 2.0.0.
This is the same defect NXD-055 fixed on the read path and did not check for on
the write path. The form is now scoped to the selected version, and refuses
outside `DRAFT`. That refusal is **UI-only**: `addProductComponent` in the
service checks no status, so an API client can still change a released
version's architecture. The rule belongs in the service and is recorded as
open — the page not offering it is not the same as the platform not allowing
it.

Every `TextField` on the page was unlabelled. Material UI v4 does not generate
an `id`, so without an explicit one the `<label>` is associated with no input:
the version picker, the baseline picker and all seven form fields were
anonymous controls to a screen reader. Found because a test could not query
them by label, which is the same lookup assistive technology performs. All
fields now carry an `id`.

**Verified:** `tsc`, `lint:all`, `guard:platform` and the full suite pass, with
six new tests over the tab shell, the version-scoping fix, the three-valued
validation display and the absent-provenance case. Not verified against a
running stack for the same reason NXD-055 records — producing an approved URS
baseline needs several identities under Segregation of Duties.

### NXD-057 — Segregation of Duties is demonstrated by switching seat, not by granting every role

- Date: 2026-09-25

Every decision record since NXD-055 ends with the same caveat: _not verified
against a running stack, because producing an approved URS baseline needs
several identities under Segregation of Duties, and local guest auth supplies
one._ Three records carried it. It was treated as a documentation footnote; it
is a defect in the product's ability to be shown, and the reason four of the
release gate's blockers had never been cleared by anyone.

A live run as the shipped Guest stops with a message that is exactly right:

    403 A APPROVED_QA signature requires the QUALITY_REVIEWER role.
        Your roles: PRODUCT_MANAGER, AUTHOR.

**Decision: the chain is walked by more than one identity, and the separation
stays real.** A local-only `demo` auth provider signs in as one of a fixed
allow-list of named catalog users (`demo-author`, `demo-reviewer`,
`demo-quality`), and the demonstrator switches seat between the steps.

**Alternative rejected: grant one identity every role.** It clears the 403 and
proves nothing. An approval chain one person can walk alone is not an approval
chain, and the repository already makes this argument in
`app-config.guest-developer.yaml`. `approveApprovalStep` does not let ADMIN
bypass a step's role, and `verifySegregationOfDuties` refuses a signature from
whoever authored the version; both must stay.

**Where the elevation has to happen, and the defect that taught us.**
`app-config.guest-developer.yaml` claimed to raise Guest to DEVELOPER by
listing `auth.providers.guest.ownershipEntityRefs`. **It never did anything.**
The upstream guest resolver reads that list only as a fallback:

    try { return await ctx.signInWithCatalogUser({ entityRef: userRef }) }
    catch { return ctx.issueToken({ claims: { sub: userRef, ent: ownershipRefs } }) }

`user:default/guest` is in the catalog, so the first line always succeeds and
ownership comes from the entity's `spec.memberOf`. Loading the file changed the
merged config and nothing else; the issued token still said `platform-viewers`.
`app-config.docker-local.yaml` carried the same dead list — including
`platform-developers`, a group that does not exist, which nothing that read the
list could have noticed.

So both the Guest elevation and the demo identities write to `platform_users`,
the table the Catalog projection is generated from, before that projection is
written. That reaches further than a token claim: `getUserApprovalRoles`
resolves approval roles off the same entity, so a `urs-*` group granted here is
an approval role and not just an ownership string.

**Not `catalog/users.seed.yaml`.** NXD-051 made the seed run once against an
empty table, deliberately, so a restart never rewrites a role an administrator
changed. That is right for first-install content and wrong for these: anyone
with an existing dev database would never receive them — the "works on a fresh
install only" class of defect this batch exists to close.

**Three properties, enforced in code rather than assumed from the config being
absent.** Refused when `auth.environment` is production, because a config file
gets copied. Inert when unconfigured, so the default install is untouched.
Idempotent and silent when unchanged, so a restart loop does not bury the audit
trail — the record answers "who granted this role", and a hundred identical
entries is not an answer.

**Consequence, stated rather than hidden: removing the config later does not
demote an identity it already raised.** Grants live in the database precisely so
a restart cannot overwrite them, and an absent key is indistinguishable from a
role an administrator set on purpose. Lower it through Admin → Users & Roles,
like any other account.

**One wart, pre-existing.** `GROUP_TO_APPROVAL_ROLE` maps `data-product-owners`
to `PRODUCT_MANAGER` as a retained alias, so all three demo identities hold
PRODUCT_MANAGER and step 2 of the workflow is satisfiable by any of them. Steps
1 and 3 are not, and those are the ones that carry the separation. Named here
rather than papered over.

`app-config.demo.yaml` also sets `ursComposer.persistence.mode: postgres`
instead of the shipped `memory`, because walking the chain takes three sign-ins
and several minutes and losing the set to a restart makes the journey
untestable in the way this profile exists to fix. `postgres` names the
repository implementation, not the server — on the dev SQLite file
`applyGxpConstraints` is guarded on the `pg` dialect, so the immutability and
append-only triggers do **not** exist there. Good enough to demonstrate the
journey; not a regulated store.

- Affected components: `plugins/users-backend` (`demoIdentityProvider.ts`,
  `demoUsers.ts`, `guestRole.ts`), `packages/app/src/modules/identity`,
  `app-config.demo.yaml`, `app-config.guest-developer.yaml`,
  `app-config.docker-local.yaml`, `packages/backend/src/index.ts`.

### NXD-058 — The release gate's blockers become clearable: four written controls reach a user

- Date: 2026-09-25

The release gate is the best-built thing in `composer-backend` and was the least
reachable. Driving the journey as a user found that four of its blockers named
evidence **no screen could produce**, and two write paths that had been
written, routed, tested and exposed on the frontend client were called by
nothing. This is the same shape as NXD-053: the unit tests exercise the modules
directly, so the wiring had never carried a request.

**Decision: close the paths, and measure the closure with a test that drives
the gate rather than a document that claims it.**
`releaseGateProgress.test.ts` performs the operations the Product page now
offers and asserts which codes clear **and which remain** — a test that only
checked the happy direction would let the gate quietly stop asking for
something. Starting position for a product created the way the Products page
creates one: `INVALID_STATUS`, `NO_APPROVED_BASELINE`, `NO_COMPONENTS`,
`POLICY_OBLIGATION_UNMET ×3`. After: `INCOMPLETE_TRACEABILITY` and
`NO_URS_BASELINE`, both deliberately, each naming a later batch.

Four defects behind it, none introduced here:

- **`updateProduct` never mapped `dataClassification`, `lifecycle` or
  `declaredPolicies`.** Requested, stored, and dropped in the mapping — the
  identical omission NXD-049 found in `createProduct` for `declaredPolicies`,
  in the sibling method, unfixed. `data-classification-declared` is one of the
  three platform-policy obligations every product must meet, so the gate was
  asking for something the write path could not record. The create form
  collects four of sixteen fields and nothing called `PUT /products/:id`, so
  owner, classification and GxP relevance were unsettable for the entire life
  of a product.
- **`updateProduct` validated nothing.** `POST /products` with
  `gxpRelevance: 'TOTALLY_MADE_UP_VALUE'` returned 201 and stored it, on the
  field that classifies regulatory relevance — and because the gate only asks
  whether the field is _set_, the garbage **satisfied** `gxp-relevance-set`.
  `GXP_RELEVANCE_LEVELS` and `PRODUCT_CRITICALITIES` are now named vocabularies
  and `validateProductGovernance` checks new writes against them. The stored
  type stays `string` and existing rows are untouched: NXD-009's rule that
  nothing relabels a controlled classification unattended is about _reading_,
  and was mistaken for one about writing. The function is separate from
  `validateProduct` so a partial update need not restate name and productType.
- **`createProductBaseline` and `approveProductBaseline` were called from no
  page.** So `NO_APPROVED_BASELINE` was a blocker no user could clear, on a gate
  that refuses to release without it. `BaselinesSection` sits on Overview beside
  the gate rather than on the Tests tab, where baselines are also shown: Tests
  reads build evidence off a baseline that already exists, and a baseline is
  created and approved while the version is still DRAFT.
- **`ComposerRepository.updateProduct` incremented `revision` a second time.**
  The service had already advanced it, so every edit moved the revision by two —
  a counter that skips is no longer a count of anything.

**The URS side had the same class of gap, one joint earlier.** No client method
existed for the two version-transition routes and nothing called
`signRequirementVersion`, so a requirement version could not leave DRAFT from
the browser. A baseline may only be released once every version it pins is
APPROVED, so **no baseline a user created could ever be released**, and
`/baselines/approved` — the list the Product page binds against — was
permanently empty. The whole URS → Product journey stopped there. The rule is
extracted into `reviewChain.tsx` rather than branched inline in a 1600-line
page, so the step the journey turns on can be tested without a DOM.

The chain's asymmetry is preserved in the UI and stated in the code: the first
three steps are transitions that move the set together; **APPROVED is not a
transition at all** — `assertTransition` refuses IN_APPROVAL → APPROVED, and a
version gets there only as the consequence of a valid `APPROVED_QA` signature.
Signing is per version, each bound to its own content hash, with the PIN
entered once for the set; the loop stops at the first refusal, because a role or
SoD failure will refuse every remaining version for the same reason and
continuing turns one accurate message into a list of identical ones.

**Two storage defects found the same way.** `baselines.approval_instance_id` had
been declared on the type since P1A and read by `postgres-repository.ts` off a
column **no migration ever created** — so it read `undefined` every time and
`submitBaseline` never wrote it. The in-flight approval chain was therefore
reachable only from the React state of the submit call: reload the page
mid-approval and the approval you were part of was gone. And the two approval
workflows existed only in `db/seeds.ts`, which only `postgres-repository.ts`
runs — so in the `memory` mode `app-config.yaml` ships, the table was empty and
`submitBaseline` failed with `Workflow not found` on the default developer
setup. They are now reference data in `data/approvalWorkflows.ts` that both
repositories derive from, like `BUSINESS_CAPABILITIES`.

**Error types, not just messages.** Three URS refusals threw a bare `Error`,
which `respondError` maps to `500 {"error":"Internal server error"}` with the
reason only in the server log. Creating a requirement set is the first write a
new user makes and both of its refusals are caller-fixable; telling them
"internal server error" is wrong twice. Now `InputError`, `NotFoundError` and
`ConflictError`.

**One UI decision that is not cosmetic.** `public/index.html` paints
`html, body, #root` in the signed-out shell's navy, and Material UI v4 injects
above that static rule, so `CssBaseline`'s `background.default` never wins and a
page rendering bare text put near-black type on navy at roughly 1.05:1 —
invisible. Content moves onto `InfoCard` surfaces with the tab bar left on the
canvas, which is what every readable page here already does. Fixed per page
rather than in the theme deliberately: `/compose` and `/model-company` are
designed _for_ the dark canvas, so repainting it globally would fix this page by
breaking those two.

- Affected components: `packages/platform-common/src/product.ts`,
  `plugins/composer-backend` (service, repository),
  `plugins/urs-composer-backend` (service, migrations, repositories,
  `data/approvalWorkflows.ts`), `plugins/urs-composer`
  (`URSRequirementSetPage.tsx`, `reviewChain.tsx`, api client),
  `packages/app/src/modules/products`.

**Verified:** all four gates green on 2026-09-25 — `guard:platform` (9 pass,
9 documented warnings, 0 fail), `tsc`, `lint:all`, and `CI=true yarn test` at
221 suites / 1958 tests / 0 skipped, with PostgreSQL up. Seven new suites cover
the governance vocabulary, the update path, gate progress, the workflow seed in
both persistence modes, the approval-instance column and the review chain.
**The end-to-end run against a live stack is what NXD-057 exists to make
possible and is not yet recorded here** — the batch closes the paths, and
walking them as three identities is the next act. **Done the same day; see
[`NXD-059`](DECISIONS.md).**

### NXD-059 — The journey was walked, and a transaction does no I/O it does not own

- Date: 2026-09-25

The walk NXD-057 exists to make possible was performed against a running stack:
`yarn start:demo`, three sign-ins, URS → review chain → QA signature → baseline
→ three approvals → Product → binding → release gate. It completes. It did not
complete on the first attempt, and what stopped it had been stopping it since
the signature feature was written.

**The whole chain now executes.** The requirement versions reach APPROVED
through a QA signature, the baseline reaches APPROVED through three
role-separated approvals, `/baselines/approved` answers with it, the Product
version binds it and reports holding its two requirements, and the release gate
returns `INCOMPLETE_TRACEABILITY` and `NO_APPROVED_VALIDATION_DECISION` —
`NO_URS_BASELINE` is gone, because the binding is real. **That is the first time
the deepest branch of the release gate has been reached in the application.**
[`NXD-054`](DECISIONS.md), [`NXD-055`](DECISIONS.md) and
[`NXD-056`](DECISIONS.md) each close with a note that the APPROVED branch could
not be exercised live for want of several identities. That note can be retired.

The segregation of duties held under test rather than by assertion: the author
was refused the QA signature on their own work
(`A APPROVED_QA signature requires the QUALITY_REVIEWER role. Your roles:
PRODUCT_MANAGER, AUTHOR.`), and each approval step refused an identity that did
not hold its role.

## The defect that made signing impossible

`getUserApprovalRoles` is an HTTP call to the catalog. `SignaturePinReAuth` is
bound to the **base** repository, deliberately, so a failed PIN attempt is
counted even when the signature rolls back. Both were called from inside
`repository.withTransaction`, and both need a second database connection, which
the transaction is holding. Knex waits 60 seconds for a connection that cannot
be released until the transaction it is blocking finishes.

Neither failure looks like what it is:

- the role lookup's outgoing plugin token cannot be minted (that needs a
  connection too), so the request goes out unauthenticated and the catalog
  answers **401**. The user is told
  `Failed to resolve approval roles for <user>: Request failed with 401
Unauthorized` — which reads as a permission problem, and sends whoever is
  debugging it into the RBAC configuration;
- the PIN check surfaces as **500 Internal server error**.

So **no requirement version could ever be signed**, therefore none could reach
APPROVED, therefore no baseline could be released, therefore the Product page
could bind nothing. The gap NXD-055 and NXD-056 recorded as "not verified
against a running stack" was not a gap in verification. It was this.

**The evidence, because guessing at it wasted more time than measuring it.** A
probe logged the same credentials object (`principal.type: user`, unexpired) on
both paths; the same call returned `PRODUCT_MANAGER,QUALITY_REVIEWER`
immediately before `withTransaction` and 401'd inside it, with
`KnexTimeoutError: Timeout acquiring a connection` in the backend log exactly 60
seconds later. The catalog access log shows the same URL answering 200 on the
approval-step path and 401 on the signature path, 150 ms apart.

**Decision: a transaction does no I/O it does not own.** Roles are resolved and
the second factor is verified before the transaction opens;
`signatureServiceFor` takes the signer and pre-resolves, and `SignRequest`
carries `secondFactorVerified` so `sign` does not repeat a check it cannot make.
This keeps the property the re-authentication store exists for — a failed
attempt is recorded outside the transaction, so a rollback cannot erase it —
rather than trading it away by moving the check onto the transactional
repository.

**No test could have caught it and the new one does not catch it either.** The
suites drive the service with an in-memory repository and a stub catalog, where
neither call costs a connection. `transactionBoundary.test.ts` therefore pins
the _ordering_: its stubs throw if either call arrives while a transaction is
open. Mutation-checked — removing the fix turns it red.

## Six more findings, recorded and not fixed

Each was produced by the walk, each is real, none is in Batch 1's scope:

1. **Approval order is not enforced.** On one run the QUALITY*REVIEWER step was
   approved while the PRODUCT_MANAGER step was still open, and the platform
   accepted it. `approveApprovalStep` checks the step's status and the actor's
   role, and never that it is the \_current* step. A three-step GxP chain whose
   steps can be taken in any order is a set of approvals, not a chain — this is
   the most serious of the six.

   **Closed 2026-09-25.** A step is refused while any _required_ step with a
   lower `sequence` is neither APPROVED nor SKIPPED, and the refusal names the
   step that is blocking. Two choices worth recording: only required steps
   block, because treating an optional step as a barrier would make it
   mandatory by the back door; and the order check sits with the step-status
   check, before the role check, which is this method's existing
   state-then-role convention. That ordering changed an existing test — it had
   reached for step 3 while step 1 was open as a convenient way to exercise the
   _role_ rule, so the role check never ran and the test passed for the wrong
   reason. It now asserts the role rule on the step that is due, and a second
   test covers the order rule directly. Note that `stepNumber` in finding 2 is
   the same field under another name: the instance steps carry `sequence`, and
   that is what the enforcement uses.

2. **Approval steps carry no `stepNumber` over the API.** Every step comes back
   with `stepNumber: undefined` and the instance with
   `currentStepNumber: undefined`, so no client can number or order the chain it
   renders.
3. **Re-approving an approved step answers 500.** `Cannot approve step in
APPROVED status` is thrown as a plain `Error`; the caller sees
   `Internal server error`. Same class as the three refusals
   [`NXD-058`](DECISIONS.md) retyped, in the method next to them.
4. **Binding an unapproved URS baseline answers 500** rather than a 409 naming
   the status.
5. **A Product baseline can be approved by whoever created it.** `P5-S2` put
   segregation of duties on the version's APPROVED transition and the URS side
   enforces it on every signature; `approveProductBaseline` has none.

   **Closed 2026-09-26 (Slice B-1), in two parts and not where the note
   said.** The step-status refusal had already become a `ConflictError`
   during the approval-order work on 2026-09-25. What still answered 500 was
   the lookup one line above it: `Approval instance not found`, thrown
   untyped in `approveApprovalStep`, `rejectApprovalStep` and
   `cancelApprovalInstance`, plus `Approval step not found` in
   `rejectApprovalStep`. All four are `NotFoundError` now, and the messages
   name the identifier that was not found instead of stating the noun.

   **Closed 2026-09-26 (Slice B-1), and the cause was one layer out.**
   `bindUrsBaseline` was already typed throughout; the 500 came from
   `urs-baseline-resolver.ts`, which threw five plain `Error`s across the
   cross-plugin HTTP boundary. They are typed by cause rather than
   uniformly: an upstream 404 is `NotFoundError`, a baseline that exists but
   is not APPROVED is `ConflictError` naming its actual status, and an
   incomplete requirement list is `ConflictError` too — an unreachable URS
   Composer cannot reach that branch, because the baseline fetch above it
   would have failed first. Any other upstream failure stays untyped and so
   stays a 500, which is correct: a broken URS Composer is a platform fault
   and must not be reported to the caller as their mistake.

   **Closed 2026-09-25.** `actor === baseline.createdBy` is refused with the
   wording P5-S2 already uses, and the two `Error`s in the same method became
   `NotFoundError` and `ConflictError`. Fifteen call sites across two suites
   had been creating and approving as one actor — convenience, not intent, in
   tests about labels and superseding — and now pass an approver. One of them
   asserted `approvedBy === actor`, which was the defect stated as an
   expectation.

6. **An unknown requirement-set id answers 200.** `GET
…/current-versions` returns an empty list and `POST …/versions/transition`
   returns "advanced 0" for a set that does not exist, while the requirements
   route 404s on the same id. An unknown set is indistinguishable from an empty
   one — and the two routes disagree about which identifier they take, the
   business key or the row id.

   **Closed 2026-09-26 (MVP1-B, Slice B-1), and the second half of that
   finding was wrong.** A private `assertRequirementSetExists` now precedes
   `getRequirements`, `getCurrentVersions` and
   `advanceRequirementSetVersions`; all three answer `NotFoundError` → 404,
   matching `createRequirement`, which always did. One helper rather than
   three inline guards, so the next method taking a set id has an obvious
   thing to call.

   The identifier claim does not survive checking. All four paths take
   `requirement_sets.id`, the row UUID: `requirements.requirement_set_id`
   carries a foreign key to it (`db/migrations.ts`), `createRequirement`
   writes `saved.id`, and `getRequirementSet` looks up by `id`. The only
   place the business key appears under that name is an audit-event payload
   in `reviseRequirementSet`, which is a value being recorded, not a lookup.
   There was one identifier and three missing guards, not two identifiers.

   A test now holds the agreement rather than describing it:
   `unknown-identifier.test.ts` asserts all three new refusals **and**
   `createRequirement`'s, so relaxing the guard reappears as a failure
   instead of as two green tests stating two truths. It also asserts that an
   existing set with no requirements still answers `[]` — the guard had to
   refuse the unknown id without refusing the empty set.

One fix was made outside the two above, because it was Batch 1's own and one
line: `updateProduct`'s vocabulary refusal threw a plain `Error` and reached the
caller as `500 Internal server error`, so the check added the day before was
invisible in the application. It is an `InputError` now, asserted by type.

- Affected components: `plugins/urs-composer-backend` (`service.ts`,
  `domain/signature-service.ts`, `transactionBoundary.test.ts`),
  `plugins/composer-backend/src/service.ts`.

**Verified:** all four gates green — `guard:platform` (9 pass, 9 documented
warnings, 0 fail), `tsc`, `lint:all`, `CI=true yarn test` at 222 suites / 1961
tests / 0 skipped with PostgreSQL up — and, for the first time, the journey
itself on a running stack.

---

### NXD-060 — Community RBAC was adopted, then reversed by an extension point that admits one policy

- Date: 2026-09-26
- Supersedes: `ADR-004 — Central Platform RBAC via Backstage Community Plugin`
  (archived at `docs/archive/architecture/adr-legacy/ADR-004-central-platform-rbac.md`)

Carried into this record during Phase 1.0 because the decision it documents
was reversed and nothing here said so. The reversal lived in a code comment
and nowhere else, which is how an agent reading `AGENTS.md` — "Do not build
another RBAC engine. Use Catalog Users / Groups → Community RBAC →
Backstage Permission Framework" — arrives at the running system, sees an
apparent violation, re-enables the plugin and stops the backend from booting.

**The original decision (2026-08-26, ADR-004).** Authorization would be
administered centrally through `@backstage-community/plugin-rbac-backend`,
wrapping the existing `PlatformPermissionPolicy` rather than replacing it:
if an RBAC rule matched it decided, otherwise the platform policy decided,
preserving entitlements and release gates. Both layers active at once. The
reasoning was sound and is the reasoning `AGENTS.md` still states.

**Why it does not run.** Backstage 1.53 exposes `policyExtensionPoint` only
under `/alpha`, and it admits exactly one policy: the second `setPolicy()`
throws _"Policy already set."_ Community RBAC and `PlatformPermissionPolicy`
both register through it. There is no chaining API to make the wrapping the
ADR describes actually happen, so "both layers active at once" was not
available — it was one or the other.

`PlatformPermissionPolicy` won, and had to: it is the only one of the two
that carries the RBAC matrix, the commercial entitlement gate and the
authorization audit store. Dropping it to gain central role administration
would have removed three controls to gain one convenience.

**What is actually true today.** `PlatformPermissionPolicy`
(`packages/backend/src/permission/policy.ts`) is the sole permission
authority. Roles come from catalog group membership
(`packages/platform-common/src/roles.ts`), in two independent systems —
platform tiers and URS domain groups — plus the entitlement AND on scaffolder
template permissions. Every route enforces server-side.

Both RBAC packages remain declared —
`@backstage-community/plugin-rbac-backend@^7.17.0` in the backend,
`@backstage-community/plugin-rbac@^2.1.2` in the app — and both are inert:
the backend registration is commented out and the frontend plugin is not in
`App.tsx`. They are left installed deliberately. Removing them is a
dependency change under `AGENTS.md` and would have to be approved on its own
terms; leaving them costs nothing but a note, and this is the note.

**This is a deviation from `AGENTS.md`, not a correction of it.** It is
recorded as D-1 in `docs/architecture/ARCHITECTURE_GUARDRAILS.md` with its
lifting condition: a stable, non-alpha policy-chaining extension point in a
supported Backstage release. Re-evaluate at every Backstage upgrade gate.
Until then, re-enabling Community RBAC is not a fix — it is a startup failure.

**What was not carried over.** ADR-004's "Authorization Profiles" future
extension. Six `templates/*/authorization.yaml` files exist from it; they are
read by no code and referenced by no template, and of the roughly two dozen
domain permissions that work documented, one (`aas.read`) exists in source.
That residue is recorded in `docs/audits/TARGET_CONFORMANCE_AUDIT.md` and is
not a decision this record revives.

---

### NXD-061 — A permission registry nobody imported, holding the wrong answer

- Date: 2026-09-26
- Closes: the `validation.approve` contradiction (W-8) and part of guardrail
  deviation D-4

`packages/platform-common/src/permissions/validation.ts` documented
`validation.approve` as _"RESERVED — never granted in v0.1 (automatic
approval is forbidden)"_. `policy.ts` grants it to `PLATFORM_ADMIN`, and
`permissions.ts` lists it in `ADMIN_PERMISSION_NAMES`. One file said never,
the other did.

**The code is right and the comment is stale.** Enabling the permission was a
deliberate Phase 5 decision, already on record here: the validation lifecycle
could not close while its terminal step was denied to everyone. The
"automatic approval is forbidden" property it was protecting is intact and is
enforced where it belongs, in
`plugins/validation-expert-backend/src/service.ts` — `createValidationDecision`
refuses a decider who created the ValidationContext, requires a non-empty
justification, validates the status against a closed list, and permits
exactly one decision per context. Approval is a deliberate human act by
someone other than the author. Nothing approves itself.

So no security fix was needed. What needed fixing was that the wrong answer
was reachable at all.

**Why it was reachable.** `packages/platform-common/src/permissions/` was a
second registry: per-domain modules (`urs.ts`, `validation.ts`) re-declaring
the same permission names as the flat `permissions.ts`, with their own
documentation. It was imported by **nothing** — not `index.ts`, not a plugin,
not a test. Two definitions of `validation.approve` existed; the one that ran
was correct and the one that was dead was wrong, and nothing made the
difference visible to a reader.

The directory is removed. `permissions.ts` is the definition, and it is the
one `index.ts` exports. `tsc`, `lint:all` and the full suite are unchanged by
the removal — 220 suites, 1923 tests, 3 suites skipped for want of local
PostgreSQL.

The per-domain split those files attempted is still a reasonable shape. It
should happen as a refactor of the live file, not as a copy beside it: a
second registry does not become authoritative by being better organised.

Three documents repeated the stale claim and are corrected in place with the
date and the reason: `docs/rbac/platform-roles.md` (twice) and
`docs/e2e-platform-consolidation.md`. Each now names the service-level
control as well as the grant, because "granted to PLATFORM_ADMIN" on its own
reads more permissive than the system actually is.

---

### NXD-062 — Twenty-four permissions that deny nothing

- Date: 2026-09-26
- Closes: W-7 (Authorization Profile residue)

Six `templates/*/authorization.yaml` files declared an "Authorization
Profile" per Golden Path: domain permissions in a
`<domain>.{read,operate,configure,admin}` pattern, suggested roles, and
platform-role mappings. Twenty-four permissions across `aas`, `machine-state`,
`mqtt`, `oee`, `equipment` and `uns`, with four supporting documents — a
registry, a schema reference, an architecture document and a matrix.

Measured against the repository:

| Check                                            | Result                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| `authorization.yaml` read by any source file     | no                                                 |
| referenced by any `template.yaml`                | no                                                 |
| loaded by the Catalog                            | no — not an allowed kind, no location points at it |
| of the 24 permissions, present in source         | 1                                                  |
| of the 24, present in generated template content | 0                                                  |

The single survivor is a name collision, not evidence. The profiles declare
`aas.read` with `runtimeEnforcement: IMPLEMENTED` and
`mechanism: fastapi-permission-check` — enforcement inside the generated
Python data product. The `aas.read` that exists is a control-plane permission
defined in `permissions.ts` and enforced in `plugins/aas-backend/src/router.ts`.
Same string, different system. **No generated product checks any of these.**

`runtimeEnforcement: IMPLEMENTED` on a permission with no implementation is
what makes this worth a decision rather than a cleanup. Someone designing an
access model from these files would have built it on twenty-four controls
that deny nothing, and the documents said, in the field reserved for exactly
that question, that they were enforced.

The material is archived under
`docs/archive/architecture/authorization-profiles-legacy/` with the
measurement beside it, rather than deleted: it is the client half of the
design `NXD-060` records the server half of. Community RBAC was to provide
the central role administration these profiles fed, and Community RBAC is
disabled. The profiles were not abandoned so much as orphaned.

`AGENTS.md` still carries the rule "Authorization Profile Registry is
metadata/configuration. It is NOT an authorization decision engine." The rule
is sound and is left untouched. Note only that there is currently no registry
for it to govern — if one is built again, the rule is waiting.

Not moved: `docs/PHASE9_EVIDENCE_MATRIX.md`, which is the acceptance evidence
for this work and covers other deliverables too. It is a phase report and
belongs with the rest of them; that is a separate pass.

---

### NXD-063 — One word, four registries: what was harmonised and what was only named

- Date: 2026-09-26
- Phase 0.4 (naming) of the governance consolidation

The documentation audit found the same word carrying different meanings in
different places. Some of those collisions are defects and were fixed. Some
are legitimate — the word is right in each context and only the ambiguity is
the problem — and those are named rather than renamed, because a rename that
does not reduce meaning only moves the confusion.

**Resolved.**

- **"Solution Composer"** was a third name for the Product Composer, beside
  `/compose` and `composer-backend`. It appeared in ADR-009 and in
  `platform-architecture.md` (four occurrences, including the layer diagram
  and the domain-responsibility table). All are now **Product Composer**, and
  `URS/Solution/Validation` reads `URS/Product/Validation`. There is no
  Solution domain in this platform; there never was.
- **Decision records** ran in three systems — `NXD-nnn`, an inline
  `ADR-001..010` set and a lone second `ADR-004`. `NXD` is now the only one
  (`NXD-061` context, archive under `docs/archive/architecture/adr-legacy/`).
- **ADR-004** was assigned to two different decisions. The Git-artifacts one
  keeps the number; the RBAC one became `NXD-060`.

**Named, not renamed — and why.**

- **"Composer"** still means two unrelated systems: `/compose`, a
  component-selection sandbox in `packages/app/src/modules/composer`, and the
  Product domain in `plugins/composer-backend`. This is the one collision
  that is a real information-architecture defect, and it is deliberately
  _not_ fixed here. Renaming either is a user-visible change to routes,
  navigation and a plugin package name; it belongs in a slice with the
  people who will use the result, not in a documentation pass.
- **"Product"** (governed row · Catalog entity · Artifact kind · commercial
  SKU), **"Component"** (`product_components` · Platform Component library ·
  Artifact kind · Backstage kind) and **"Baseline"** (URS · Product ·
  the platform's own validation package) each carry several meanings that are
  correct in their own context. Collapsing them would lose distinctions the
  domain actually has.

For all of these, `CLAUDE.md` section 7 now lists the meanings and requires
the qualified form. That is the working rule: **the ambiguity is handled by
saying which one you mean, not by pretending there is only one.**

The same rule produced `CLAUDE.md` section 2 for "Phase", where three
numbering schemes were in use and a bare "Phase 1" had no safe reading.

---

### NXD-064 — Four compliance positions, stated rather than quietly held

- Date: 2026-09-26
- Phase 0.5 (compliance positions) of the governance consolidation

Each of these is a known gap between what a GxP-oriented platform should do
and what this one currently does. None is fixed here. They are recorded
because an unwritten gap is indistinguishable from an unnoticed one, and
because `docs/compliance/traceability-and-gmp.md` is now the document a
reviewer will read — it must not be the only place they appear.

**C-1 — The shipped default disables the invariants.** `app-config.yaml` sets
`ursComposer.persistence.mode: memory`. In memory mode none of the
PostgreSQL GxP controls exist: no single-open-version index, no content
immutability trigger, and no durable audit trail.
`app-config.production.yaml` overrides it explicitly, with a comment warning
that config layering would otherwise let `memory` survive the merge. The
safety net exists; the default is the unsafe one, and a mis-layered config
restores the unsafe state silently.

_Position:_ the default should be postgres, or the backend should refuse to
start in memory mode when `permission.enabled` is true. Not changed here
because it alters how every developer starts the stack, which is a slice with
a migration note, not a documentation edit.

**C-2 — The product-side audit cannot answer "why".**
`composer_audit_events` has no `reason` and no `entity_version` column. The
URS store has both. So a requirement change carries its rationale and a
product change does not, and the two stores cannot be correlated by version.

_Position:_ align the schema with `audit_events`. Additive, low risk, and
scheduled with the evidence work rather than done in isolation.

**C-3 — AI proposals are not durable.** `AISpecDraft` lives in an in-process
`Map` (`plugins/composer-backend/src/service.ts`). A draft is lost on
restart, invisible to a second instance, and leaves no record of what the
model proposed — only of what a human applied.
`NEXORA_STRATEGY.md` requires that "AI may implement and propose, but
controlled approvals remain human". An approval whose subject was never
stored is not a controlled approval.

_Position:_ persist drafts with model id, prompt hash and raw response before
they can be applied.

**C-4 — Community RBAC stays disabled and its packages stay installed.**
Recorded in full as `NXD-060` and as deviation D-1. Named again here so the
compliance picture is complete in one place: authorization is decided by a
single proprietary policy, not by the standard component `AGENTS.md` points
at, and two dependencies are declared and inert.

_Position:_ re-evaluate at every Backstage upgrade gate. Removing the
dependencies is a dependency change and needs its own approval.

**Not on this list, deliberately:** the absence of `VERIFIED_BY` production,
product test evidence and FS/TDS. Those are not positions the platform is
holding — they are unbuilt capability, and they belong to the completion
plan, not to a compliance register.

---

### NXD-065 — The audit trail could not answer "what happened in this one operation"

- Date: 2026-09-26
- Slice: MVP1-B / B-3

`audit_events` has had a `correlation_id` column since it was created,
`AuditEvent` has had the field, and both repositories map it in each
direction. No write site ever set it. **Every row was NULL.**

A baseline approbation writes events for the approval step, the approval
instance, the baseline, each requirement version the release supersedes, and
the electronic signature. Five kinds of record, one act by one person, and
nothing joined them. For a regulated trail that is not a reporting
inconvenience — it is the difference between a sequence of events and an
account of what was done.

**Optional was the defect.** A field that may be omitted is a field that
will be, 35 times. `AuditEvent.correlationId` is required now, so a new write
site cannot compile without one, and `URSService.writeAudit` supplies it from
an `AuditContext` opened at the entry point. `writeAudit` takes
`Omit<AuditEvent, 'correlationId'>`, so a caller cannot state one either: a
site that wants a different correlation must open a different context, which
is a deliberate act rather than a slip.

**Where the context opens.** `beginAudit(actor, inherited?)` at the top of
every method that audits. The `inherited` argument is the whole mechanism:
five methods are reachable from other auditing methods — `releaseBaseline`
from both `approveApprovalStep` and `approveBaseline`,
`seedInitialRequirementVersion` from `createRequirement` and
`updateRequirementSetDraft`, and so on — and their events belong to the
caller's operation, not to a new one.

Three methods that write nothing themselves also open a context and pass it
down: `signRequirementVersion`, `advanceRequirementSetVersions` and
`approveBaseline`. Without that, advancing a set of versions would give each
version its own id, which is precisely the join this record exists to
create.

**The type found a write site the code review had not.** Making the field
required produced a compile error in
`domain/signature-service.ts` — a 35th site, in a different class, with no
way to know which operation it belonged to. `sign()` now takes the context.
Reading the call graph had found 34; the compiler found the one that was not
in the file I was reading.

**The column stays nullable, deliberately.** Historic rows have no
correlation and never will. Backfilling would mean inventing one for events
that were never part of a recorded operation, which is worse than an honest
gap in an append-only trail. The guarantee is on new writes: the type
enforces it, and `postgres-repository` no longer falls back to `null`, so an
event that somehow evades the type fails the insert rather than adding
another unattributable row.

**Tested against the operation, not the unit.** `audit-correlation.test.ts`
walks a real non-GxP chain to completion and asserts the final approval's
events share one id, span more than one entity type, and differ from the
preceding step's. It captures what reaches the repository rather than what
the service returns, because the defect was invisible from the outside —
every one of those calls succeeded throughout.

Two of its assertions were wrong on the first run and the code was right
both times: `updateRequirementSetDraft` requires `priority` on a
requirement, and a baseline signature is written only on the **final**
required step, not on intermediate ones. Recorded because both are rules a
reader of the test would otherwise have to rediscover.

**Not done here.** The correlation id is generated at the service boundary
and no HTTP header supplies one, so a single user action that crosses
plugins — Product Composer binding a URS baseline, say — still produces two
unrelated correlations. Threading it from the request is the natural next
step and belongs with the cross-plugin evidence work, not with this slice.

---

### NXD-066 — The product side of the audit trail had no operation at all

- Date: 2026-09-27
- Slice: MVP1-B / B-4 pre-work
- Extends: `NXD-065` (the same mechanism, on `urs-composer-backend`)
- Closes: `NXD-064` C-2

`NXD-065` found `audit_events.correlation_id` NULL in every row across 35
write sites and made the field required. It named its scope honestly: the URS
side only. This record is what happened when the same question was asked of
`composer_audit_events`.

**It was a worse answer.** There was no column. `ComposerService.audit()`
built an event with `id: randomUUID()` and nothing else joining it to
anything, at 22 call sites. So the question NXD-065 answered for requirements
— what happened in this one operation — could not even be asked of products.

**One operation genuinely spans many entities here, and it is the regulated
one.** `applySpecDraft` creates a product, creates a version, binds a URS
baseline, adds each suggested component, creates an `IMPLEMENTS` link for
each requirement the model referenced, creates a baseline, and marks the
draft applied. That is one reviewer accepting one AI proposal, and it wrote
eight or more rows that no query could gather.

**The port is deliberately not a refactor.** `beginAudit(actor, inherited?)`
and the context type are the URS shapes, named the same, so a reader who
knows one recognises the other. The two plugins own their own persistence and
cannot share the type across that boundary — `AGENTS.md` §PLUGIN BOUNDARIES —
so it is declared twice on purpose, with a comment in each saying so. That is
a cost accepted rather than a duplication overlooked.

**Where it differs from the URS implementation, and why.** URS has
`writeAudit(ctx, repo, event: Omit<AuditEvent, 'correlationId'>)`, taking the
repository handle explicitly because half its write sites are inside a
transaction. Composer has one transaction (`bindUrsBaseline`) and it writes no
audit events from inside it, so there is no handle to thread. What survives is
the guarantee, reached differently: `audit(ctx, entityType, entityId,
eventType, options?)` has **no parameter for a correlation id**, so a caller
cannot state one. Wanting a different correlation means opening a different
context. The actor comes from the context too, which removes a second way to
get an event wrong.

**`inherited` is the whole mechanism, not a convenience.** Six methods are
reachable both directly and from `applySpecDraft` — `createProduct`,
`createProductVersion`, `bindUrsBaseline`, `addProductComponent`,
`createTraceabilityLink`, `createProductBaseline`. Without the parameter each
would open its own context and the apply would produce eight correlations
instead of one, which is the defect restated rather than fixed.

**The compiler did the finding.** Making `correlationId` required on
`ComposerAuditEvent` produced 22 errors, one per write site, and a 23rd in
`dispatchUpgradeNotifications`, whose actor arrives as `input.actor` rather
than `actor` and which a mechanical rewrite got wrong. Reading the call graph
would have found the 22.

**`reason` and `entity_version` land here rather than in a slice of their
own.** `NXD-064` C-2 recorded the position that a requirement change carries
its rationale and a product change does not, and said the fix was additive,
low risk, and "scheduled with the evidence work". This is the evidence work,
and the migration was already open on that table. Both columns are optional:
most events are mechanical consequences of one another, and forcing a reason
onto them would produce ceremony, not information.

**The column is nullable and the type is not.** Deliberate, and the same
asymmetry NXD-065 chose. Historic rows have no correlation and never will;
backfilling would mean inventing one for events that were never part of a
recorded operation. A legacy row reads back as the empty string, which says
"not part of an operation" instead of pretending otherwise, and
`audit-correlation.test.ts` pins that too — otherwise a later `?? randomUUID()`
in the mapper would look like a tidy-up.

**Mutation-checked.** Making `beginAudit` ignore `inherited` fails the first
assertion and nothing else, which is the test measuring the mechanism rather
than the plumbing around it.

- Affected components: `plugins/composer-backend`
  (`db/migrations.ts`, `repository-interface.ts`, `repository.ts`,
  `service.ts`, `types.ts`, `audit-correlation.test.ts`).

---

### NXD-067 — A link that could point at nothing, and a discriminator that discriminated nothing

- Date: 2026-09-27
- Slice: MVP1-B / B-4a
- Closes: conformance audit §11 item 4 ("validated references on
  `traceability_links`"); prepares items 2 and 3

`traceability_links` has carried `source_type` and `target_type` since Phase 1
as `varchar(50)` with nothing checking them. `relationship_type` had a closed
vocabulary from the start — `TRACEABILITY_RELATIONSHIP_TYPES` — and
`validateTraceabilityLink` **never consulted it either**. Three fields
describing what a link is, none enforced.

**What that produced.** `URS`, `URS_REQUIREMENT` and `URS_REQUIREMENT_VERSION`
all appeared for "a requirement"; `COMPONENT` and `PRODUCT_COMPONENT` both
appeared for a component. Production code had converged on the canonical pair
(`service.ts`, `ArchitectureTab.tsx`); the drift lived in `versioning.test.ts`,
which is worse than it sounds — the fixtures were the only written record of
what the columns were supposed to contain, and they disagreed with the code.

The deeper problem is not tidiness. **A discriminator that accepts any value
cannot be resolved.** Nothing could look at a link and decide what its
endpoints were, so nothing could check they existed, so the release gate was
reading a table that could contain claims about entities that were never
there.

**Three mechanisms, because no single one reaches.**

1. **A real foreign key, for the one endpoint in this schema.**
   `target_test_execution_id` references `test_executions` and is set
   whenever `targetType === 'TEST_EXECUTION'`, mirroring `target_id` so every
   existing reader keeps working. `source_id`/`target_id` stay polymorphic
   and can never carry a key themselves.
2. **CHECK constraints on the two type columns — PostgreSQL only.** This is
   the **first dialect branch in `migrations.ts`**, a file that had
   deliberately had none. SQLite's `ALTER TABLE` supports RENAME, ADD COLUMN
   and DROP COLUMN; adding a constraint to an existing table would mean
   rebuilding it, copying production rows through a create/copy/drop/rename
   to gain a guarantee the service already enforces on every write. So the
   constraint goes where the data lives, and `migrations.postgres.test.ts`
   asserts it — if the branch is removed the test fails rather than the
   guarantee quietly disappearing.
3. **Existence validation in the service**, which is what actually runs on
   both dialects and for every write.

**Why a cross-plugin foreign key is not on that list.** A URS requirement
version lives in `urs-composer-backend`'s database. `AGENTS.md` §PLUGIN
BOUNDARIES forbids direct cross-plugin database access and the two plugins
have separate logical databases anyway (`composer` and `urs-composer`), so
the referential guarantee that a relational schema would normally give is
simply not available. What replaces it is `product_requirements` — this
plugin's **own** snapshot of the bound baseline. Checking against the
snapshot answers the same question and stays inside the boundary.

**The scoping rule is the part that took a second attempt.** The first
implementation required every requirement reference to appear in *some*
product version's snapshot. It broke twelve existing tests, and the tests
were right. A version that has bound no baseline has no snapshot, and the
Architecture tab deliberately lets an author record that a component
implements `URS-OEE-014` before the binding exists — `getRequirementCoverage`
is explicitly built to join links written that way. Requiring the snapshot
would have enforced a rule whose answer is not yet knowable, at the cost of a
workflow the platform offers.

So the rule is: **check the requirement against the bound version's snapshot
when there is one.** Unbound, the link is provisional and passes. Bound, a
requirement the baseline does not contain is refused — which is the case that
matters, and the same judgement `applySpecDraft` already made when it skipped
refs the model invented. Where there is no component to scope by (a
requirement linked to a test execution), any snapshot counts: a requirement
version is pinned by many products, and evidence about it is evidence about
it.

**The read path stays forgiving, and that is now explicit.** Rows written
before this validation existed cannot be assumed valid, so
`getRequirementCoverage` must still ignore a link whose source matches
nothing. The test that proved this used to write the bad link through the
service; it cannot any more, so it inserts the row directly and the write-path
refusal became a second test. The pair says what one test used to imply:
refused on the way in, tolerated on the way out.

**`test_executions` is append-only, deliberately.** No unique constraint on
`(requirement_version_id, test_suite, test_case)` and no upsert. A re-run is
new evidence, not a correction — that a test passed on Tuesday and failed on
Wednesday is exactly what a reviewer needs, and an upsert would destroy it.
"Which is current" is therefore a question asked of the rows by
`latestExecutionPerCase`, a pure function in `platform-common` so the rule
that decides whether the release gate blocks can be read and tested without a
database.

**The migration refuses rather than normalises.** `assertTraceabilityVocabulary`
lists offending rows and stops, the choice `NXD-009` made for duplicate
identities and for the same reason: rewriting `COMPONENT` to
`PRODUCT_COMPONENT` unattended is a guess about what an author meant, on a
table that feeds the release gate, where a wrong guess produces a link that
looks verified and is not.

**One refusal retyped in passing.** `createTraceabilityLink` threw a plain
`Error` for a validation failure, so a caller's typo answered
`500 Internal server error`. It is an `InputError` now — the same family as
the three refusals B-1 corrected.

- Affected components: `packages/platform-common` (`product.ts`, `index.ts`),
  `plugins/composer-backend` (`db/migrations.ts`, `repository-interface.ts`,
  `repository.ts`, `service.ts`, `types.ts`), and the suites
  `traceabilityIntegrity.test.ts`, `db/migrations.postgres.test.ts`,
  `productRequirements.test.ts`, `versioning.test.ts`.

---

### NXD-068 — Evidence the platform derives rather than accepts

- Date: 2026-09-27
- Slice: MVP1-B / B-4b
- Closes: conformance audit §11 items 2 and 3
- Builds on: `NXD-067` (the table and the link vocabulary), `NXD-066`

`POST /api/composer/test-executions` is the door CI writes verification
through. Before it, the only things that could mark a requirement verified
were a hand-written `VERIFIED_BY` link and the Validation Expert — so on the
normal path `coverage.verified` was zero for every product, and the number
stayed zero no matter how many tests passed.

**Shaped after `/baselines/:id/provenance`, and different in one way that
matters.** Same authorization (`authorizeService`, the external-access token,
no permission object, for the reason written out on that helper: a service
principal has no catalog identity, so the permission policy would compare
against an empty role set and deny). Same validator-in-`platform-common`
pattern. But provenance is **write-once** and a second differing POST is a
`ConflictError`, while a second test run is **not** a conflict — it is the
next run. It is appended, and the endpoint answers `201` rather than `200`
because a row is always created.

**The link is derived, not requested.** The body cannot carry a
`VERIFIED_BY` assertion. A caller that could post a result and separately
assert a link could assert the link without the result, which is the thing
the whole slice exists to prevent. Deriving it means the claim and the
evidence are written in one operation or neither is.

**A FAILED run creates no link and deletes none.** The run that passed
yesterday genuinely passed; deleting its link would rewrite history to make
today's failure tidier. How the gate nonetheless refuses is `NXD-069`.

**The caller may supply the correlation id, and that is the point.** NXD-065
closed with a named gap: the id is minted at a service boundary and no HTTP
header carried one, so a single act crossing plugins produced unrelated
correlations. A CI run posting twelve results under one id is now one
operation in the trail. An empty string is refused rather than accepted —
otherwise a whole run would correlate on `''`, which is worse than twelve
separate ids because it looks like an answer.

**`executedAt` is optional and falls back to now.** CI knows when the test
ran; the platform only knows when it heard. Preferring the former and
falling back rather than refusing is deliberate: the timestamp orders runs of
one test case, and an absent one is not a reason to drop evidence.

**CI step, same bargain as Slice 3.** `continue-on-error`, because an
unreachable Composer must not redden a build whose tests passed; a missing
record surfaces at the gate where a human is already looking.
`NEXORA_EVIDENCE_MAP` carries the join the platform cannot make for itself —
only the pipeline knows which test case exercises which requirement version.
Unconfigured means inert and says so.

- Affected components: `plugins/composer-backend` (`service.ts`, `router.ts`),
  `packages/platform-common` (`product.ts`), `.github/workflows/ci.yml`,
  `plugins/composer-backend/src/testEvidenceIngestion.test.ts`.

---

### NXD-069 — The gate reads coverage, and a failing re-run takes verification back

- Date: 2026-09-27
- Slice: MVP1-B / B-4c
- Closes: conformance audit §11 item 5

Two defects, one of which had been true since Phase 1.

**The gate did not read coverage.** `getRequirementCoverage` has answered
"is every requirement implemented, verified and validated?" since Slice 1b.
`checkReleaseGate` never called it. Its `INCOMPLETE_TRACEABILITY` asked
whether every *component* had *any* link — a single link anywhere satisfied
it. **A product could reach `RELEASED` with zero requirements verified**, and
the blocker's name made that look impossible.

So the name moved to the question it always sounded like it was asking.
`INCOMPLETE_TRACEABILITY` now fires when `coverage.verified < coverage.total`
and **names the unverified refs** — capped at ten with a count, because a
large baseline otherwise produces a message nobody reads. The old check keeps
its behaviour under `UNTRACED_COMPONENT`. Renaming rather than deleting: "a
component traces to nothing" is a real defect, just not the regulated one.

**It fires only for a bound version.** Unbound is already answered by
`NO_URS_BASELINE`, and two blockers for one cause is what makes a gate
unreadable.

**Coverage could not see the new evidence.** The verifying-link filter
required `componentIds.has(link.targetId)`, so a `VERIFIED_BY` link pointing
at a test execution was written, stored, and silently ignored by the only
reader that mattered. B-4b would have been inert without this.

**The first fix for that was wrong, and the test caught it.** Reading the
evidence *through the links* looked natural and cannot work: a failing run
produces no link — that would be a contradiction in terms — so failures were
invisible and the revocation below could never fire. Coverage now groups the
execution rows by requirement key and reads them directly. The link remains
the traceability artefact; the **decision** reads the rows.

**The verification rule.** A requirement is verified when, for every
`(testSuite, testCase)` recorded against it, the newest run by `executedAt`
is `PASSED`. Consequences, stated because each is a choice:

- A later failing run **revokes** verification, including one a `VERIFIED_BY`
  link to a component or a Validation Expert test id would otherwise have
  granted. Where execution evidence exists it decides. The question a
  reviewer asks is not "did this ever pass" but "does it pass now".
- A subsequent passing re-run restores it. Evidence is current, not one-way.
- Where no execution evidence exists at all, the two older sources still
  answer, so nothing that was verified before this slice became unverified
  by it.

`latestExecutionPerCase` is a pure function in `platform-common` precisely
because it decides whether the gate blocks — too important to be reachable
only through four layers of setup.

**`ProductRequirementCoverageRow.executions` exists so a reviewer can see
why.** A boolean cannot distinguish "no test has ever run" from "the last run
failed", and those call for different actions.

**Two existing suites changed, and that is them working.**
`versioning.test.ts` asserted `INCOMPLETE_TRACEABILITY` for an unbound
product with an unlinked component — now `UNTRACED_COMPONENT`.
`releaseGateProgress.test.ts` recorded the two deliberate remainders as
`INCOMPLETE_TRACEABILITY` and `NO_URS_BASELINE`; they are `NO_URS_BASELINE`
and `UNTRACED_COMPONENT`, and the absence of the coverage blocker on an
unbound version is now asserted rather than assumed.

**`testEvidenceIngestion.test.ts` is the first router-level suite in this
plugin.** Every other one calls the service directly with a hard-coded actor
string, which `docs/engineering/definition-of-done.md` (NXD-053) names as the
reason four defects shipped green. It found two here: a stubbed auth error
with the right `name` but the wrong type answered 500 where the real
`AuthenticationError` answers 401, and the evidence-through-links defect
above. Both were invisible from the service.

- Affected components: `plugins/composer-backend` (`service.ts`),
  `packages/platform-common` (`product.ts`), and the suites
  `testEvidenceIngestion.test.ts`, `releaseGateProgress.test.ts`,
  `versioning.test.ts`.

---

### NXD-070 — A default that disabled the invariants, and a proposal nobody kept

- Date: 2026-09-27
- Slice: MVP1 completion, items 8 and 6
- Closes: `NXD-064` C-1 and C-3

Two of the four compliance positions `NXD-064` recorded rather than fixed.
They are taken together because they are the same failure in two places: a
record the platform behaved as if it had, and did not.

**C-1 was not about the fallback.** The code had defaulted to postgres since
P1A and had refused memory in a production auth environment since well before
this. None of it helped, because `app-config.yaml` shipped `mode: memory` and
is layered first, so an overlay that merely omitted the key inherited it.
That is how production once came to run the URS audit trail in process
memory. A safe fallback under an unsafe default is a safety net under a
trapdoor that is already open.

So the default moved rather than the fallback. `app-config.yaml` sets
`mode: postgres` and `backend.database.client: pg`; memory moved to
`app-config.memory.yaml`, an overlay whose opening lines state what choosing
it costs.

**Both remedies, not either.** `NXD-064` offered "default postgres, **or**
refuse when `permission.enabled` is true". The second is now also in
`getPersistenceMode`, because the existing `auth.environment` guard only fires
if someone remembered to set `auth.environment` — and the configs that get
mis-layered are exactly the ones that forget. Enforcing who may approve, sign
or release against a store with no audit trail produces a decision nobody can
later evidence, which is worse than refusing to start. `app-config.memory.yaml`
therefore disables permissions; that is the consequence of the choice, not a
workaround for the check, and it means role and authorization work cannot be
done in memory mode.

**Removing memory mode was never the position** — `NXD-064`, audit item 8 and
open decision 4 all say default-or-refuse. Twenty-one URS suites construct
`URSRepository` directly and are untouched: they instantiate the class, they
do not read config.

**This changes how the stack starts**, which is why `NXD-064` called it a
slice with a migration note. `yarn start` needs `docker compose up -d db`.
`.env.example` pointed at `dpp/pharma_data_factory` while the compose `db`
service serves `nexora/nexora`, so the documented path did not actually work;
it does now.

**C-3 — the parsed result is not the proposal.** `AISpecDraft` lived in an
in-process `Map`: lost on restart, invisible to a second instance. The subtler
half is that even a persisted *parsed* draft would not have closed it.
`parseProductSpecResponse` is deliberately forgiving — it drops requirement
refs the model invented and falls back to `PROCESSING` for a component type
outside the vocabulary — so the parsed spec records what was accepted, never
what was said. `ai_spec_drafts.raw_response` is the only column that can answer
a reviewer asking whether the proposal was altered before a human applied it.
`model_id`, `prompt_hash` and `raw_response` are all `notNullable`: they are
the point of the table, and a field that may be omitted is a field that will
be.

**The prompt is hashed, not stored.** The user prompt embeds requirement text,
which the URS Composer owns. Copying it into a second plugin's database to
satisfy an audit requirement would create a second uncontrolled copy of
regulated content. A hash answers the question actually asked — was this
generated from the same ask as that one.

**Rejection stores rather than deletes**, and only the outcome columns are
ever updated. The proposal a human declined is exactly the record C-3 says was
missing, and a draft that could be edited after the fact would not be evidence
of anything.

**A cast hid the contract change.** Both LLM test stubs are
`as unknown as ComposerLLMClient`. Adding a required field to
`generateProductSpec`'s return compiled cleanly and failed at runtime in nine
tests. The stubs were fixed; the cast remains and will hide the next one.

- Affected components: `plugins/urs-composer-backend` (`plugin.ts`),
  `plugins/composer-backend` (`db/migrations.ts`, `repository.ts`,
  `repository-interface.ts`, `service.ts`, `types.ts`, `llm-client.ts`,
  `router.ts`), `app-config.yaml`, `app-config.memory.yaml`, `.env.example`,
  and `docs/engineering/development-workflow.md`.

---

### NXD-071 — Stage 3 is an FS bridge, and the FS is additive

- Date: 2026-09-27
- Slice: MVP1 completion, item 11 — the last of the twelve
- Closes: `TARGET_CONFORMANCE_AUDIT.md` §12 open decision 10, and G-7 in
  `docs/compliance/traceability-and-gmp.md` for the FS half

Open decision 10 asked: "Stage 3 scope — full FS+TDS+Stories+Tasks, or an
FS-only bridge?" It is an FS-only bridge, and the documents had already
answered it. `TARGET_OPERATING_MODEL.md` §Stage 3: "Nexora owns FS and its
traceability. It does not own a backlog." `NEXORA_VISION.md` lists an issue
tracker or backlog among the things Nexora does not intend to build. Building
stories and tasks would have contradicted both and duplicated GitHub.

TDS is the genuinely arguable omission. It is left out because nothing in the
platform consumes one: the release gate reads requirement coverage, the
Validation Expert reads its own hand-authored package, and a TDS with no
reader would be a table that is written and never asked a question. When
something needs it, it can be added beside the FS rather than beneath it.

**The FS is derived, not authored.** The input already existed —
`bindUrsBaseline` copies every pinned requirement into `product_requirements`
— and an FS item is the statement of what the system must do to satisfy one of
them. Deriving from the snapshot rather than the live URS follows §1.7
requirement provenance: the product keeps the wording it was built against, so
an FS generated from a later revision would describe a product nobody
released.

Derivation is **additive and idempotent**. A re-run writes items for
requirements that have none and leaves the rest untouched, because an existing
item may have been reviewed and edited and silently regenerating it is the
opposite of what a specification is for. A version with no baseline is refused
rather than given an empty FS — "specified, nothing required" and "not
specified yet" are different claims and only one of them would be true.

**The FS is not a mandatory hop, and that is the significant limitation.**
`getRequirementCoverage` joins the requirement straight to the component, and
the release gate reads it. Rewriting `URS → COMPONENT` into
`URS → FS → COMPONENT` would have flipped every coverage row to `UNMAPPED` and
blocked every release. So the chain is **resolved** rather than rewritten: the
requirement end is a column on the FS row, the component end is the existing
`IMPLEMENTS` link, and `getFunctionalSpecTrace` computes the join.
Materialising FS→Component as a third copy of the same fact would let the
copies disagree the moment a component link changed. A test asserts coverage
is unchanged across a derivation. Making the FS load-bearing in the gate is a
later decision with a release-blocking blast radius; it is not this one.

`FUNCTIONAL_SPEC` joins the traceability vocabulary with all three mechanisms
`NXD-067` requires, so a designer may also state a mapping the requirement does
not imply, and the trace unions it in. A specification and the component
implementing it must share a product version.

**A guard that only agreed with the code on an empty database.** Adding to the
vocabulary exposed this: the PostgreSQL CHECK constraints were created when
absent and never compared or rebuilt. Correct exactly once — and this is the
first time either array has grown since they were introduced. An existing
database would have kept the pre-Stage-3 CHECK and refused every FS link in
production, while a fresh test schema built the constraint from the current
array and passed. The migration now compares the admitted set (not the
rendered text, which varies with column type and server version) and rebuilds
on divergence, revalidating existing rows as it goes. The `pg_constraint`
lookup was also unscoped, so a same-named constraint on any other table would
have suppressed creation; it is scoped to the table now.

That defect is worth naming beyond its fix. The repository's pattern is a
single idempotent `up()` with no version table, which is well suited to
additive change and quietly wrong for any guard whose *content* can drift. Any
future check written as "create if absent" should be read as "create if absent
and never correct again".

- Affected components: `packages/platform-common` (`product.ts`, `index.ts`),
  `plugins/composer-backend` (`db/migrations.ts`, `repository.ts`,
  `repository-interface.ts`, `service.ts`, `types.ts`, `router.ts`), and the
  suites `functionalSpecification.test.ts` and `db/migrations.postgres.test.ts`.

### NXD-072 — The server now refuses what the page refused, and names the step it is waiting on

- Date: 2026-09-28
- Slice: correctness batch — not a `PHASE_CLOSURE_PLAN.md` slice. Answers
  `TARGET_CONFORMANCE_AUDIT.md` §12 open decision 9 ("the four open defects —
  fold into the evidence work, or fix as one batch?") with: as one batch.
- Closes: `STATUS.md` §Next item 0, the deferral paragraph at `STATUS.md`
  §Current Vertical Slice ("it wants its own decision"), `NXD-059` findings 2
  and 3, and the note `ArchitectureTab.tsx` had been carrying since NXD-056.

Three defects with one shape: the platform holds a rule but states it in the
wrong place, with the wrong status, or with the wrong number.

**A rule that lived in the page.** `ArchitectureTab.tsx` disabled the
add-component form outside DRAFT and said so in a doc comment — "The rule
belongs in the service; until it is there, the page at least does not offer
it." It was never moved. An API client could change the architecture of a
RELEASED product version, which is the one thing a version status exists to
prevent. Five methods are guarded now: `addProductComponent`,
`addDataContract`, `addProductDependency`, `removeProductDependency` and
`deriveFunctionalSpecifications`, alongside `bindUrsBaseline`, which had the
guard already and supplied the pattern.

**Why a helper, and why it takes its refusal as an argument.**
`requireDraftVersion(versionId, refusal)` follows the precedent slice B-1 set
with `assertRequirementSetExists` — one helper so the next method that needs
the rule has an obvious thing to call. The `refusal` parameter is required
rather than defaulted because the five reasons are genuinely different: what a
version is built from, is made of, publishes, consumes and specifies. A shared
sentence would have stated none of them, and a required parameter makes the
compiler ask the next author for theirs. `bindUrsBaseline`'s wording survives
byte for byte; a test asserts that, because the refactor is the only thing that
could have quietly reworded it.

**Three of the five were missing a 404 as well, and on PostgreSQL that was a
500.** `addDataContract` never loaded the component and `addProductDependency`
never loaded the version, but `data_contracts` and
`product_version_dependencies` both carry real foreign keys — so the database
refused what the service had not checked, and the driver error reached the
caller as "Internal server error". SQLite does not enforce foreign keys unless
`PRAGMA foreign_keys=ON`, which nothing in this repository sets, so every test
wrote the row happily and only production ever saw the 500. That is the same
wording problem `3857589` went after, hiding one dialect deeper.

**What is deliberately not guarded.** `createTraceabilityLink` and
`ingestTestExecution` keep working on a released version, because evidence
legitimately arrives after release: a passing CI run derives its own
`VERIFIED_BY` link ([`NXD-068`](DECISIONS.md)) and the release gate reads it
([`NXD-069`](DECISIONS.md)). `createProductBaseline` is allowed across statuses
by design. `versionStatusGuards.test.ts` asserts all three still succeed on a
`RELEASE_CANDIDATE` version, so the exemption lives in a test rather than only
in this paragraph — someone "completing the family" later meets a red suite
instead of a plausible-looking change.

**A delete that reported success for an id that never existed.**
`deleteTraceabilityLink` issued the `DELETE` with no lookup, answered 204 for
anything, and wrote a `TRACEABILITY_LINK_DELETED` audit event for the deletion
that had not happened. The 204 half is the same shape as the three URS routes
slice B-1 closed. The audit half is worse: a missing entry is a gap in the
record, while an entry describing an act nobody performed is a false one, and
an append-only trail exists precisely to make that impossible.

**400 became 403 for segregation of duties.** The refusal in
`transitionProductVersionStatus` and `approveProductBaseline` is a statement
about who the caller is, not about what they sent — there is no correction to
the request body that makes it succeed, and a 400 invites the author to go
looking for one. `respondError` already had the `NotAllowedError` branch, so
nothing in the router changed.

The third occurrence of the same rule, in `validation-expert-backend`
(`service.ts:661`), is **deliberately left as an `InputError`**. That plugin's
`respondError` answers `403 {"error":"Not allowed"}` and discards the message,
so converting it would trade a 400 that explains itself for a 403 that does
not. It waits on that router learning to pass the message through.

**A field that named the step just approved.** `currentStepSequence` is
documented as "the step currently due". It was initialised to `0` — a sequence
no step has — and then *incremented* on each advance rather than set to the
step the advance had just activated, which was itself found by array position
rather than by lowest sequence.

The two errors partly cancelled, which is worth recording because it is why
neither was noticed and why fixing only one would have looked like a
regression: with a dense, all-required workflow starting from `0`, incrementing
lands on the right number from the second advance onwards while being off by
one on the first. Fixing the initialisation alone makes the increment
coincidentally correct for every seeded workflow. Only a sparse or
out-of-order workflow separates them, which is why
`approval-chain.test.ts` now drives one with sequences 10/20/30 written out of
order. Both halves were mutation-checked independently.

It survived because nothing exercised it: the frontend assertion compares two
hand-written numbers in a fixture, and the backend contract test stopped at
`submitBaseline`, before the first approval. The contract test now performs an
approval.

**The UI numbered by array position and lost the number on decision.** MUI's
`Stepper` supplies an index icon when `StepLabel` is given none, and
`approvalStepIcon` returns one only for decided steps — so an undecided step
showed its position in the array, a decided step showed a tick and no number,
and neither was the `sequence` the server enforces against. The server already
refuses in those terms ("step 3 cannot be approved while step 2 is still
PENDING") while the page could not show the reviewer which row was step 2.

**And that exposed the more serious defect: step one was unapprovable from the
browser.** `ApprovalStepStatus.ACTIVE` is assigned in exactly one place in the
backend, inside the *advance* branch of an approval. Every step of a fresh
instance is `PENDING`, so the page's `findIndex(s => s.status === 'ACTIVE')`
returned `-1` and the per-step Approve/Reject buttons, gated on the same flag,
rendered on no step at all. Only steps 2..n were ever actionable — on a chain
that cannot reach step 2 without step 1.

**The position taken, rather than the larger change avoided:** `ACTIVE` stays a
lazily-applied display status; the authority for "which step is due" is
`currentStepSequence` together with the lower-sequence-blocking rule
`approveApprovalStep` already enforces, and the UI now reads the authority.
Activating the first step at creation would also have worked and is arguably
tidier, but it changes the wording of the `NXD-059` ordering-guard test from
"still PENDING" to "still ACTIVE" — editing a guard test's expectation is a
question rather than a formality, and this defect does not require it.

**No field was added to the wire contract.** `sequence` and
`currentStepSequence` were already in `APPROVAL_STEP_REQUIRED_FIELDS` and
`APPROVAL_INSTANCE_REQUIRED_FIELDS`. `NXD-059` finding 2 recorded that "every
step comes back with `stepNumber: undefined`", which was a search for a name
that has never existed rather than a missing capability — the data was on the
wire the whole time, unrendered. Nothing named `stepNumber` was introduced;
`approval-wire-contract.ts` says adding a field there is a promise, and there
was no new promise to make. `ApprovalStepInstance.required` became
non-optional, which is the reverse of B-2: the contract lists it as a field
every response carries and both repositories default it rather than omitting
it, so declaring it optional invited handling for an `undefined` the server
never sends.

**A unique index on `(approval_instance_id, sequence)`**, PostgreSQL only, with
the duplicate pre-check the neighbouring invariant uses so that pre-existing
violations are reported with their instance ids instead of failing the index
creation with a message nobody can act on. The page now addresses a step by
that number and prints it, so two steps sharing one would make "step 2"
ambiguous in a Part 11 approval chain. The in-memory repository also sorts an
instance's steps by sequence now, as the PostgreSQL one always did — insertion
order happens to agree today, which is exactly why the two stores would have
started disagreeing silently the first time a workflow was authored out of
order.

**Deferred, and named so they are decisions rather than oversights:**

- `remainingAfterThis` treats only `APPROVED` as settled while the ordering
  guard also accepts `SKIPPED`, so a skipped required step would make an
  instance uncompletable. Unreachable today — only `cancelApprovalInstance`
  sets `SKIPPED`, and that terminates the instance — and the fix is a
  governance question ("does a skipped required step satisfy the chain?")
  rather than a correctness one.
- A status guard on `deleteTraceabilityLink`. Removing a `VERIFIED_BY` link
  from a released version does erase evidence, but the right rule there is
  about evidence — append-only, or supersede — not about version status, and a
  DRAFT gate would also block removing a link created in error. Same family as
  `NXD-068`'s reason for keeping every run.
- The `validation-expert-backend` segregation-of-duties refusal, above.

**One consequence worth not rediscovering:**
`deriveFunctionalSpecifications` is DRAFT-only now, so a version already
APPROVED or RELEASED in an existing database can never gain a functional
specification. Nothing is blocked by that — the FS is deliberately additive and
not gate-bearing ([`NXD-071`](DECISIONS.md)) — but a version that predates
Stage 3 will stay without one.

**Verified live, not only in tests.** `yarn start:demo` against PostgreSQL, as
two demo identities:

- A component added to a DRAFT version → 201; the same call once the version is
  APPROVED → **409** `Product version 1.0 is APPROVED. A component can only be
  added while the version is DRAFT — the architecture of a version is part of
  what was approved.` A dependency on that version → **409** naming
  consumption.
- `demo-author` approving their own version → **403** with the segregation-of-
  duties text intact, which also shows the `"not configured"` downgrade in
  `respondError` does not fire; `demo-reviewer` on the same call → 200.
- A dependency on an unknown version and a contract on an unknown component →
  **404** each. That both used to be 500 was confirmed rather than inferred: a
  direct `INSERT` into `product_version_dependencies` with a dangling
  `product_version_id` is refused by
  `product_version_dependencies_product_version_id_foreign`, and `respondError`
  has no branch for a driver error.
- `DELETE /traceability-links/no-such-link` → **404**, not 204.
- A freshly submitted baseline answered `"currentStepSequence": 1` with both
  steps `PENDING` — it was `0` before, a sequence no step has. After
  `demo-reviewer` approved step 1: `"currentStepSequence": 2`, step 1
  `APPROVED`, step 2 `ACTIVE`.

**What was not walked in a browser:** the stepper's rendering. The rule it now
follows is covered by `approvalStepper.test.ts`, and the field it reads was
confirmed over HTTP above, but nobody looked at the page.

- Affected components: `plugins/composer-backend` (`service.ts`,
  `repository.ts`, `repository-interface.ts`), `plugins/urs-composer-backend`
  (`service.ts`, `repository.ts`, `domain/workflow.ts`, `db/migrations.ts`),
  `plugins/urs-composer` (`pages/approvalStepper.ts`,
  `pages/URSRequirementSetPage.tsx`, `api/types.ts`), `packages/app`
  (`modules/products/tabs/ArchitectureTab.tsx`), and the suites
  `versionStatusGuards.test.ts`, `approvalStepper.test.ts`,
  `errorMapping.test.ts`, `traceabilityIntegrity.test.ts`,
  `productBaselineIdentity.test.ts`, `approval-chain.test.ts`,
  `approval-contract.test.ts` and `gxp-invariants.test.ts`.

### NXD-073 — The phase frame retires; the plan that carried it does not

- Date: 2026-09-28
- Slice: Stage 0 of the re-founded `PHASE_CLOSURE_PLAN.md` — record change, no
  behaviour, plus one new guardrail check
- Closes: the stale phase attribution in `PHASE_CLOSURE_PLAN.md` §4/§6, the two
  `STATUS.md` paragraphs overtaken by `9d80d16`, and the unstated exclusion of
  `plugins/urs-composer` from the repo-wide test gate

**A plan outlived its organising axis by four days and nobody noticed.**
`PHASE_CLOSURE_PLAN.md` was written 2026-09-22 to close the eight phases of
`IMPLEMENTATION_PLAN.md`. On 2026-09-26 `STATUS.md` re-read the literal exit
criteria and repudiated three of its attributions: per-namespace scoping is
deferred scope rather than a Phase 2 criterion, GP-7 is a component registry
rather than the composition hard-coding Phase 3 names, and Editions and
Federation appear in no phase text at all. Phases 4 and 5 had already been
closed by Slices 2 and 3.

The document was never updated to match. It therefore continued to present a
sequence in which **four of the five remaining slices close nothing**, two of
them ahead of the only one that closes the last phase, justified by a rule
("highest uncertainty last, so if Slice 8 stalls, seven of eight phases are
already closed") whose premise was satisfied before any of them began.

**Retiring the document was considered and rejected.** `CLAUDE.md` §1 forbids
adding a document that claims authority and requires extending #2–#9 instead —
and this plan *is* #7. More practically, its §2 is the reason it worked: the
Definition of Done, and in particular point 2, "one real path executed once",
which is the only DoD item that would have caught Federation and Editions being
marked complete without ever being configured. That section is independent of
the phase frame and had to survive. So the frame retires and the document is
re-founded around a backlog ranked on merit.

**What the frame was hiding.** Two items were mis-ranked by an order of
magnitude, and in both cases the frame is why:

- **Slice 4's only defect is not a slice at all.** An artifact manifest
  declares `distribution: [life-sciences]` and the registry casts it unchecked
  into `DistributionChannel[]`, whose members are `INTERNAL`, `TEMPLATE_EDITION`,
  `PLATFORM_EDITION`, `SAAS`. The value belongs to a different axis, where it
  is spelled `nexora-life-sciences`. It is already persisted. That is a
  validation fix of minutes that sat behind an S-sized loader for a feature
  nobody has asked to exist.
- **Half of Slice 8 needs none of Slice 8.** Three of the five registry
  lifecycle transitions — `submit`, `review`, `deprecate` — resolve no
  namespace at all, and `deprecateArtifactVersion` takes no actor. Both are
  reachable with the service-level `memberGroups` check `P7-S2` already added.
  They sat at position nine of nine, behind an **L** label and a
  `BACKSTAGE_CORE_PROTECTION_BLOCKED` stop condition that has nothing to do
  with them. A mutating registry operation that does not know who invoked it is
  a hole in the audit trail, not a framework gap.

**A gate that was true as written and narrower than it read.** On 2026-09-28
the four gates reported "233 suites, 2116 tests, 0 skipped" while **zero files
from `plugins/urs-composer` appeared in the run**. The workspace drives jest
through its own `bin/test.js` with `BACKSTAGE_OLD_TESTS=true`, so
`backstage-cli repo test` — which is what `yarn test` and CI's `yarn test:all`
invoke — never reaches it. The plugin that owns the URS authoring journey was
outside the number every gate report quotes, including this plan's own DoD
point 1.

The exclusion is not itself wrong; leaving it unstated was. `TEST_GATE_COVERAGE`
compares every workspace's `test` script against `backstage-cli package test`
and requires a named reason for each deviation. It fails in **both**
directions: an undeclared deviation fails, and so does a stale entry for a
workspace that has returned to the standard runner — an exemption list that
outlives its reason understates the gate exactly as silence did. Both
directions were mutation-checked. The check warns rather than passes while any
exemption stands, so the exclusion is printed in every run.

Deliberately **not** re-included here: the workspace itself, and the nine
pre-existing `CreateWizard` failures ("A component suspended while responding
to synchronous input") that re-inclusion would turn red. The shim exists
because the current runner cannot execute that package; taking that on at
position zero is an unbounded React-concurrency investigation, and it is ranked
in §9.4 instead. Making the omission visible and fixing it are separate acts,
and only the first is cheap.

**Also corrected, and worth naming because both read as open work:**
`STATUS.md` still said the `Development` tab "is not built" and that the four
URS→Product steps were unstarted with step 2 "now the next one". Step 2 landed
in `9d80d16` on 2026-09-25 and shipped `DevelopmentTab.tsx` with it; the tab set
has been seven since. Two paragraphs describing work as pending that had been
done for three days.

- Affected components: `scripts/verify-platform-guardrails.mjs`
  (`TEST_GATE_COVERAGE`), `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md`
  (§3.2, §4, §6, the Slice 4/5/7/8 headings, the new §9),
  `docs/nexora-transformation/STATUS.md`.

### NXD-074 — One edge, many installations; scope is an Edition; Nexora does not deploy

- Date: 2026-09-28
- Slice: target-architecture record. No behaviour — the sequence is
  `PHASE_CLOSURE_PLAN.md` §9, the target picture is
  `TARGET_OPERATING_MODEL.md` §6.
- Closes: the open question of how multiple installations relate, and the
  false claim in `STATUS.md` that the Marketplace passes `includeFederated`

The question was posed as a choice: a Nexora platform with a marketplace for
customers, **or** an operator platform that takes templates from Nexora,
authors its own, and offers both to its sites. Plus: does every site need a
full platform, or is a reduced one enough?

**They are not alternatives.** The second contains the first. An operator is a
consumer facing Nexora and a publisher facing its sites — one relationship,
applied twice. Choosing between them would build the same mechanism twice, in
two incompatible ways. Nexora is an open platform (`CLAUDE.md`, first line), so
the model names no privileged participant: an installation may consume from
upstream and publish downstream, the chain has no fixed length, and nothing
privileges the namespace `nexora`.

**Scope is an Edition, never a second build.** `NEXORA_STRATEGY.md`'s first
mandatory principle is "One Platform: Producer and Consumer are capabilities,
not separate applications or global modes", and a reduced consumer variant is
precisely that. `catalog/editions.yaml` is the sanctioned lever and states its
own rule: "Adding a new edition does NOT require changing Core."

A site edition keeps the governing half — catalog, marketplace read, product
registry, validation, release gate, audit trail, and *reading* URS baselines —
and drops the authoring half. The decisive argument is regulatory rather than
technical: every installation must be qualified, and a declared edition makes
"what can this installation do" an auditable fact instead of an assumption,
which bounds the per-site qualification scope and makes that bound defensible.

**Nexora governs; it does not deploy.** Microservice deployment is GitHub's.
This is recorded as a boundary so that "Deployment — MISSING" in
`TARGET_CONFORMANCE_AUDIT.md` stops reading as an open item to be worked off.
The return channel is already built and is the right shape: CI posts release
provenance (`NXD-052`) and test executions under a service token, which is
exactly how a site installation would learn of a GitHub deployment.

**What the investigation found, because it changes the plan's ranking.** The
publishing half is real: publisher self-registration, namespaced artifacts, the
five-act lifecycle, trust tiers — all permissioned server code needing no
repository edit, though with no UI and no tests on the self-registration route.
The consuming half does not exist in any form:

- Federation transfers **six scalar fields** per artifact. The client fetches
  the manifest, reads one field off it for the artifact kind, and discards the
  rest. Nothing is persisted; the "sync scheduler" counts results into the log.
- **No screen requests federated results.** `STATUS.md` claimed the Marketplace
  passes `includeFederated`; it fetches `?includeVersions=true` only. And even
  with the flag, `marketplaceOfferingsFromRegistry` drops any entry without a
  manifest — which the merge has already stripped. Two independent reasons the
  feature could not have worked.
- **There is no install verb**, and its absence is a tested invariant. The only
  call to action links to a *local* scaffolder template, which a consuming
  installation would not have.
- **There is no installation identity.** Two instances collide on the platform
  product `nexora-core`, on `organizationId: internal`, on the catalog
  namespace `default`, and on artifact coordinates — a local fork silently
  shadows an upstream version with no signal.

**Consequence for the sequence.** Editions moves from rank 7 to a precondition:
"which edition am I" is part of installation identity, and two instances must
not talk before they can be told apart. Federation moves from rank 8 and grows
— content, origin attribution, persistence, a config schema, a service
principal instead of a raw bearer, and the tests it has never had. Slice 6
gains one design constraint that would otherwise surface far too late: **the
provider seam must yield a portable coordinate, not an installation-relative
one.** `sourceRef: "template:default/x"` and `documentation: "/create/..."`
resolve against whoever reads them.

Nothing already planned is discarded. Federation needs Slice 6 regardless, so
the framework work and the topology work are the same work in the same order.

**A publishing installation must know its consumers, and the credential is the
registry.** Added to this record on the same day, because it is the same
decision seen from the other end. Requirement: see which customer installations
consume from this one, show it as a topology, and have each consumer
authenticate.

Those are one mechanism, not three features. `backend.auth.externalAccess` is
already an **array** whose entries each carry a `token` *and* a `subject`, and
Backstage's static handler returns that subject verbatim into
`credentials.principal.subject` — it already reaches durable storage today, in
`composer_audit_events.actor`, whenever CI posts provenance. One entry per
consuming installation therefore needs **no code**, and the unused per-entry
`accessRestrictions` is the scoping knob.

Three consequences worth recording rather than rediscovering:

- **One route change unblocks the whole thing.** No read route accepts a service
  principal — `GET /artifacts` is `{ allow: ['user'] }`, so a consuming
  installation presenting a token is refused 401 before anything else can be
  tried. `authorizeReadOrService` in the same router is the pattern; it exists
  for `POST /policies/resolve`.
- **The publishing side records nothing today.** No read route anywhere writes
  an audit event, and the one usage counter that exists keeps timestamps in
  memory and deliberately discards the caller. The new store belongs to
  `artifact-registry-backend`, which serves the catalogue and has no audit store
  of its own; `user_sign_in_events` is the shape to copy. Putting it in
  `composer_audit_events` would be the cross-plugin database access `AGENTS.md`
  forbids and `NXD-052` already refused.
- **Auditing a read is a new principle here.** Everything audited today is a
  mutation. This is a deliberate extension, and it should be stated as one.

The graph reuses what exists: `LineageDAGView.tsx` hand-rolls `GraphNode` /
`GraphEdge`, a rank layout and drag-to-pan with no graph library. Found while
looking: `@backstage/plugin-catalog-graph` is a declared dependency that is
never registered, so the `/catalog-graph` links the code already builds point at
an unrouted path.

Two limits stated plainly. There is **no username/password anywhere** — the
platform supports GitHub OAuth for humans and static bearer tokens for services,
and for installation-to-installation traffic a token is correct regardless. And
this records who **asked**, not who **deployed**: a consumer that draws an
artifact and shelves it is indistinguishable from one that rolls it out. Showing
adoption rather than contact means the consumer reporting back over the CI
channel of `TARGET_OPERATING_MODEL.md` §6.3 — a larger, separate thing.

**Deliberately left open**, because they are not technical:

- whether an operator runs Nexora itself or obtains it as a product — this does
  not change the mechanism, but it does decide the commercial axis
  (`COMMERCIAL_EDITIONS`, entitlements) and who defines the site edition;
- whether sites need visibility of each other — the chain is a tree; site-to-site
  would be a mesh and a different problem;
- which validation evidence travels with an artifact. The local IT/OT team owns
  validation, but whether it starts from nothing or builds on upstream evidence
  is a QA decision with a large effect on scope.

- Affected components: none in code. `docs/architecture/TARGET_OPERATING_MODEL.md`
  (new §6), `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md` (§9 ranking),
  `docs/nexora-transformation/STATUS.md` (the corrected federation claim).

### NXD-075 — A discriminator nobody checked, and a restriction that held for two acts out of five

- Date: 2026-09-28
- Slice: `PHASE_CLOSURE_PLAN.md` §9.2 — the two defects buried inside slices
- Closes: §9.2 items 1.1 and 1.2

Two defects, both surfaced by re-reading slices rather than by a failing test,
and both of a kind the phase frame had ranked far below their cost.

**A value from the wrong axis, already persisted.** The GxP policy pack's
manifest declared `distribution: [life-sciences]` under a comment reading
"which Nexora editions pre-load this policy pack". `spec.distribution` is not
that axis: it feeds `ArtifactVersion.distribution`, typed to the closed
`DistributionChannel` vocabulary — `INTERNAL`, `TEMPLATE_EDITION`,
`PLATFORM_EDITION`, `SAAS`. Validation checked only that the field was a list
of strings, and the registry then cast it through unchecked, so the value was
stored as though it were a channel. The edition is not even spelled that way;
it is `nexora-life-sciences`.

It went unnoticed for a reason worth recording: **nothing reads the persisted
field.** Every consumer of `.distribution` reads it off `GoldenPathRelease`, a
different object entirely. A discriminator that nothing validates and nothing
reads is two problems wearing one name, and only the first is visible.

Three changes. `validateArtifactManifest` checks membership and names the
offending entry, pointing at the axis the value belongs to. The registry
narrows instead of casting, so a caller that bypasses validation still cannot
store a non-member. And the manifest line is **removed rather than corrected**,
because the fact is already recorded on the right axis and in the right
direction: `catalog/editions.yaml` declares
`gxpPolicy: "nexora/gxp-data-product-policy@1.0.0"` under
`nexora-life-sciences`. An edition names the packs it pre-loads; a pack does
not name its editions.

**A restriction that held for the last two acts of a lifecycle and not the
first three.** `P7-S2` added per-namespace membership checking and wired it to
`certify` and `publish`, passing the actor explicitly. The other three
transitions went through a shared `transitionRoute` helper that **discarded the
actor `authorize` had already returned**, so `submit`, `review` and `deprecate`
reached the service knowing only an id. `deprecateArtifactVersion` did not take
an actor parameter at all — withdrawing a released artifact from recommended
use was an anonymous act.

The service side compounded it: `actor` was optional, guarded by `if (actor)`.
An absent actor did not fail; it skipped the check.

All five transitions now resolve the namespace, and **`actor` is required**, so
a route that forgets it fails to compile rather than silently opting out — the
same reasoning `NXD-072` applied to the `refusal` parameter. This needed no new
framework ground: the `memberGroups` check `P7-S2` built was already there,
called from two places instead of five.

Worth stating plainly, because the closure plan ranked this as half of an
**L**-sized slice behind a `BACKSTAGE_CORE_PROTECTION_BLOCKED` stop condition:
a mutating registry operation that does not know who invoked it is a hole in
the audit trail, not a gap in the permission framework. It needed no
conditional permissions and no `ResourcePermission`. What remains behind that
stop condition is list filtering, which is a genuinely different problem.

**Verified live** against PostgreSQL, not only in tests:

- `POST /artifacts` with `distribution: ["life-sciences"]` → **400**, naming the
  entry and pointing at `catalog/editions.yaml`; the same call with
  `["INTERNAL"]` → 201.
- A namespace whose publisher lists a different member: `submit` as a member →
  200; then, with the member list changed, `review` → **403** `Actor
  "user:default/guest" is not a member of publisher "nxd075locked" and cannot
  review artifacts in that namespace.` `review` is one of the three that
  resolved nothing before.

Both mutation-checked: restoring the manifest value fails the on-disk manifest
suite, and removing the three new membership calls fails the five-transition
test.

- Affected components: `packages/platform-common` (`artifact.ts`,
  `artifact.test.ts`), `plugins/artifact-registry-backend` (`service.ts`,
  `router.ts`, `service.test.ts`),
  `catalog/artifacts/nexora/gxp-data-product-policy.yaml`.

### NXD-076 — Content has a provider now, and the filesystem is one of them. Phase 7 closes

- Date: 2026-09-28
- Slice: 6 of `PHASE_CLOSURE_PLAN.md`, via §9.3 · **closes Phase 7, the eighth
  and last**
- Closes: the final phase-level gap in `IMPLEMENTATION_PLAN.md`

Phase 7 names "multiple source/package providers". There was one, and it was
not written down anywhere: the loader called `readFile`.
`ArtifactVersion.sourceRef` existed as the intended seam and was **never
dereferenced** — a declared field, a plan, and no mechanism.

**A provider answers one question: what manifest documents are at this source,
and what does each one say.** Enumeration and reading are deliberately one
operation. A directory can be walked and a URL cannot, and an interface that
pretends otherwise forces every caller to know which kind it is holding.

Two implementations ship, because one is not an abstraction — the closure plan
says so itself. The filesystem provider is the behaviour that already existed,
moved behind the seam unchanged. **HTTP(S) is the second**, chosen over an OCI
registry for one reason worth recording: OCI would almost certainly have
triggered `AGENTS.md`'s unapproved-dependency stop condition, and a dependency
negotiation is the most expensive possible way to prove that a seam is real.
`fetch` is already used across this repository. If OCI is wanted it is a third
provider, not a change to this one.

**One URL, one manifest. Deliberately not an index format.** A directory can be
walked because the filesystem answers "what is in here"; HTTP does not.
Inventing a Nexora-specific index would be a second manifest schema nobody
asked for. Listing URLs in configuration is explicit and reviewable, and it is
enough to prove the seam.

**Refs are portable**, which is the constraint `NXD-074` attached to this slice
before it started. A document's ref is `file:<path relative to the configured
root>` or the URL itself — never an absolute path off this machine.
`/workspaces/…/catalog/artifacts/x.yaml` means nothing anywhere else, and an
installation that federates content must be able to say where something came
from in terms the receiver can also resolve. The loader's failure list is keyed
on `ref` rather than `path` for the same reason.

**A missing source is not a failure, and the two providers agree on what
missing means.** An absent directory and a URL answering 404 both yield "not
there": an operator who configures a mirror that has not been published yet
gets a log line, not a failed startup. Any other non-OK status *is* a failure,
because it means the source exists and something went wrong. One unreachable
source costs only itself — a shared mirror being down is not a reason for a
backend to start with an empty registry.

**One design change came out of writing the test rather than the code.** The
filesystem provider began as a catch-all: anything not `http://` was a
directory. That swallowed `ftp://legacy/x.yaml` as a directory name, found
nothing, and reported "not there" — so a mistyped scheme did nothing at all and
said nothing about it. It now declines anything carrying a URI scheme, so an
unknown scheme reaches the no-provider branch and is reported as the
configuration error it is.

**Explicit non-goals**, both recorded so they are decisions rather than
oversights:

- `RUNTIME_PACKAGE_SOURCE_PATHS` does not migrate. Checked: `sourcePath` is
  read at exactly two sites and only *displayed* — nothing opens the path. The
  suspected overlap between Slices 6 and 7 is nominal and they are independent.
  Without stating this, Slice 6 would have built an abstraction for a consumer
  that never arrives, which is the Editions failure mode repeated.
- `spec.sourceRef` is untouched. It is authored data carrying values like
  `template:default/mqtt-temperature-data-product`, which resolve against
  whoever reads them and are therefore not portable. Making them so is a change
  to what manifests mean, not to how they are fetched. It is the remaining
  portability problem and belongs to the topology track's T6.

The exported entry point is still called `loadManifestsFromDisk`, which is now
a slight lie — it loads from providers, of which disk is one. Kept because it
is the name every caller already uses and renaming it is churn with no reader.

**Verified live**, not only in tests. A manifest served by a local HTTP mirror,
configured as `artifactRegistry.manifests.sources`:

- first start — `Artifact manifests: 1 registered, 21 already present, 0 failed`
  (21 from disk, 1 over the network), with the mirror's access log showing the
  `GET /remote.yaml 200`;
- `GET /artifacts/nexora/nxd076-over-http` returns it with
  `createdBy: system:artifact-manifest-loader`, and it appears in
  `GET /artifacts?includeVersions=true` at `version=1.0.0 lifecycle=DRAFT`,
  indistinguishable from `nexora/oee-data-product` loaded from a file;
- second start — `0 registered, 22 already present`, so idempotence holds
  across providers and not merely within the filesystem one.

Mutation-checked: making the loader ignore its extra sources fails five tests.

- Affected components: `plugins/artifact-registry-backend`
  (`contentProviders.ts` — new, `manifestLoader.ts`, `plugin.ts`,
  `config.d.ts`, `manifestLoader.test.ts`).

### NXD-077 — The evidence package, and the signature asymmetry it makes visible

- Date: 2026-09-28
- Slice: `PHASE_CLOSURE_PLAN.md` §9.4 rank 2
- Closes: rank 2, and the open question `NXD-074` attached to it — whether the
  product side needs electronic signatures

**Fifteen endpoints already answered every part of the question. Nothing asked
it.** Requirements, coverage across both axes, functional specifications and
their trace, components, contracts, traceability, baselines with CI
provenance, the release gate, the audit trail — all readable, none composed.
Demonstrating that a product had been governed therefore meant a human making
fifteen calls and stapling the answers together, which is precisely the task an
inspector asks for and precisely the one the platform made hardest.

`GET /versions/:versionId/evidence-package` assembles them. It is composition
only: no new query, no new table, and it adds no fact the records did not
already hold. Read permission rather than manage, because assembling an
attestation changes nothing.

Three choices worth not rediscovering.

**The release gate is included whether it passes or not.** A package that
omitted its blockers would be a sales document. The case an inspector cares
about is the version that *cannot* be released and can say exactly why — the
live run below reports five blockers and is more useful for it.

**Two audit trails are merged.** `getEntityAuditTrail` was generic all along,
but only `PRODUCT_VERSION` had a route: the acts that created and governed the
product itself were recorded and unreachable. Both are included, sorted.

**Traceability is scoped to the version.** `getProductTraceability` spans every
version of a product, which is right for a lineage view and wrong for a
document about one version.

**The signature question, answered.** `NXD-074` said the decision had to be
recorded before this shipped, because the asymmetry becomes visible exactly
here — a URS baseline that *is* signed printed beside a product approval that
is not. The answer is that the product side does **not** get electronic
signatures:

- `docs/compliance/traceability-and-gmp.md` §1.2 scopes them to the URS side,
  and its gap list G-1…G-7 does not name product approvals;
- §4 rule 2, "nobody approves their own work", already holds through permission
  plus segregation of duties, answering 403 since `NXD-072`;
- lifting the URS signature service is not a lift — 465 lines importing seven
  URS domain types and a repository handle, with credentials in that plugin's
  own database. `AGENTS.md` forbids the cross-plugin reach and `NXD-066`
  already met this wall and chose duplication.

So the asymmetry is **held, not closed** — and therefore stated. The package
carries a `limits` array, and the first entry says in plain words that a URS
baseline carries a Part 11 signature bound to a content hash while a product
approval carries an actor, a timestamp and an SoD refusal, and that the two are
not equivalent.

That idea is borrowed from `buildOverview` in `validation-expert-backend`,
which ends with `notes` saying what it is and is not. It is the most reusable
thing in that file: **a document that does not say what it fails to prove
invites the reader to assume it proves everything**, and the reader of an
evidence package is rarely the reader of this repository. The other three
limits record that deployment is not Nexora's (`NXD-074`), that cross-plugin
correlation is still open (`NXD-066`), and that this is a derived reading with
no content hash of its own rather than a frozen export.

**A frozen, signed export is deliberately not this.** It would need its own
hash and its own lifecycle; the aggregation has to exist first, and it is
useful on its own.

**Verified live.** One call returned all fourteen fields for a DRAFT version:
product and version identity, one component, `coverage.total 0`,
`releaseGate.passed false` with `INVALID_STATUS, UNTRACED_COMPONENT,
NO_APPROVED_BASELINE, POLICY_OBLIGATION_UNMET ×2`, two merged audit events, and
the four limits.

**Shipped without tests, deliberately.** New test coverage is deferred to a
later end-to-end pass at the product owner's direction; the four gates stay
green on the existing suite. The aggregator is composition over methods that
are themselves covered, which bounds the risk — but it is untested code and
this record says so rather than leaving a reader to discover it.

- Affected components: `plugins/composer-backend` (`service.ts` —
  `ProductEvidencePackage`, `EVIDENCE_PACKAGE_LIMITS`, `buildEvidencePackage`;
  `router.ts` — the route).

### NXD-078 — An installation knows what it is, and editions stop being a declaration

- Date: 2026-09-28
- Slice: T2 of the topology track, `PHASE_CLOSURE_PLAN.md` §9.6 — absorbs what
  was Slice 4
- Closes: the `catalog/editions.yaml` dormancy, the false claim in its header,
  and the false claim in `editionHasCapability`'s doc comment

**Two claims were false, and both made dormant code read as live.**
`catalog/editions.yaml` has declared four editions since W3-8 under a header
saying "Core reads this file at startup" — nothing read it, by any route; it
was not even a registered catalog location. And `editionHasCapability`
promised to check "a given edition (or any parent)" while doing a flat
`includes` on one edition's own list, which under-reports three of the four
shipped editions: `nexora-enterprise` would have denied holding
`artifact-marketplace`, which it inherits from core through two hops.

**Resolution is the substance, not the loading.** `editions.ts` in
`platform-common` parses, validates and flattens the `extends` chain into a
`ResolvedEdition` — a separate type from `PlatformEdition` on purpose, because
conflating what an author wrote with what an installation runs is exactly how
the flat-lookup bug happened. Anything deciding behaviour takes the resolved
form, so inheritance cannot be forgotten. Dangling parents, self-extension and
cycles are all reported, each cycle once rather than once per member.

**A malformed catalogue fails startup.** Degrading to "no editions" would
silently ship everything everywhere, which is the precise failure an edition
exists to prevent: an operator with a broken catalogue would get a working
installation with none of the scoping they asked for and no sign of it. A
*missing* file is different and is not an error. A configured edition the
catalogue does not declare also throws — it is almost always a typo, and the
fallback would hand out an unrestricted installation to someone who believed
otherwise.

**Installation identity.** An instance had no id, no name and no notion of
which edition it ran. Tolerable with one instance; a defect with two, which
collide on the platform product `nexora-core`, on `organizationId: internal`,
on catalog namespace `default`, and on artifact coordinates — where a local
fork silently shadows an upstream version with no signal. `GET /installation`
answers it now, and it is what T4's origin attribution will consume.

**The scoping is real, which is the point.** Building identity that nothing
reads would have repeated exactly the failure being corrected. An artifact
declares `spec.editions`; the registry filters by the installation's resolved
edition, inheritance included — an artifact scoped to `nexora-core` is
available to `nexora-life-sciences`, because the narrower edition is a superset
of the broader one rather than a sibling.

Permissive in one direction only. An artifact declaring no editions is
available everywhere: requiring every manifest to opt in would empty the
marketplace of everything written before editions existed, and an artifact with
no stated audience is not a secret. An installation on no configured edition
sees everything, which is the honest reading of "the operator has not asked to
be restricted".

Filtering is applied to both list forms, not only the one the Marketplace
calls. One HTTP route answering two different questions depending on a query
parameter is worse than the cost — and there is no cost until an edition is
configured, because the unscoped path reads no manifests and behaves exactly as
before.

**A circle closes.** `NXD-075` removed `distribution: [life-sciences]` from the
GxP policy pack: right intent, wrong axis, and an id that did not even match.
The axis exists now, and the manifest says `editions: [nexora-life-sciences]`.

**Verified live**, two installations against one database:

- `nexora-hub` on `nexora-life-sciences` — lineage
  `[nexora-life-sciences, nexora-core]`, **8 capabilities** where the edition
  declares 4 of its own, `gxpPolicy` resolved, 4 editions in the catalogue;
  21 artifacts visible, the GxP pack among them.
- `plant-basel` on `nexora-core` — lineage `[nexora-core]`, 4 capabilities;
  **20 artifacts visible, the GxP pack absent.**

That is the executed path the closure plan named for Slice 4, reached from T2.

**One operational constraint re-encountered, worth naming twice.** The first
run showed the pack visible under both editions. The registry already held the
coordinate from an earlier load, so the *stored* manifest was the old one
without `spec.editions` — `NXD-030` exactly: editing a manifest without bumping
its version does not reach a registry that already holds it. The proof required
dropping the row and reloading. Anyone testing edition scoping against a
long-lived registry will meet this.

**Shipped without unit tests**, at the product owner's direction; new test
coverage is deferred to a later end-to-end pass. The four gates stay green on
the existing suite and the behaviour is proven by the live walk above, but the
resolver's edge cases — cycles, dangling parents, the permissive defaults —
are covered by neither, and this record says so rather than leaving a reader to
assume otherwise.

- Affected components: `packages/platform-common` (`editions.ts` — new,
  `artifact.ts`, `index.ts`), `plugins/artifact-registry-backend`
  (`installation.ts` — new, `service.ts`, `router.ts`, `plugin.ts`,
  `config.d.ts`), `catalog/editions.yaml`,
  `catalog/artifacts/nexora/gxp-data-product-policy.yaml`.

### NXD-079 — The operator's GitHub organisation leaves the templates

- Date: 2026-09-28
- Slice: `PHASE_CLOSURE_PLAN.md` §9.4 rank 1
- Closes: rank 1, and the "hard-coded GitHub org" Experience gap in
  `TARGET_CONFORMANCE_AUDIT.md` §10

`github.com?owner=pharma-data-factory&repo=…` was written into the templates as
a literal, four times each, plus once in the Compose page and once more as a
Marketplace display string. **A framework that bakes in its operator's GitHub
organisation is not a framework**: every product any other operator scaffolded
would have been published to the wrong address, and nothing in the platform
would have said so.

**Resolved server-side, because that is the only place the rule holds.** This
file's own docblock already argued it for the URS binding: the picker runs in
the browser, `/compose` bypasses it entirely, and `scaffolder.task.create` can
be called over the API with any value at all. A configured organisation a
caller can override is not configuration, it is a default.
`nexora:scm:resolve-repo` reads `nexora.scm.host` and
`nexora.scm.organization` inside the task and outputs the coordinate.

**It fails when nothing is configured, rather than defaulting.** A silent
fallback is how the literal survived this long. `app-config.yaml` carries
today's values, so behaviour is unchanged — but they are now one setting rather
than twenty-nine literals.

**Seven templates were asking a question and discarding the answer.** Each
declared a `repoUrl` RepoUrlPicker parameter with `allowedOwners:
[pharma-data-factory]`, and not one of them read `parameters.repoUrl` — the
publish step rebuilt the URL from `parameters.name`. The field is gone. The
create form is one question shorter and the question it lost was a fiction.

**All nine publishing templates converted, not seven.** `node-service` and
`mqtt-connector` did it "properly" with `${{ parameters.repoUrl }}`, letting
the user choose. Under a platform-configured organisation that is the *other*
policy, and leaving two templates on it would have meant two rules in one
repository — exactly the inconsistency being removed. The contract test that
caught this is the reason it was noticed: asserting `resolve-repo` runs first
failed on precisely those two.

Also corrected: `ComposePage.tsx` built the coordinate in the frontend, where
an operator cannot change it; and `MarketplaceDetailPage` told every reader
`'GitHub Repository': 'Created in pharma-data-factory'` — an offering asserting
a fact about the operator's GitHub account, and the thirtieth copy of the same
string.

**One test improved rather than merely updated.** `dataProductConformance`
asserted on `spec.steps[0]`, which happened to be `fetch:template`; it now finds
the step by action. An assertion pinned to an index says nothing about the step
it meant, and it broke the moment a step was inserted. The python golden path's
dry-run test changed shape for a deeper reason: it used to substitute a name
into the literal and parse the result. There is no literal to parse now, so it
asserts what the template can actually promise — that it asks the platform and
hard-codes nothing, `expect(raw).not.toContain('github.com')`.

**Gates:** guard:platform 11/9/0, tsc:full, lint:all, check-doc-links PASS,
`CI=true yarn test` 233 suites / 2129 tests / 0 skipped.

**Not executed live.** The four gates are green and the templates parse, but the
scaffolder path itself — a task run end to end against a real GitHub App — has
not been walked for this change. DoD point 2 is therefore **not met**, and this
is a deliberate exception rather than an oversight: work was frozen mid-slice at
the product owner's request. The first thing the next session should do is run
one template and watch the repository land in the configured organisation.

> **Walked 2026-09-29 — and the exception cost seven templates.** The first task
> created against a running backend was refused before any step ran, because
> this change left `repoUrl` in each `required` list after deleting the
> property. See [`NXD-080`](#nxd-080--the-live-run-nxd-079-deferred-and-what-it-found).

- Affected components: `plugins/composer-backend/src/scaffolderModule.ts`
  (`nexora:scm:resolve-repo`), all nine publishing templates,
  `packages/app/src/modules/composer/ComposePage.tsx`,
  `plugins/marketplace/src/components/MarketplaceDetailPage.tsx`,
  `app-config.yaml`, `plugins/nexora-backend/config.d.ts`,
  `packages/platform-common/src/documentation.ts`, and eight contract suites.

### NXD-080 — The live run NXD-079 deferred, and what it found

- Date: 2026-09-29
- Slice: `PHASE_CLOSURE_PLAN.md` §9.4 rank 1, DoD point 2
- Closes: the deliberate exception recorded in [`NXD-079`](#nxd-079--the-operators-github-organisation-leaves-the-templates)

**Seven of the nine golden paths could not be scaffolded by anyone.** The first
task posted to a running backend never reached a step:

```
POST /api/scaffolder/v2/tasks {"templateRef":"template:default/rest-equipment-data-product", …}
HTTP 400 {"errors":[{"message":"requires property \"repoUrl\"", …}]}
```

`NXD-079` deleted the `repoUrl` property from the seven templates that had been
collecting it and discarding it — and left the name standing in each
`required` list. The scaffolder validates `required` against the submitted
values before it runs anything, so those templates refused every input there
is, and no input could have satisfied them: the field was gone, and the wizard
renders no control for a required name with no property. `node-service` and
`mqtt-connector`, which genuinely read the parameter, had both halves removed
and were unaffected.

**Nothing in the repository was positioned to catch it.** The contract test
asserts on `steps` and on one named property. The golden-path suites build
their values by hand and invoke actions directly; `/compose` builds its own
payload. Not one automated path goes through the route that validates
`required` — which is the first thing any actual user hits. Green gates and an
unusable product are not in tension here; they were measuring different things.

**What the run proved once the seven lists were corrected.** Same request,
`status: failed` at `publish`, and the log is the point:

```
[resolve-repo] Publishing to github.com/pharma-data-factory/nxd079-live-check (from platform configuration).
[fetch-base]   … input values {"destination":{"host":"github.com","owner":"pharma-data-factory", …}}
[verify-urs]   No URS baseline given. The product will be created unbound …
[publish]      InputError: No token available for host: github.com, with owner pharma-data-factory,
               and repo nxd079-live-check.
```

The coordinate is built inside the task from `nexora.scm.*`, reaches
`fetch:template` as the generated catalog-info's destination, and reaches
`publish:github` as its `repoUrl` — which is exactly what `NXD-079` claimed and
could not show. The catalog was then read back for all nine templates: every
`required` name resolves to a declared property in the schema the scaffolder
actually serves.

**What is still not proven, stated plainly.** No repository was created. This
container holds no GitHub App credential, so `publish:github` failed at the
credential and the three steps after it were skipped. The failure names the
resolved host, owner and repo, which is strong evidence the coordinate arrived
intact — it is not evidence that GitHub accepted it. The remaining half of DoD
point 2 for `NXD-079` needs a token this environment does not have.

**The guard.** `requires only properties it declares for $id` in
`templateContract.test.ts` checks every parameter page of every registered
template. Mutation-checked: restoring `- repoUrl` to `python-service` fails it
and names the template and the page.

**The general lesson, since it was paid for.** A slice frozen before its live
run is not "almost done". `NXD-079` had four green gates, 2129 passing tests
and a careful record — while seven of nine templates were unscaffoldable. DoD
point 2 exists because the other three points cannot see that.

- Affected components: `templates/{aas-data-product,machine-state-consumer,mqtt-temperature-product,oee-data-product,python-service,rest-equipment-product,unified-namespace}/template.yaml`,
  `packages/backend/src/templateContract.test.ts`.

### NXD-081 — The edition resolver, proven, and its two permissive answers pinned

- Date: 2026-09-29
- Slice: Welle 1.1 of the programme plan; covers the gap `NXD-078` left
- Closes: nothing new. This makes an existing claim checkable.

**`NXD-078` shipped 251 lines and six exports with no test of any kind.** That
is the state `NXD-079` was in the day before [`NXD-080`](#nxd-080--the-live-run-nxd-079-deferred-and-what-it-found)
found seven templates unscaffoldable behind four green gates — and the stakes
are higher here, because this code decides what an installation may see. A
wrong "yes" hands an installation content it is not entitled to; a wrong "no"
removes content it paid for. Neither is visible from outside the process.

**No defect was found.** Stated first and plainly, because the honest result of
a verification pass is often "it was right", and a record that only ever
reports discoveries teaches the reader to expect them. Thirty-four cases across
the six exports, and the resolver answered every one correctly.

**What is now checkable rather than merely asserted.** The docblock made four
promises that nothing enforced: every problem is reported rather than the
first; a cycle is reported once per cycle rather than once per member; an
invalid catalogue throws instead of resolving partially; inheritance is
transitive. All four are tests now. So is the catalogue this repository ships —
`validateEditionCatalogue` over `catalog/editions.yaml` is one assertion, and
it is the one that fails if someone hand-edits the file badly.

**Two permissive answers, pinned deliberately.** Both are correct and both look
like bugs to a reader encountering them cold, which is exactly why they need a
test naming them rather than a comment:

- An artifact declaring **no** `editions` is available everywhere. Requiring
  every manifest to opt in would empty the marketplace of everything written
  before editions existed, and an artifact with no stated audience is not a
  secret.
- An installation on **no** edition sees everything. An operator who has not
  chosen an edition has not asked to be restricted.

The second is the riskier one, and the boundary that makes it safe is not in
this module: an installation configured to an edition the catalogue does not
declare **throws at startup** rather than degrading to "no edition". Without
that, a typo would produce precisely the unrestricted installation the
permissive default is supposed to be a choice. Walked live below.

**A third case, pinned for the same reason:** an empty `editions: []` list is a
valid catalogue. It resolves to no editions, which means any configured edition
fails loudly — the permissiveness lives at the installation boundary, not in
the validator.

**Live, per DoD point 2.** One registry, two installations, same artifact
content:

```
edition nexora-life-sciences  → GET /api/artifact-registry/installation
  lineage ["nexora-life-sciences","nexora-core"]
  capabilities include artifact-marketplace, product-registry, composition-engine,
    governance-basic — all four inherited from core, none in its own list
  GET /artifacts → 21, including nexora/gxp-data-product-policy

edition nexora-manufacturing  → lineage ["nexora-manufacturing","nexora-core"]
  GET /artifacts → 20; only nexora/gxp-data-product-policy is missing
```

`gxp-data-product-policy` declares `editions: [nexora-life-sciences]`, and it
is the only shipped manifest that scopes itself at all — so the difference of
exactly one artifact is the whole of edition scoping as this repository
currently uses it. Small, and it now demonstrably works.

The negative case, also live:

```
edition nexora-lifesciences (a typo)
  Plugin 'artifact-registry' threw an error during startup:
  Configured edition "nexora-lifesciences" is not declared in the edition
  catalogue. Declared editions: nexora-core, nexora-life-sciences,
  nexora-manufacturing, nexora-enterprise.
```

**Mutation-checked, twice.** Making `resolveEditions` stop walking `extends`
fails seven cases including the shipped-catalogue one; making
`artifactAvailableInEdition` compare `id` instead of `lineage` fails two.
Both mutations reproduce real bugs this module was written to remove —
the second is the flat lookup named in its own docblock.

**Not covered here.** No frontend reads any of this; nothing displays which
edition an installation runs. `installation.ts` in `artifact-registry-backend`
is the next unit (Welle 1.2) and is tested separately, because its failure
modes are file-shaped — missing file, malformed YAML — rather than
resolution-shaped.

- Affected components: `packages/platform-common/src/editions.test.ts` (new).
  No production code changed.

### NXD-082 — The installation identity, and the asymmetry that makes the permissive default defensible

- Date: 2026-09-29
- Slice: Welle 1.2 of the programme plan; the second of the three untested modules
- Closes: nothing new. Continues the pass [`NXD-081`](#nxd-081--the-edition-resolver-proven-and-its-two-permissive-answers-pinned) began.

**One asymmetry carries this module, and it is easy to get backwards.** A
*missing* edition catalogue is not an error — an installation that does not use
editions is a legitimate installation. A *malformed* one is fatal. The reason is
not tidiness: degrading to "no editions" would hand an operator an unrestricted
installation while they believed they had a scoped one, and nothing in the logs
would say so. Eighteen cases now hold both halves apart, so a later "let us be
lenient about this" has to argue with one of them rather than quietly widen a
`catch`.

**No defect found here either.** `loadEditionCatalogue` distinguishes `ENOENT`
from every other I/O failure correctly, and `resolveInstallation` trims, falls
back and refuses exactly as documented.

**What the tests pin that a reader would otherwise have to infer:**

- An empty file is **not** a missing file. It parses to `null`, which is not a
  catalogue, and it throws. Someone truncated that file, and truncation is not
  a statement about editions.
- A directory where a file is expected reads as `EISDIR`, not `ENOENT`, and
  must not be swallowed. Only "not there" means "no editions".
- The error names the path. An operator with several config files needs to know
  which one is wrong.
- A blank `id` and a blank `editionId` are absent, not empty — the difference
  between `nexora-local` and a lookup for `""`.
- The failure message says `Declared editions: none.` rather than an empty list
  when no catalogue loaded at all, which is the case an operator is most likely
  to hit.

**Why the permissive default is a decision and not a hole.** `NXD-081` pinned
that an installation on no edition sees everything. That is only defensible
because *this* module refuses a configured edition the catalogue does not
declare. Without the refusal, a single typo would produce precisely the
unrestricted installation the permissive default is supposed to be a choice
about. The two records are one argument; neither half is safe alone.

**Live, per DoD point 2.** The third installation shape, after the two in
`NXD-081`: no `artifactRegistry.installation` block at all.

```
GET /api/artifact-registry/installation
  id                nexora-local          (DEFAULT_INSTALLATION_ID)
  displayName       nexora-local          (falls back to the id)
  edition           null
  availableEditions nexora-core, nexora-life-sciences,
                    nexora-manufacturing, nexora-enterprise

GET /api/artifact-registry/artifacts → 21
  including nexora/gxp-data-product-policy, which the manufacturing
  installation could not see
```

An unconfigured installation knows every edition exists and runs none of them,
and sees the artifact that edition scoping hides elsewhere. That is the
permissive default, executed rather than asserted.

**Mutation-checked twice.** Swallowing every read error instead of only
`ENOENT` fails one case; removing the refusal for an undeclared edition fails
two, including the message-shape one. Both mutations are the plausible
"simplifications" a later reader would reach for.

- Affected components: `plugins/artifact-registry-backend/src/installation.test.ts`
  (new). No production code changed.

### NXD-083 — The evidence package threw for every version, and only off PostgreSQL

- Date: 2026-09-29
- Slice: Welle 1.3 of the programme plan; the last of the three untested modules
- Closes: the `STATUS.md` §Migration Debt entry "three modules shipped with no test at all"

**The third module was the one with a defect.** `buildEvidencePackage` sorts
its merged audit trail with `a.timestamp.getTime()`. `rowToAuditEvent` passes
`row.timestamp` through unconverted while declaring the field as `Date`. On
`better-sqlite3` the driver returns a number, so the call throws
`TypeError: a.timestamp.getTime is not a function` — **for every product
version, because every version has audit events from the act that created it.**
The route could not answer 200 for anything.

**And yet production was fine.** `pg` returns a real `Date` for a `timestamp`
column — measured, not assumed:

```
knex('composer_audit_events').select('timestamp').limit(1)
  typeof: object | instanceof Date: true | value: 2026-09-27T19:13:11.919Z
```

`app-config.yaml` ships `client: pg`, and `NXD-070` made memory mode refuse to
start when permissions are enabled. So the blast radius is every installation
**not** on PostgreSQL, which today is none.

**That is the interesting part, and the reason this is a record rather than a
line in a commit.** The defect was harmless where the product runs and fatal
where the tests run. A module that cannot execute on the stack its own test
suite uses is a module that will not be tested — the impossibility of testing it
*was* the bug's camouflage. It would have survived indefinitely: green on
Postgres, and nobody writes the SQLite test that fails.

**Fixed at the boundary that makes the claim, not at the caller that believes
it.** `rowToAuditEvent` now coerces. Fixing the `sort` instead would have left
the type lying and moved the workaround to the next caller — which is how this
class spreads. The repository is inconsistent about this generally: three
mappers coerce with `new Date(...)`, the rest pass the column through. Recorded
as debt rather than swept, because changing twenty mappers is a different slice
with a different executed path.

**What the tests pin, beyond the defect.** The aggregator computes nothing —
every part was already readable through some fifteen endpoints — so the only
ways it can be wrong are a part silently missing and a part quietly belonging to
another version. Both are invisible to a reader with nothing to compare
against, and both are now covered: the furnished-version case asserts all ten
parts as one object rather than ten expectations, and two scope cases build a
second version and assert its links and contracts stay out.

The `limits` array has its own cases, including one that requires the
signature-asymmetry line by name. `NXD-077` argued that position and chose to
hold the asymmetry rather than close it; removing the line should be a decision,
so it is now a failing test.

**One test states an absence rather than a behaviour.** `buildEvidencePackage`
refuses a version whose product is missing, with its own message. That branch is
unreachable — the foreign key refuses the delete, so there is no orphan to find.
Written down rather than deleted, because "defence in depth behind a constraint"
and "dead code" look identical in the source and only one is safe to remove.

**Live, per DoD point 2**, against PostgreSQL — the configuration where the bug
did *not* reproduce, which is the point:

```
POST /api/composer/products            → 0c44b3ef-…
POST /api/composer/products/…/versions → eb6ccb39-…
GET  /api/composer/versions/eb6ccb39-…/evidence-package  HTTP 200
  generatedAt 2026-09-29T08:10:19.002Z · version 1.0 DRAFT
  requirements 0 · components 0 · contracts 0 · baselines 0
  auditTrail 2  ["2026-09-29T08:10:10.704Z","2026-09-29T08:10:10.752Z"]
  limits 4 · releaseGate passed=false, 5 blockers
GET  /api/composer/versions/no-such-version/evidence-package  HTTP 404
```

**Mutation-checked.** Restoring `timestamp: row.timestamp` fails twelve of the
fifteen cases.

- Affected components: `plugins/composer-backend/src/repository.ts`
  (`rowToAuditEvent`), `plugins/composer-backend/src/evidencePackage.test.ts`
  (new).

### NXD-084 — A dated measurement is corrected by annotation, and the execution order lives in the repository

- Date: 2026-09-29
- Slice: Welle 2 of the programme plan
- Record change. **No executable path — exempt from DoD point 2** under the
  §9 preamble, stated here rather than left to be inferred.

Two durable positions came out of correcting three governing documents. The
corrections themselves are in the commit; what belongs here is the pair of
rules that decided *how* they were made.

**1. A dated measurement is corrected by annotation, never by rewriting.**
`TARGET_CONFORMANCE_AUDIT.md` records what was measured on 2026-09-26, and
that is the only thing it offers — an audit whose findings are edited to match
today is not an audit, it is a status page with a date on it. So §1's
pull-quote keeps "Nexora cannot prove that the product works" verbatim and adds
a superseding note beneath it; §7 keeps its matrix and gains a table of the six
rows that moved; §9 and §10 strike through and say when. A reader can still
answer "what did we know, and when".

This cuts the other way for `STATUS.md` and `PHASE_CLOSURE_PLAN.md`, which
describe the present rather than a moment. Those are corrected in place, with a
dated note only where the old text is instructive.

**2. The execution order belongs in `PHASE_CLOSURE_PLAN.md` §9, not in a
conversation.** §9.4 ranked the backlog and §9.6 ordered the topology track,
and nothing said how the two interleave or where work belonging to neither —
untested modules, stale records, small defects — sits against them. That
ordering existed only as an agreement in a session. New §9.4a states it, marks
what is done, and says why proving came before building.

**What the sweep actually found, and it is the part worth remembering.** The
errors ran in *both* directions. Closed work listed as open is the cheaper
error but not a free one: two notes had outlived their own resolution and each
sent a reader to redo finished work — `STATUS.md` claimed the hardcoded-domain
inventory still showed GP-8 open when the table reads "REMOVED 2026-09-21", and
claimed Wave 1, `5-R1`, `7-R5` and `A-3` existed only as commit messages when
all four are recorded as `NXD-044`…`NXD-047`. The second of those was on the
wave-2 worklist as "write four missing records". The correct action was to
delete the claim.

**A note is not free maintenance.** Both stale notes were written accurately
and never re-read after the thing they described changed. That is not
carelessness, it is the ordinary failure mode of a cross-reference: the document
that changes is not the document that mentions it. The only defence available
is the one `guard:platform` already applies to links — a check that runs — and
no such check exists for claims. Worth knowing before adding the next note.

- Affected components: `docs/nexora-transformation/STATUS.md`,
  `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md` (§9.4a new, §9.5
  corrected), `docs/audits/TARGET_CONFORMANCE_AUDIT.md`. No code changed.

### NXD-085 — One of the two small defects was not a defect

- Date: 2026-09-29
- Slice: Welle 3 of the programme plan, items 3.1 and 3.2
- Closes: both unranked items in `PHASE_CLOSURE_PLAN.md` §9.6 — one by fixing
  it, one by withdrawing it

Taken as one unit because the pair only makes sense together: they were found
in one scoping pass, examined in one session, and the outcomes point in
opposite directions.

**3.1 — the catalog-graph route was never broken.** §9.6 recorded that
`@backstage/plugin-catalog-graph` is a declared dependency `App.tsx` never
registers, so every `/catalog-graph?rootEntityRefs=…` link this repository
builds lands on an unrouted path. Opened in a real browser against the running
app — guest sign-in, client-side navigation, `App.tsx` at `HEAD` with no import
and no `features` entry — the page renders: "Catalog Graph", its filter panel,
and the plugin's own query defaults written back into the URL.

`createApp` from `@backstage/frontend-defaults` **discovers** frontend features
from `package.json` dependencies. Listing one in `features` is how you
configure or override it, not how you turn it on.

The finding was produced by reading `App.tsx` and comparing it against
`package.json`. Every step of that reasoning was correct about the source and
wrong about the product. **It is `NXD-080` in a mirror:** there, four green
gates hid a broken product; here, a careful source reading invented a defect
that does not exist. The same rule answers both, and it is DoD point 2 —
open the thing.

The change that remains from 3.1 is therefore a test, not a fix, and it guards
a different invariant than the one assumed. Discovery keys off `dependencies`,
so `yarn remove @backstage/plugin-catalog-graph` breaks every one of those
links silently, with `App.tsx` untouched and no import to notice missing.
`appRouting.test.ts` requires the dependency for as long as anything links to
the path — and stops requiring it if the links go, which is the other
legitimate fix.

**A guard deliberately not written.** The general form — "every
`@backstage/plugin-*` dependency exporting `./alpha` must be registered in
`App.tsx`" — flags thirteen packages, and eleven are correct as they stand:
`plugin-catalog-react` and `plugin-search-react` are libraries with no page,
and `plugin-scaffolder`, `plugin-search` and `plugin-user-settings` arrive
through this app's own modules. A guard that is wrong eleven times out of
thirteen trains people to add exceptions, which leaves them worse off than no
guard.

**3.2 — the lineage view made two claims it could not support.** Both are
about the same failing: saying more than the evidence allows.

The empty state advertised `GET /api/composer/versions/:id/lineage/dag` —
an endpoint with no frontend consumer anywhere in the repository — on the very
page that would render it. The advertisement is gone. Wiring it is a slice, not
a line: the endpoint is keyed by *product version* id while the component holds
a product *name*, so reaching it means resolving entity ref → product →
versions → one version, and answering which version's lineage a consumer is
looking at. That question has an owner and it is not this commit.

The second is the one that matters. Every failure path — a non-OK response, a
rejected request, an unreachable discovery API — fell through a
`catch { /* silent */ }` into the same empty state, so **"this product has no
lineage" and "the Composer did not answer" rendered identically.** An empty
graph is a statement about the product; a failed request is a statement about
the platform. This is the UI form of a silent fail-open, which this repository
has now met three times: `NXD-045`'s unlogged policy resolver, this `catch`,
and `NXD-083`'s route that could not answer at all.

**Live, per DoD point 2.** For 3.1 the executed path is the browser session
above, including the negative control — the same navigation with the
registration removed, which also renders, and is what proved the finding wrong
rather than merely unconfirmed. For 3.2 it is four component cases, two of
which drive the two distinct failure shapes; mutation-checked by restoring the
silent `catch`.

- Affected components: `plugins/data-products/src/components/LineageDAGView.tsx`
  and its new test, `packages/backend/src/appRouting.test.ts` (new — it lives
  there because `packages/app`'s ESLint config restricts `fs` and `path`,
  correctly),
  `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md` §9.6. `App.tsx` is
  unchanged, which is the finding.

### NXD-086 — The name NXD-043 declared gone, and the guard that only read two files

- Date: 2026-09-29
- Slice: Welle 3 item 3.3
- Closes: the `STATUS.md` §Migration Debt entry "two product names are live at once"

**The question was posed on a false premise, and the answer it got does not
apply.** The product owner was asked to choose between `nexora` and
`pharma-data-factory` as the image name, and chose `nexora`. Neither was
available: `NXD-043` had already retired both in favour of
`data-product-platform`, which matches the repository component of the GHCR
path this publishes to. The product is Nexora and always was — `CLAUDE.md`,
the catalogue, the landing page, the PWA manifest. The *artifact* is named
after the repository. Those are different axes, and conflating them is how the
question came to be asked.

**What was actually wrong.** `NXD-043` unified the two names it found in the
two files its test happened to read — `packages/backend/package.json` and
`docker-compose.yml` — and wrote in that test's comment that both ad-hoc names
were "gone". They were not. `pharma-data-factory:mvp-1.0` remained the default
tag in `scripts/build-production-image.sh`, in its PowerShell twin, and in
`deploy/production.local.env.example`, none of which the test looked at. The
name it declared gone outlived it by six days.

It was self-consistent, so nothing broke: the build script tagged
`pharma-data-factory:mvp-1.0` and the env example ran that tag. But it was one
edit away from breaking in the way that reads worst — change either and
`docker:prod:up` runs an image `docker:prod:build` never produced, and Docker's
error for that is a failed pull from Docker Hub, which looks like a network
problem rather than a naming one.

**A guard that reads two files must not assert about all of them.** That is the
transferable part. The old comment was not wrong about what it checked; it was
wrong about what it claimed. The test now reads all three production-path files
and asserts they agree, and separately that
`docker-compose.production.yml`'s default stays a full GHCR coordinate — a bare
local tag there would silently resolve against Docker Hub.

**One name deliberately left alone.** `docker-compose.validation.yml` defaults
to `platform-core:1.0-rc2`. It carries its own `build:` section, so it builds
what it runs and cannot drift; and the tag is named in an executed Platform
Core IQ re-test. Renaming a tag that appears in validation evidence is not a
cleanup, it is an alteration of the record.

**Record change plus a one-line default change — no executable path, and
saying so rather than staging a `docker build` for appearances.** Building the
production image here proves the tag string, which the test already does
without a five-minute build. Exempt from DoD point 2 under the §9 preamble.

- Affected components: `scripts/build-production-image.sh`,
  `scripts/build-production-image.ps1`,
  `deploy/production.local.env.example`,
  `packages/backend/src/brandSeparation.test.ts`,
  `docs/nexora-transformation/STATUS.md`.

### NXD-087 — The consuming installation can read, and three claims about it were wrong

- Date: 2026-09-29
- Slice: T3 of the topology track, `PHASE_CLOSURE_PLAN.md` §9.6 — wave 4 of
  §9.4a
- Closes: the T3 row; the `TARGET_OPERATING_MODEL.md` §6.5 "one route change
  unblocks it"

The substance is four lines of code: six registry read routes move from
`authorize` to `authorizeReadOrService`, the helper that has sat in the same
file since closure Slice 3 and was wired to exactly one route. A consuming
installation presents a static `backend.auth.externalAccess` token, Backstage
resolves it to a service principal, and the routes answer.

**Why all six and not just `GET /artifacts`.** Federation calls one route
today, so one would have been enough to make it work. But `GET /installation`
exists *for* a federating peer — its own doc comment says so — and it refused
one, which is the sharper version of the same defect: the route written for
that caller was the route that caller could not call. Splitting the six across
two slices means arriving at the same argument twice.

**No write route admits a service principal, and a test says so.** A consuming
installation reads; it does not publish into its upstream. That asymmetry is
the design, so it is pinned rather than left to be inferred from the absence
of a change.

**The two mutation checks are the load-bearing part.** Reverting one route to
`authorize` fails exactly that route's two tests. Making the helper consult the
permission framework for services fails all seven service tests — which is the
assertion that matters, because the 200 alone would survive that mutation. The
contract is *the framework is not consulted*, not *the call succeeds*.

## Three claims that did not survive being executed

The code was the easy half. What this slice is actually worth recording is
that three separate statements in the repository about this exact change were
wrong, and each was wrong in the same way: derived by reading, never run.

**1. It was a 403, not a 401.** `NXD-074`, the T3 row, the
`authorizeReadOrService` docblock and `TARGET_OPERATING_MODEL.md` §6.5 all
said a consuming installation presenting its token gets 401. It gets **403**:
Backstage answers a disallowed *kind* of credential with `NotAllowedError`
("This endpoint does not allow 'service' credentials") and reserves 401 for a
caller presenting none. Measured before changing anything — all six routes,
403 for the service token, 401 only with no header at all.

Nothing behaved differently for the error, which is why it survived four
documents: both are refusals, and the federation client logs whichever status
it gets. It matters anyway. Anyone debugging this by status code would have
gone looking for a missing or malformed credential, which is what 401 means,
rather than a credential of the wrong kind, which is what was happening.

**2. The credential was unpresentable, not merely unissued.** §6.5 says adding
a consumer "requires no code at all" — one `externalAccess` entry. True, and
yet no committed configuration anywhere enabled a service principal outside
the production image. Every previous live verification of a service-principal
route (`NXD-052` most clearly) must have used an uncommitted overlay, and none
of them wrote down what it was. So the runs were not reproducible from the
repository, and the recipe existed only in whoever had last done it.

`app-config.service-token.yaml` fixes that, and is deliberately **not**
auto-loaded — `app-config.local.yaml` is, so a token placed there would
quietly be live on every developer machine. A credential should take an
explicit act to enable. The recipe is now in
[`development-workflow.md`](../engineering/development-workflow.md) beside the
guest-token one, with the 401/403 matrix, because "which principal does this
route want" is not guessable from outside and the two refusals differ.

**3. My own justification for touching the config schema was wrong.** The
plan for this slice argued that `artifactRegistry.federation` had to be added
to `config.d.ts` because `loadFederationConfig` reads keys no schema declares
and "Backstage rejects undeclared keys, so the block cannot be written today".

It can. A backend started with a full `federation` block against the
unmodified schema comes up clean — no error, no warning. Backstage does not
reject undeclared config keys at runtime; `backstage-cli config:check
--strict` does, and it reports `additionalProperty=federation` alongside ten
others (`composer`, `ursComposer`, `dataProducts`, `validationExpert`,
`pluginDirectory`, `modelCompany`, `createAuthorizationAuditPath`…). That
check is in no gate. So the schema addition is worth having — `apiKey` is
marked `@visibility secret` rather than merely undeclared, the keys become
discoverable, and one of eleven strict-check complaints goes away — but it was
**not** the blocker the plan claimed, and T4 was never gated on it.

Kept rather than reverted, with the reason restated accurately. The reason it
is written down at this length is that it is the same failure as the other
two, committed by the same person on the same day, one paragraph after
describing the pattern. Reading is not running, including when what you are
reading is your own plan.

## Found in passing: `NXD-016`, for the third time

The first full gate run after this change failed one suite in a plugin this
slice does not touch. `evidencePackage.test.ts` — written the day before, by
`NXD-083` — asserts that deleting a product is refused by a foreign key, using
a bare `.rejects.toThrow(/FOREIGN KEY constraint failed/)`. It passed in
isolation, passed a full run the day it landed, and failed the next one with
"Received function did not throw".

That is the exact signature [`NXD-016`](#nxd-016--assert-database-refusals-on-the-message-not-with-rejectstothrow)
recorded: better-sqlite3 is a native module whose binding is loaded once per
jest worker, so the `SqliteError` carries the `Error` intrinsic of whichever
module realm loaded it first, and jest reports a non-`Error` rejection as "did
not throw" while the constraint fired correctly. `NXD-016` banned the bare form
for native-driver refusals and shipped `expectRefusedByDatabase`, whose own
docblock warns that the mistake is easy to make again and names one earlier
recurrence. This is the second.

Changed to the helper. **Not reproduced deterministically**, and that is worth
stating plainly rather than dressing up: `NXD-016` gives `--runInBand` as the
repro, and under it the composer-backend suite passes both with and without
the fix — the collision depends on which suite loads the binding first across
26 projects, which `--runInBand` within one workspace does not recreate. A
repeat full run was green. So the evidence is a matching signature and a
prescribed remedy, not a caught-in-the-act reproduction.

The helper is a strict improvement regardless: it asserts the same message and
fails loudly with a written-out explanation if the write is *accepted*, which
is the case that would actually matter. Deleting the test was never available
— `PHASE_CLOSURE_PLAN.md` §2 names removing a guard test to make a gate pass as
a stop condition, and a failing guard is a question.

What this says about the gate: a suite can be written, reviewed, land green and
still carry a known-and-recorded defect, because the defect is invisible in
every run where the scheduling happens to be kind. The only defence that
worked here was a full run on a different day.

## What this does not do

A federated read now returns 200. Nothing renders it. The merge in
`router.ts` keys on `namespace/name` with no version, so an upstream artifact
at a higher version than the local one is still discarded by construction; the
manifest is still fetched and thrown away, so `marketplaceOfferingFromManifest`
would produce no card even if it were asked; and no screen passes
`includeFederated`. All of that is T4. The door is open and nobody has walked
through it — one instance and a `curl` cannot show otherwise.

**Verified live**, one backend on PostgreSQL, before and after the change,
with a guest user token and a static service token side by side:

| Route | service before | service after | guest | none |
| --- | --- | --- | --- | --- |
| `GET /installation` | 403 | **200** | 200 | 401 |
| `GET /publishers` | 403 | **200** | 200 | 401 |
| `GET /artifacts` | 403 | **200** | 200 | 401 |
| `GET /artifacts/:ns/:name` | 403 | **200** | 200 | 401 |
| `GET /artifacts/:ns/:name/versions` | 403 | **200** | 200 | 401 |
| `GET /artifacts/:ns/:name/versions/:v` | 403 | **200** | 200 | 401 |
| `POST /artifacts` | 403 | **403** | — | — |

The service principal reads 21 artifacts and the installation's resolved
edition; the write route refuses it with the same message it always did.

- Affected components:
  `plugins/artifact-registry-backend/src/router.ts`,
  `plugins/artifact-registry-backend/src/router.test.ts`,
  `plugins/artifact-registry-backend/config.d.ts`,
  `plugins/composer-backend/src/evidencePackage.test.ts` (the `NXD-016`
  recurrence, unrelated to the slice),
  `app-config.service-token.yaml` (new),
  `docs/engineering/development-workflow.md`,
  `docs/architecture/ARCHITECTURE_GUARDRAILS.md` (D-5 amended),
  `docs/architecture/TARGET_OPERATING_MODEL.md`.

### NXD-088 — The platform becomes observable, and three audit findings were wrong

- Date: 2026-09-29
- Slice: maturity-audit remediation, wave 1 — the low-effort half of the
  findings raised against the running code on 2026-09-29
- Closes: nothing in `PHASE_CLOSURE_PLAN.md`. This is remediation of defects
  found by reading and running the code, not a planned slice.

A product-maturity audit of the running system placed it at the upper end of
stage 2 of 5: construction quality at 3–4 (2,239 green tests, clean `tsc`,
fail-closed permission layer, 41 tables with 94 indexes), operability at 1–2.
Three findings blocked stage 3, and none of them was an architectural
problem — all three were integration work that had not been done.

**A provider that went quiet took the whole backend with it.** Five outbound
LLM call sites across `composer-backend` and `urs-composer-backend` called
`fetch` with no signal. That is not a slow-request problem: the handler waits
on the socket forever, holding a connection from the plugin's knex pool, and
enough of them stop the process answering anything at all — not just the AI
feature that caused it. `fetchWithTimeout` in `@internal/platform-common` puts
`AbortSignal.timeout` on all five, with `composer.ai.timeoutMs` /
`ursComposer.ai.timeoutMs` defaulting to 60s. A caller-supplied signal is
respected and a caller-driven abort is not relabelled as a timeout; a
non-positive configured value is refused at startup, because `timeoutMs: 0`
reads like "no timeout" but aborts instantly and would look like a provider
outage.

**Customer entitlements were being discarded, successfully.**
`MarketplaceLinkStore.persist()` returned without writing when no path was
configured, and returned *successfully*. `commercial.awsMarketplace.linkStorePath`
was unset in every committed `app-config`, so setting the two AWS variables
was enough to reach a deployment that resolved a customer, recorded the link,
answered 200, and lost it on the next restart, with nothing logged and nothing
failed. The first symptom is a paying customer who cannot reach the product.
`assertLinkStoreDurability` now refuses that combination at startup.

Keyed on `awsMarketplaceConfigured` (region **and** product code) rather than
`entitlementProvider === 'aws'`, because region plus product code is what makes
real fulfillment reachable, and registrations arrive over an unauthenticated
route that never consults the provider setting. A store injected by a caller
is left alone — that is a declared choice, and the tests depend on making it.

`app-config.marketplace-test.yaml` is the proof the defect was live rather
than theoretical: it set `linkStorePath: ${AWS_MARKETPLACE_LINK_STORE:-}`, an
empty string that `loadCommercialConfig` turns into `undefined`. A committed
overlay ran a real AWS integration against a store that silently threw away
every write. Four existing tests encoded the same shape and failed the moment
the assertion existed.

**Nothing produced a number.** No metrics, no traces, no error tracking — the
reason an operator could not tell a slow database from a slow LLM call, and
why "what happens at ten times the load" had no answer that was not a guess.
Almost all of the fix was already in the process: `prom-client` is a
dependency of `plugin-catalog-backend` and `plugin-scaffolder-backend`, and
both write to its *default* registry, so `catalog_processing_duration_seconds`
and `catalog_processing_queue_delay_seconds` had been recorded all along with
nothing able to read them. `rootModuleMetrics` adds the endpoint that exposes
them plus `collectDefaultMetrics` for the process, including
`nodejs_eventloop_lag_seconds`. The package moved the lockfile by one line.

**Per-route RED metrics are deliberately absent.** They need a middleware
ahead of every route, and `rootHttpRouter` appends handlers to one Express
router in registration order — a middleware added by a module covers whatever
registered after it, which is worse than no data because the gaps are
invisible. That belongs to OpenTelemetry auto-instrumentation, which patches
`http` itself and has no ordering to lose.

## Three findings that did not survive contact with the code

The audit was derived partly by grep, and three of its conclusions were wrong
in the way grep is wrong: the signal searched for was absent, and the
capability was present under another name.

**1. "No helmet" — Backstage has always applied it.**
`rootHttpRouterServiceFactory` runs `helmet → cors → compression → logging →
rateLimit` on every request. The recommendation was to add a dependency the
kernel already owns.

What the same reading did find is that `rateLimit()` is a pass-through while
`backend.rateLimit` is absent, and it was absent — so the only rate limiting
anywhere in the repository was the in-process one guarding entitlement
registration. Enabling it is configuration, not code, and Backstage supports
a Redis store for it, which turns the "distributed rate limiting" long-term
item into configuration too. `backend.trustProxy` is deliberately **not**
defaulted: the correct value depends on how many proxies are in front, and
guessing it wrong silently trusts a spoofable `X-Forwarded-For`.

**2. "No code splitting" — every page is already lazy.** The audit grepped for
`React.lazy` and `Suspense`, found zero, and concluded a 26,000-line app
shipped as one bundle. This app is on the new frontend system, where splitting
is `loader: () => import('./Page')` in a page extension. All 28 page
extensions have one. The three eager component imports are app-shell elements
— sidebar, cookie banner, a gate — rendered on every page and correctly eager.

**3. "Replace the catalog full scans with `getEntityByRef`" — five of seven
pages cannot.** This is the one worth keeping, because the correction makes the
defect *worse* than reported, not better.

Seven detail pages fetch every `Component` and `API` and pick one out with a
client-side `.find`. Only `QualityDetailPage` converts safely:
`toIndustrialDataProduct` reads nothing outside the entity it is given.
`AssetDetailPage` keeps its full scan — it is a reverse-dependency lookup and
genuinely needs every Component — but reads exactly three fields, so a `fields`
projection is exhaustive and verifiable.

The other five compute cross-entity relationships in the browser.
`withCatalogRelationships` searches sibling products for contract consumers and
providers; resolving one entity by ref would have returned `consumers: []` and
`compatibilityStatus: 'UNKNOWN'` — an invisible behaviour regression, silently
wrong rather than loudly broken. A `fields` projection saves nothing there
either, because those transforms read `metadata`, `spec`, `relations` and
`annotations` essentially in full.

So the real defect is not "the wrong catalog call". It is **relationship
computation living in the client**, which needs a backend endpoint. That is an
architectural change and has been moved out of the low-effort wave. Caching
the call first, as the audit's mid-term item proposed, would have put a cache
in front of an O(n) fetch without making it smaller.

## Scanning reports; it does not yet gate

CodeQL, Trivy, `yarn npm audit`, SBOM and provenance attestation are added,
and none of them fails a build. That is a decision, not an omission.

The tree already carries critical and high advisories — `node-gyp → tar`,
`ajv → fast-uri`, `@module-federation → adm-zip` — all transitive through
Backstage's own dependencies. Clearing them means moving `@backstage/*`
versions, which `AGENTS.md` routes through a dedicated Backstage upgrade gate
rather than an ad-hoc bump. A hard gate would therefore have shipped a
permanently red pipeline, and a red pipeline that everyone learns to ignore is
worse than an honest report.

What is available today is done: findings accumulate in the Security tab
rather than scrolling past in a log, and Dependabot raises the PRs — with
`@backstage/*` grouped into a single pull request, so the grouping itself
enforces the guardrail against piecemeal upgrades. `continue-on-error` comes
off when the backlog is empty; the workflow comments say so.

The coverage threshold is set at statements 65 / branches 55 / functions 55,
just under the measured 66.9 / 56.6 / 57.4. A ratchet against regression, not
a target — and `test:all` already passed `--coverage`, so the gate was one
config key away the whole time.

- Deferred, with the reason: **error tracking**. `@sentry/node` is the only
  item here that would have moved the controlled lockfile substantially, and
  under `AGENTS.md` dependency governance that is a decision for a human, not
  a convenience. `D-4` stays half-open until it is taken.

- Affected components:
  `packages/platform-common/src/llm-timeout.ts` (new),
  `packages/platform-common/src/index.ts`,
  `packages/backend/src/metrics/module.ts` (new),
  `packages/backend/src/index.ts`,
  `packages/backend/package.json`,
  `plugins/composer-backend/src/llm-client.ts`,
  `plugins/composer-backend/src/plugin.ts`,
  `plugins/urs-composer-backend/src/llm-client.ts`,
  `plugins/urs-composer-backend/src/plugin.ts`,
  `plugins/entitlements-backend/src/linkStore.ts`,
  `plugins/entitlements-backend/src/runtime.ts`,
  `plugins/nexora-quality/src/components/QualityDetailPage.tsx`,
  `packages/app/src/modules/assets/AssetDetailPage.tsx`,
  `app-config.yaml`, `app-config.production.yaml`,
  `app-config.marketplace-test.yaml`,
  `docker-compose.production.yml`, `deploy/production.local.env.example`,
  `.github/workflows/ci.yml`, `.github/workflows/codeql.yml` (new),
  `.github/dependabot.yml` (new),
  `package.json` (coverage threshold).

### NXD-089 — The relationship graph moves out of the browser, and the annotation keeps working

- Date: 2026-09-29
- Slice: maturity-audit remediation, wave 2 — the finding `NXD-088` could not
  close
- Closes: nothing planned. Continues the remediation `NXD-088` opened.

`NXD-088` reported that seven detail pages fetched every `Component` and `API`
in the catalog and picked their subject out with a client-side `.find`, and
that only one of them could be converted to `getEntityByRef`. The reason is
the part worth recording: `withCatalogRelationships` derives a product's
consumers, its provider and its compatibility status **from its siblings**.
Given one entity it returns `consumers: []` and `UNKNOWN` — silently wrong,
which is worse than slow. The defect was never "the wrong catalog call". It
was relationship computation living in the client.

**The catalog already answers this, and the file already knew.** Backstage
materializes `apiConsumedBy`, `apiProvidedBy` and `dependencyOf` as the
reverse of `spec.consumesApis`, `spec.providesApis` and `spec.dependsOn`.
`usedByFromCatalogRelations` in `model.ts:329` uses `apiConsumedBy` to do a
reverse lookup in O(1). Sixty lines later `withCatalogRelationships` scans the
whole catalog for the same answer. Two implementations of one question, one of
them O(n), side by side in one file.

**The chosen fix resolves a neighbourhood, and does not touch the logic.**
`fetchProductNeighbourhood` walks the relations — the product by ref, the API
entities it provides or consumes, the components on the other side of those,
and its `dependsOn`/`dependencyOf` peers — and hands the result to the
*existing* `toRelatedDataProducts`, unchanged. Three round trips,
O(neighbours) instead of O(catalog). The relationship logic is not
reimplemented; it is given a smaller input, so behaviour is preserved by
construction rather than by inspection.

That claim is measured, not asserted. `catalogNeighbourhood.test.ts` runs both
paths over the same fixture and compares the resulting `DataProduct` objects
with `toEqual`, for the provider and the consumer sides, and separately pins
the two values a naive `getEntityByRef` would have lost: `usedBy` and a
`compatibilityStatus` that is not `UNKNOWN`.

**The neighbourhood is complete for its subject, not for its neighbours.**
`toRelatedDataProducts` maps every entity in the set, so neighbours in the
output carry relationships computed against a partial catalog. Callers take
the subject and disregard the rest. Stated here because the type does not say
it and the next reader will otherwise assume the whole result is usable.

## The processor is what makes the graph trustworthy

`toDataProduct` resolves contracts through a three-tier cascade: relations,
then `spec.*Apis`, then the `dataprod.platform/providesContract` annotation.
Only the first tier has a reverse edge, so an annotation-only product cannot
be asked "who consumes you" without a scan. Converting the pages without
addressing that would have silently emptied the consumer list for exactly
those entities — the same class of invisible regression the audit's original
recommendation would have caused.

`ContractRelationProcessor` copies the annotation into `spec.providesApis` /
`spec.consumesApis` in `preProcessEntity`, and `BuiltinKindsEntityProcessor`
then emits both directions of the relation in its own `postProcessEntity`,
exactly as for a product that declared the refs itself. The annotation keeps
working **and** the graph becomes uniformly reliable. Backstage's own
extension point, configured rather than replaced.

It returns the entity by identity when it changes nothing. The catalog hashes
processed entities to detect change, and rewriting `spec` with identical
values on every refresh would churn the processing loop. It also declines to
write an empty array: `providesApis: []` claims the product provides nothing,
which is not what a missing annotation means.

Nothing in this repository emits those annotations today — all four Golden
Path templates write real `spec.providesApis` and ship real `kind: API`
entities. The processor is for entities registered by hand or imported from
elsewhere, which is precisely the population that would otherwise have lost
its consumers quietly.

## A scan that was also wrong, not merely slow

`ProductContractPage` found its consumers by reading every Component and
testing `spec.dependsOn` with `ref.includes(name)`. A substring test: a
product named `filler-01` collected the consumers of `filler-01-extended` as
its own. The `dependencyOf` relation is an exact edge, so replacing the scan
fixed a correctness defect that nobody had reported and the scan's cost had
been hiding.

- Converted: `DataProductDetailPage` (neighbourhood), `ProductContractPage`
  (`dependencyOf`). `QualityDetailPage` and `AssetDetailPage` were already
  done under `NXD-088`.
- Still scanning, and honestly so: `PlatformComponentDetailPage`,
  `EquipmentDetailPage`, `MarketplaceDetailPage`. Each needs its own
  neighbourhood shape — component library usage, related Resources and
  Systems, marketplace composition — and the pattern is now proven rather
  than speculative. Not started rather than half-done.

- Affected components:
  `plugins/data-products-backend/src/contractRelationProcessor.ts` (new),
  `plugins/data-products-backend/src/catalogModule.ts`,
  `plugins/data-products/src/catalogNeighbourhood.ts` (new),
  `plugins/data-products/src/components/DataProductDetailPage.tsx`,
  `plugins/nexora-contracts/src/components/ProductContractPage.tsx`.

### NXD-090 — Validation evidence stops living in the container

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 3 — quick win S1 of the re-audit of
  2026-09-30
- Closes: re-audit finding S1 (Validation Expert evidence not durable in
  production).

The re-audit of 2026-09-30, run against `958c00f`, found that the Validation
Expert wrote its runs — test executions, results, the evidence a validation
decision rests on — to `validation/runtime/runs-store.json` in production.
Not because anyone chose it: `getPersistenceMode` falls back to `file` when
`validationExpert.persistence.mode` is unset, and neither
`app-config.production.yaml` nor `app-config.docker.yaml` set it. The path is
not on the `/app/.runtime` volume and `packages/backend/Dockerfile` never
copies `validation/`, so every redeploy discarded the store. The plugin knew:
it logged a warning when `auth.environment` was production, and carried on.

This is the defect `NXD-064` C-1 closed for `ursComposer` — an overlay that
does not mention a key inherits whatever the base says — and the same
refusal is applied here rather than a different one:

- `getPersistenceMode` throws when `auth.environment` is `production` and the
  mode is anything but `postgres`. That covers the explicit `file`, the
  implicit default (the case that actually shipped, and the message says so),
  and `memory`, which loses the same evidence faster. The warning is gone;
  a warning nobody acts on was the defect.
- Both production-auth overlays now set `validationExpert.persistence.mode:
  postgres` explicitly. `app-config.docker.yaml` is included because it also
  sets `auth.environment: production` and would otherwise have stopped
  starting — the guard found its own second instance before it shipped.
- `committedConfigIntegrity.test.ts` asserts the **merged** base + overlay
  value, the way the container entrypoints layer them, next to the identical
  assertion for `ursComposer`.

**Deliberately not refused:** `file` under `permission.enabled`, which
`ursComposer` also refuses for `memory`. The base `app-config.yaml` enables
permissions for local development and leaves this key unset, so that second
condition would stop every local start. Local runs are not evidence; the
production condition is the one that protects a record someone later relies
on.

**Not changed:** the local default stays `file`. The runs store is a genuine
convenience for a developer iterating on the validation package, and
`PostgresValidationRunRepository` requires a database the local default does
not always have.

- Affected components:
  `plugins/validation-expert-backend/src/plugin.ts`,
  `plugins/validation-expert-backend/src/persistence-mode.test.ts` (new),
  `app-config.production.yaml`, `app-config.docker.yaml`,
  `packages/backend/src/config/committedConfigIntegrity.test.ts`.

### NXD-091 — A catalog author no longer chooses where the Control Plane connects

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 3 — quick win S2 of the re-audit of
  2026-09-30
- Closes: re-audit finding S2 (server-side request forgery through the
  consume query).

`GET /consume/query` proxied to an upstream and returned its JSON body to the
caller. The upstream came from `resolveBaseUrl`: the operator's
`dataProducts.consume.baseUrls` by product name or template, and failing
that, the entity's `dataprod.platform/consume-base-url` annotation. The path
came from `dataprod.platform/consume-rest-path`, also an annotation. Anyone
who can register a `catalog-info.yaml` — a Golden Path repository registered
through `catalog:register` is enough — could point the Control Plane at
`169.254.169.254` or any service on its own network and read the answer.

**Two sources, two trust levels, and the distinction is the decision.**
`resolveUpstream` (`consume/upstream.ts`) replaces `resolveBaseUrl`, which is
deleted rather than left beside it:

- **Configuration is trusted as written, loopback included.** The only real
  upstream in the repository is the Model Company's
  `http://127.0.0.1:18080`, and a plant historian normally sits on a private
  network. Applying an IP block to operator configuration would have broken
  the one working integration and protected against nobody — the operator
  already controls the process.
- **The annotation is followed only if its origin is in the new
  `dataProducts.consume.allowedOrigins`, and every address its host resolves
  to is public.** Loopback, RFC 1918, CGNAT, link-local (the metadata
  endpoint), `0.0.0.0/8`, multicast, and the IPv6 equivalents, via
  `net.BlockList`, which also matches IPv4-mapped IPv6. The allow-list alone
  would not be enough, because a listed hostname can resolve anywhere; the
  address check alone would not be enough, because it cannot tell the
  operator's intended partner from any other public host. The default list
  is empty, so the annotation is inert until someone decides otherwise.
- **The path is catalog-authored under both sources**, which the finding did
  not say and which matters more than it looks: `@evil.example/x` appended
  to the trusted `http://127.0.0.1:18080` parses as host `evil.example`. The
  joined URL must keep the base's origin, and a leading `//` or any `\` is
  refused before parsing can normalize it away.
- **Redirects are refused** (`redirect: 'error'`). Following one would
  re-open every check just made.
- **A refusal is not a fixture.** A refused upstream answers
  `source: 'unavailable'` with the reason code and a warning in the log, the
  same shape as an unreachable one. Falling back to fixture data would show
  a consumer invented numbers for a product that declared a real source.

**Residual risk, stated.** The address check resolves the hostname and then
`fetch` resolves it again, so a host that answers differently the second
time (DNS rebinding) passes. Closing that requires pinning the resolved
address in the connection, which means an HTTP agent `fetch` does not expose
without `undici` as a direct dependency — an AGENTS.md dependency decision,
not taken here. The window only exists for an origin the operator has
explicitly allow-listed.

`catalog/samples/industrial.yaml` still carries
`consume-base-url: http://127.0.0.1:18080` on `checkweigher-01-oee`. It is
now inert — configuration names that product and wins — and left in place
so the sample keeps showing the annotation's shape.

- Affected components:
  `plugins/data-products-backend/src/consume/upstream.ts` (new),
  `plugins/data-products-backend/src/consume/upstream.test.ts` (new),
  `plugins/data-products-backend/src/consume/router.ts`,
  `plugins/data-products-backend/src/consume/router.test.ts`,
  `plugins/data-products-backend/src/consume/fixtures.ts`,
  `plugins/data-products-backend/src/router.ts`,
  `plugins/data-products-backend/src/plugin.ts`, `app-config.yaml`,
  `docs/data-product-framework/DATA-PRODUCT-MODEL.md`.

### NXD-092 — The product and user trails become append-only where it counts

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 3 — quick win D2 of the re-audit of
  2026-09-30
- Closes: re-audit finding D2 (product-side audit trail not append-only at
  the database level).

`urs-composer-backend` has refused `UPDATE` and `DELETE` on `audit_events`
with a row trigger since `NXD-064`. `composer_audit_events` — the trail that
records who transitioned, approved and released a product version — had no
such trigger, and neither had `user_audit_events`, the trail that answers
"who granted this role". Both were append-only only because their
repositories happened to have no update method. The users migration said
"append-only" in a comment. `docs/compliance/traceability-and-gmp.md` §1.5
listed all three as "append-only stores". Neither was false about the code;
both were false about the record, which is the thing an inspector asks
about, and which a console session or a repair script does not reach
through the repository.

**The URS pattern, copied rather than shared.** Each plugin owns its schema
(AGENTS.md, plugin boundaries), so `composer_append_only()` and
`users_append_only()` are separate functions in separate migrations, the
same shape as `urs_append_only()`: raise with `ERRCODE 23514`, naming the
table and the operation. Dropped and recreated on every boot, because
`CREATE TRIGGER` has no `IF NOT EXISTS` before PostgreSQL 14 and these
migrations run on every start.

**One step further than the model: `TRUNCATE`.** Row triggers do not fire
for it, so a table protected against `DELETE … WHERE` could still be emptied
in one statement. A `BEFORE TRUNCATE … FOR EACH STATEMENT` trigger closes
that on the three new tables. `urs-composer-backend` is **not** changed in
this record — its trail still accepts `TRUNCATE` — because widening the
reference implementation belongs in its own change with its own proof, not
as a side effect of this one. Stated in §1.5 of the compliance document so
it cannot be read as covered.

**`user_sign_in_events` is included.** The finding named the user audit
trail; the sign-in trail is the other half of attributing an action, has no
update or delete path either, and nothing would be gained by leaving it
editable.

**What is not affected.** `DROP TABLE` in each `down` migration: removing the
schema is administrative, not an edit, and a trigger cannot and should not
stop it. `platform_users` stays editable — the records the trail describes
change; the trail does not. A test pins that distinction. No foreign key
points into either audit table, so no cascade can collide with the triggers.

**Proven on PostgreSQL, not SQLite.** SQLite backs the unit suites and has
no equivalent. `composer-backend/src/db/migrations.postgres.test.ts` gains a
case; `users-backend` gets its first PostgreSQL suite. Both apply the
migration twice, then prove `UPDATE`, `DELETE` and `TRUNCATE` are refused by
the trigger (matching its message, so a failure for any other reason does
not pass) and that inserting still works.

- Affected components:
  `plugins/composer-backend/src/db/migrations.ts`,
  `plugins/composer-backend/src/db/migrations.postgres.test.ts`,
  `plugins/users-backend/src/db/migrations.ts`,
  `plugins/users-backend/src/db/migrations.postgres.test.ts` (new),
  `docs/compliance/traceability-and-gmp.md`.

### NXD-093 — Traceability links are scoped in the database, and the index the audit counted on could not serve it

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 3 — quick win W1 of the re-audit of
  2026-09-30
- Closes: re-audit finding W1 (the whole traceability table read on every
  call).

`ComposerRepository.listTraceabilityLinks()` was `select()` on
`traceability_links`, unfiltered, and six service paths called it and
filtered in memory: the functional-spec trace, requirement coverage, the
release gate, baseline snapshots, the evidence package and product
traceability. Memory and latency grew with the number of links across
**every** product, for questions about one version.

**The signature changes; there is no unscoped variant left.**
`listTraceabilityLinks(entityIds)` returns every link whose source **or**
target is one of the given ids. Each caller passes the ids its own filter
keys on — component ids everywhere, plus functional-spec ids for the
evidence package — and **keeps that filter**. The result is a bounded
superset of what each filter accepted before, so the answer is preserved by
construction rather than by re-deriving six filters. The reasoning is
written at each call site; for coverage and the functional-spec trace it
rests on every accepted link having a component as its target, which the
code checks and the comment names. An empty id list answers no links, not
all of them.

**The audit's premise was wrong, and measuring it was the only way to know.**
The finding said composite indexes on source and target "already exist". They
do: `(source_type, source_id)` and `(target_type, target_id)`. Both lead with
the type, and the lookup does not know the types — a component can be either
end of a link. `EXPLAIN` against PostgreSQL 16 with 300,000 links planned a
**parallel sequential scan** for `source_id = ANY(…) OR target_id = ANY(…)`
with only those indexes. Filtering in SQL alone would have moved the full
read from Node into the database and called it fixed. Two single-column
indexes, `traceability_links_source_id_idx` and `_target_id_idx`, turn the
same query into a `BitmapOr` of two index scans. `create index if not exists`,
so one statement serves both dialects; purely additive.

**Not done.** The in-memory filters stay, redundant for most callers now,
because removing them is a behaviour argument per call site and not this
record's. `whereIn` is not chunked, matching `listTestExecutions` beside it;
a version with more than ~32,000 components would reach PostgreSQL's
parameter limit, which is not a shape this domain has. The remaining N+1
chains in lineage and artifact impact (re-audit W2) are untouched.

- Affected components:
  `plugins/composer-backend/src/repository-interface.ts`,
  `plugins/composer-backend/src/repository.ts`,
  `plugins/composer-backend/src/service.ts`,
  `plugins/composer-backend/src/db/migrations.ts`,
  `plugins/composer-backend/src/db/migrations.postgres.test.ts`,
  `plugins/composer-backend/src/traceabilityLookup.test.ts` (new),
  `plugins/composer-backend/src/evidencePackage.test.ts` (comment).

### NXD-094 — A load that failed stops looking like an empty result

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 4 (frontend) — F1
- Closes: re-audit findings U1 and U2 (failed loads rendered as empty
  states).

Six places caught a failed load and threw the error away — four with
`.catch(() => setLoading(false))`, two with `.catch(() => {})` or by
substituting `[]`. The page then rendered its empty state: "No Data Products
in the catalog yet", "This equipment entity is not in the catalog", "No
approved URS baseline is available — approve one in the URS Composer first".
A 401, a 503 and a genuinely empty catalog were indistinguishable, and two
of the messages told the user to do something that was already done.

**Two were worse than the audit said.** On `URSRequirementSetPage`, a failed
`getApprovalInstance` left `approvalInstance` null, and every branch gated on
`!approvalInstance` then fired: "No approval workflow active" and the
**Create baseline** button, for a set whose baseline was already in
approval. A failed `listBaselines` did the same through "No baselines yet".
The server would refuse a conflicting baseline; the page should not have
offered one. Reading the page to fix the first finding is what found the
second — it was not in the audit.

**The shape of the fix.** `useLoadable(load)` in `plugin-nexora-common`
returns `{ value, loading, error, retry }`, drops a result that arrives after
unmount or after a newer attempt, and takes a `useCallback`-stable loader
rather than a dependency list so `react-hooks/exhaustive-deps` still checks
the call site. `LoadError` renders `role="alert"`, names *what* could not be
loaded, uses `formatJourneyError` (which never echoes a stack or a
credential), and offers **Try again** — except for a permission failure,
where retrying cannot succeed and offering it suggests otherwise. No new
dependency: `react-use`'s `useAsyncRetry` would have been one.

- `QualityPage`, `EquipmentPage`, `ContractExplorerPage`: `useLoadable` +
  `LoadError`. Empty-state defaults are module constants so the memoized
  filters do not recompute on every render.
- `EquipmentDetailPage`: the load is one function returning the whole detail
  bundle, and the error branch sits **before** the not-found branch.
- `URSRequirementSetPage`: `approvalUnknown` is true while the approval
  instance or the baseline list failed to load. The approval section shows
  the error with a retry, and every action gated on "no workflow" is hidden
  until the state is known.
- `ProductDetailPage` / `RequirementsTab`: a failed approved-baseline list
  says so beside the picker, with a retry, instead of "none approved".

**Deliberately left.** `CreateWizard` still swallows a failed capability-name
lookup: the names only label chips in the wizard header, nothing acts on
their absence, and the step that selects capabilities has its own load.
`URSRequirementSetPage` still swallows the capability-name map (falls back to
ids), the validation-context restore and the predecessor lookup — each
degrades a label, none gates an action. The criterion applied throughout:
an empty state is a claim, and a claim someone can act on must not be made
without the data.

**Proof.** Every converted page has a test that fails the load and asserts
the alert *and* the absence of the empty-state wording, retries, and asserts
recovery; each page also keeps a test for the honest empty state. The
`URSRequirementSetPage` suite — the first render test that page has had — was
run against the unfixed page and fails there on three of four cases; the
fourth is the honest empty state, which must pass on both.

- Affected components:
  `plugins/nexora-common/src/loading/` (new: `useLoadable.ts`,
  `LoadError.tsx`, `loading.test.tsx`), `plugins/nexora-common/src/index.ts`,
  `plugins/nexora-quality/src/components/QualityPage.tsx` (+ new test),
  `plugins/nexora-assets/src/components/EquipmentPage.tsx`,
  `plugins/nexora-assets/src/components/EquipmentDetailPage.tsx`,
  `plugins/nexora-assets/src/components/EquipmentPage.test.tsx`,
  `plugins/nexora-contracts/src/components/ContractExplorerPage.tsx`
  (+ new test), `plugins/urs-composer/src/pages/URSRequirementSetPage.tsx`,
  `plugins/urs-composer/src/pages/URSRequirementSetPage.loadFailure.test.tsx`
  (new), `packages/app/src/modules/products/ProductDetailPage.tsx`,
  `packages/app/src/modules/products/tabs/RequirementsTab.tsx`,
  `packages/app/src/modules/products/ProductDetailPage.test.tsx`.

### NXD-095 — The keyboard gets a way in, and the wizard's first step could not be completed without a mouse

- Date: 2026-09-30
- Slice: maturity-audit remediation, wave 4 (frontend) — F2
- Closes: re-audit finding U7, partially (keyboard and screen-reader access
  on the named surfaces; axe in CI is F4's).

The recount at `7fb817b` found 0 `onKeyDown`, 0 `tabIndex` and 1
`aria-live` across the frontend. That alone is not a defect — native
controls need none of them — but it meant nothing had compensated where
native controls were **not** used.

**The finding the audit did not have.** `BusinessCapabilityStep` rendered
each capability as a clickable `Card` with a `Checkbox` marked `readOnly`
inside it. The card's `onClick` was the only way to select; the checkbox
was focusable and inert. Selecting a capability is the wizard's first,
mandatory step, so **a URS could not be started from a keyboard at all.**
The checkbox now changes the selection itself and carries
`Select <capability>` as its name; the label's existing
`stopPropagation` keeps the card from toggling it straight back, which the
test pins by asserting exactly one state change.

**Clickable rows.** `ReleaseCatalogPage`, `DataProductsPage` and
`MarketplacePage` opened an item only through `<tr onClick>`, which is not
focusable and announces nothing. The name cell is now a real link to the
same route; the row click stays as the mouse shortcut, and the link stops
propagation so a click does not navigate twice.

**Icon-only buttons.** Three relied on `title`, which is not a dependable
accessible name: version history on the approval page (now also
`aria-expanded`), and delete requirement / delete criterion in the wizard,
whose names now say *which* requirement or criterion. The AI-suggestion
checkboxes get names too; they were already keyboard-operable, because
Space on a checkbox dispatches a click that bubbles to the card.

**Service status.** The footer's health was the colour of an 8px dot, with
the words in a tooltip on an element nothing could focus. A non-OK state is
now written out (`· down`, `· checking`), and each item is `role="img"` with
its state as the name inside a named region. A first version also made
each item focusable so the tooltip could be reached; `jsx-a11y` rejected
`tabIndex` on a non-interactive element, and it was right — once the state
is visible text, the tooltip carries nothing that needs reaching.

**A guard, because these regress silently.** `frontendAccessibility.test.ts`
scans every frontend `.tsx` for an `IconButton` without `aria-label` and a
`readOnly` `Checkbox`. Run against the pre-change files it reports all four
defects fixed here; against the tree it reports none. A text scan is a
stopgap for an axe run, not a substitute: it knows two rules.

**Not done.** `DataProductsPage`'s in-row *Docs* link and other clickable
cards were not audited one by one; only the surfaces the re-audit named and
the ones found while fixing them.

- Affected components:
  `plugins/urs-composer/src/components/CreateWizard/steps/BusinessCapabilityStep.tsx`
  (+ test), `.../steps/RequirementsStep.tsx`,
  `.../steps/AcceptanceCriteriaStep.tsx`,
  `plugins/urs-composer/src/pages/URSRequirementSetPage.tsx`,
  `packages/app/src/modules/releases/ReleaseCatalogPage.tsx` (+ test),
  `plugins/data-products/src/components/DataProductsPage.tsx`,
  `plugins/marketplace/src/components/MarketplacePage.tsx`,
  `packages/app/src/modules/nav/PlatformFooter.tsx` (+ new test),
  `packages/backend/src/frontendAccessibility.test.ts` (new).
