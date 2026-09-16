# Nexora Transformation Status

## Current Phase
Phase 0 — Stabilize and Baseline

## Current Vertical Slice
P0-S2 — Make the infrastructure-dependent suites run in CI (**done**).

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

## In Progress
Nothing in flight. Phase 0's audit and stabilisation objectives are met.

## Next
1. **P0-S3** — Inventory the hard-coded Golden Path composition surface
   per symbol, as the input to Phase 3.
2. Propose the smallest Phase 1 vertical slice against the consolidated
   domain model in `packages/platform-common/src/product.ts`. The strongest
   candidate is the `DataContract` identity defect recorded below: it is a
   foundational versioning/identity problem, which is explicitly Phase 1
   scope, and Phase 4 cannot start until it is resolved.

## Test Status
Verified on 2026-09-16, running the gate the way CI runs it (`CI=true`,
PostgreSQL up, Python toolchain installed):

| Gate | Command | Result |
| --- | --- | --- |
| Guardrails | `yarn guard:platform` | PASS (9 pass, 9 documented warnings, 0 fail) |
| Typecheck | `yarn tsc` | PASS |
| Lint | `yarn lint:all` | PASS |
| Unit tests | `yarn test` | PASS — 188 suites, 1399 tests, **0 skipped** |

Without the optional infrastructure the same command reports 185 suites /
1337 tests with 62 skipped, and still exits 0 — that is the intended
developer-machine behaviour under `NXD-005`. To run everything locally:

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
- Legacy Marketplace is a static, hard-coded TypeScript array
  (`plugins/marketplace/src/data.ts`), not a registry.
- Composer/Core contains domain-specific Golden Path logic (OEE, Machine
  State) inside `packages/platform-common`.
- URS/Validation lifecycle integration is incomplete.
- Formal Validation approval and SoD require consolidation.
- Data Exchange, Lineage and Analytics concepts are not yet unified.
- The GxP invariant suites do not execute in CI (see Migration Debt).

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
- Legacy Marketplace data must stay until registry parity exists (Phase 2).
- `packages/data-product-sdk` has no TypeScript sources; it is a Python
  package inside a Yarn workspace, which is why a missing interpreter could
  turn into a hard test failure.

## Blocked Decisions
None. No stop condition reached.

## Last Commit
See `git log` on `ms/composer-ai-spec-and-ci-quality-gate`. P0-S1 landed as
"fix(test): restore a green baseline and stop the jest resolver collision".
