# Nexora Transformation Status

## Current Phase
Phase 0 — Stabilize and Baseline

## Current Vertical Slice
P0-S1 — Restore a green, reproducible test baseline (**done**).

## Completed
- Strategy and architecture guardrails defined.
- Eight-phase implementation plan defined.
- Existing Backstage extension-first guardrails remain authoritative.
- **P0-S1 — Green baseline restored.** The repository baseline was red on
  arrival: 9 of 188 test suites failed. All nine are fixed and the full
  CI-equivalent gate now passes. See "Baseline findings" below.

## In Progress
Phase 0 audit write-up. The domain/architecture inventory below is complete;
the remaining Phase 0 work is the CI coverage gap recorded under Migration
Debt (P0-S2).

## Next
1. **P0-S2** — Make the PostgreSQL-backed suites run in CI. 62 tests,
   including the GxP invariants, currently skip in every CI run.
2. **P0-S3** — Record the hard-coded Golden Path composition surface as
   explicit migration debt with a per-symbol inventory (input to Phase 3).
3. Propose the smallest Phase 1 vertical slice against the consolidated
   domain model in `packages/platform-common/src/product.ts`.

## Test Status
Verified on 2026-09-16 at the repository baseline:

| Gate | Command | Result |
| --- | --- | --- |
| Guardrails | `yarn guard:platform` | PASS (9 pass, 9 documented warnings, 0 fail) |
| Typecheck | `yarn tsc` | PASS |
| Lint | `yarn lint:all` | PASS |
| Unit tests | `yarn test` | PASS — 185 suites, 1337 tests |

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
- **The GxP invariant suites never run in CI.** 62 tests across six files
  (`urs-composer-backend`: `gxp-invariants`, `runtime-postgres-proof`,
  `wd-seed-persistence`, `p1a-verification`, `repository`;
  `validation-expert-backend`: `validation-context-integration`) skip unless
  PostgreSQL answers on `TEST_DB_HOST:TEST_DB_PORT` (default
  `127.0.0.1:5435`). `.github/workflows/ci.yml` defines no `services:` block,
  so these tests skip in every CI run and the pipeline still reports green.
  The persistence and GxP guarantees they assert are therefore unverified by
  the authoritative pipeline. Scheduled as **P0-S2**.
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
