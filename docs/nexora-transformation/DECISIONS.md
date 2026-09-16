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
