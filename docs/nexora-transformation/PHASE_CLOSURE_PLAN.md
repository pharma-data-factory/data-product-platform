# Phase Closure Plan

How the remaining gaps in `IMPLEMENTATION_PLAN.md` get closed, in what order,
and what counts as closed.

Written 2026-09-22 against commit `6ff129c`. Every gap below was verified in
code, not read out of `STATUS.md` — which over-reported several of them.

---

## 1. Why this plan exists

`STATUS.md` declared all eight phases' exit criteria met. A code audit on
2026-09-22 found that four phases have substantive gaps, and that two Phase 7
capabilities exist as code that has never executed.

The root cause is a definition problem, not a capability problem. On
2026-09-21 roughly thirty commits landed in under three hours. The pattern was
consistent: define the types, write the client, wire the route, mark it done.
Steps 7–10 of the working method (compile, lint, test, CI-equivalent) were not
run, and the branch sat red for a day. Federation and Editions were marked
complete without ever being configured.

So this plan fixes the definition first and the gaps second.

---

## 2. Definition of closed

A phase is closed when every gap listed against it in §4 is closed. A gap is
closed when its slice meets this Definition of Done — all four points, no
exceptions:

1. **Four gates green.** `yarn guard:platform`, `yarn tsc`, `yarn lint:all`,
   `CI=true yarn test`. Run locally before committing, not discovered in CI.
2. **One real path executed once.** Not a unit test — the actual path, against
   the running application: a `curl` against the route, or a click through the
   UI. The command and its output go in the commit body. A slice whose code has
   never run is not done.
3. **`STATUS.md` and `DECISIONS.md` updated in the same commit** as the code.
   Not afterwards, not in a follow-up. An architecture decision that exists
   only in a commit message is not recorded.
4. **Pushed, CI green.** The branch is never left red overnight.

Point 2 is the one that is new, and it is the point of this plan. It is what
separates "wired" from "works", and it is the only DoD item that would have
caught Federation and Editions.

### Stop conditions

Beyond the standing stop conditions in `AGENTS.md`, stop and report if a slice
requires:

- a second Product or Artifact domain model;
- a permission decision the Backstage framework cannot express;
- a dependency not already in `yarn.lock` (report `DEPENDENCY_CHANGE_REQUIRED`);
- deleting a guard test to make a gate pass.

That last one is specific: on 2026-09-22 four deployment guard tests failed,
and two of them were catching real regressions, not stale expectations. A
failing guard test is a question, not an obstacle.

---

## 3. Sequencing principle

Strictly sequential. One slice at a time, each landing green before the next
starts. No parallel tracks.

The order is driven by three rules:

1. **Structural before decorative.** The `DataContract` model is load-bearing
   for exchange definitions, subscriptions and impact analysis. It moves first,
   in one designed migration, because a half-migrated contract model would
   force every later slice to handle both shapes.
2. **Dormant code before new code.** Editions and Federation already exist and
   do nothing. Making them work is cheaper than building anything new, and it
   removes the misleading signal that they are done.
3. **Highest uncertainty last, with a stop condition.** Per-namespace
   permission scoping needs Backstage machinery this repository has never used.
   It goes last so that if it stalls, seven of eight phases are already closed
   rather than none.

---

## 4. Verified gap inventory

What each phase still owes, with the evidence.

| Phase | Status | Open gaps |
| --- | --- | --- |
| 0 — Stabilize | **Closed** | None. `.github/workflows/ci.yml` runs all four gates. |
| 1 — Core Domain | **Closed** | None. One `Product` model repo-wide. |
| 2 — Registry / Marketplace | **Open** | Per-namespace permission scoping |
| 3 — Product Studio / AI | **Open** | GP-7 |
| 4 — Exchange / Contracts | **Open** | Contract identity; provider-neutral exchange |
| 5 — Verification / Validation | **Open** | CI evidence → ProductBaseline not automated |
| 6 — Consumer / Analytics | **Closed** | None. |
| 7 — Ecosystem / Scale | **Open** | Editions; Federation; package/source providers |

### Evidence

**P2 — per-namespace scoping.** All eight registry permissions are
`BasicPermission`. `packages/backend/src/permission/policy.ts` returns a plain
`AuthorizeResult.ALLOW | DENY` — no conditional decision anywhere in the
repository. `router.ts:433` authorizes `artifactCertifyPermission` before
resolving which namespace the version belongs to. `P7-S2` added a
service-level `memberGroups` membership check, so the plumbing exists; what is
missing is framework-level scoping and list filtering. See
[`NXD-014`](DECISIONS.md).

**P3 — GP-7.** `RUNTIME_PACKAGE_COMPONENT_NAMES`,
`RUNTIME_PACKAGE_SOURCE_PATHS` and `CATALOG_ONLY_COMPONENT_NAMES` in
`platform-component-library.ts` are still a fixed component registry in Core.
Last open row of `HARDCODED_DOMAIN_INVENTORY.md`.

**P4 — contract identity.** `DataContract.productComponentId` is still the key.
Its own doc comment at `product.ts:192` says "Phase 4 later slices will promote
contracts to a first-class namespace so they can be referenced across
products". Those slices never happened. A contract cannot be referenced by a
stable coordinate from outside its component.

**P4 — provider-neutral exchange.** The Phase 0 audit listed the target fields:
semantics, SLA, classification, access policy, delivery mechanism. The shipped
`DataContract` has `name`, `owner?`, `schemaType`, `schemaRef`, `contractSpec`,
`status`, `version`, `qualityRules`. None of the exchange fields exist.
`grep -E 'deliveryMechanism|accessPolicy|exchangeType'` over `product.ts`
returns nothing.

**P5 — CI evidence chain.** `ProductBaseline.snapshot` carries
`releaseCommitSha` and `artifactDigest` (P5-S5), and the service threads them
through. Nothing populates them: the only writers are the request body and a
copy from the version row. `.github/workflows/ci.yml` never calls the Composer.
The chain the phase specifies — CI evidence → ProductBaseline — is a manual
field, not an automated link.

**P7 — Editions.** `catalog/editions.yaml` declares four editions with an
`extends` hierarchy; `PlatformEdition` and `EditionCatalogue` are exported.
Nothing reads the file. `artifact.ts:593` claims editions are "read at
startup"; they are not. Separately, `COMMERCIAL_EDITIONS` in
`commercial-products.ts` uses the same word for a different axis.

**P7 — Federation.** Client, scheduler and `?includeFederated=true` are wired.
`grep federation app-config*.yaml` returns nothing. Never executed against a
remote.

**P7 — package/source providers.** Artifact content resolves from the
filesystem only (`loadManifestsFromDisk`, `readFile`). No abstraction over
where artifact content lives. Phase 7 names "multiple source/package
providers".

---

## 5. The slices

Nine slices. Sizes are relative, not hour estimates: **S** is a focused change
in one or two files, **M** spans a plugin, **L** carries a schema migration or
new framework ground.

### Slice 0 — Make the record trustworthy — S

Not a feature. The plan cannot start from an inaccurate decision log.

- Backfill `DECISIONS.md` from `NXD-043` onward for Wave 1 (`P-EXT-S1..S5`) and
  the remediation series. The decisions worth recording, because each one
  constrains later work: `5-R1` chose fail-open policy resolution (an
  unreachable resolver does not block a release); `7-R5` made
  `PLATFORM_PRODUCT` a product type on the normal lifecycle; `A-3` chose an
  in-process interval over a durable job.
- Decide the product name. `build-image` tags `pharma-data-factory:mvp-1.0`,
  `docker-compose.yml` tags `nexora:latest`. Record the decision, align both,
  tighten `brandSeparation.test.ts` back to a single name.
- Correct the GP-8 row in `HARDCODED_DOMAIN_INVENTORY.md`, which still shows it
  open.

**Done when:** `DECISIONS.md` has an entry for every architecture decision
since `NXD-042`; one image name repo-wide; the inventory shows GP-7 as the only
open row.

---

### Slice 1 — DataContract becomes first-class — L · closes half of Phase 4

The structural slice. One designed migration, as [`NXD-010`](DECISIONS.md)
requires — not incremental, because a half-migrated contract model forces every
later slice to handle both shapes.

- Give `DataContract` its own coordinate (`namespace/name@version`) independent
  of `productComponentId`, which becomes a relation rather than the key.
- Migrate existing rows. Pre-Phase-4 rows carry `null` names; the migration has
  to derive or reject them, and it fails loudly rather than guessing — the
  precedent is [`NXD-009`](DECISIONS.md).
- Update the readers: `ProductDependency.contractId`,
  `ContractSubscription.contractId`, the impact analysis in
  `getContractChangeImpact`, and the release gate's
  `output-contracts-declared` check.

**Risk:** the largest blast radius in the plan. Contracts are read by the
release gate, subscriptions, impact analysis and the schema-snapshot path.
**Mitigation:** the migration and the reader updates land in one commit, so
there is no intermediate state where half the readers use the old key.

**Executed path:** create a contract under product A, reference it by
coordinate from product B, `GET` it back by coordinate.

---

### Slice 2 — Provider-neutral exchange definitions — M · closes Phase 4

Sits directly on Slice 1's promoted contract.

- Add the exchange fields the Phase 0 audit named: delivery mechanism, access
  policy, classification, SLA. Semantics is explicitly **out of scope** (§7).
- Delivery mechanism is an open vocabulary, not an enum of today's three
  transports — the strategy requires provider neutrality, so a new mechanism
  must not need a Core change.
- The release gate learns to check that a released contract declares one.

**Executed path:** declare a contract with a delivery mechanism and access
policy, run the release gate, see it pass; remove the mechanism, see it block.

---

### Slice 3 — CI evidence reaches the baseline — M · closes Phase 5

Small surface, high compliance value, no structural dependency.

- A CI step posts the commit SHA and artifact digest to the Composer when a
  release build succeeds, so `releaseCommitSha` and `artifactDigest` are
  written by the system that knows them rather than by hand.
- Authentication uses the existing service-to-service mechanism. No new
  credential type.
- The release gate rejects a baseline whose provenance is absent when the
  product declares a policy requiring it.

**Risk:** this is the first time CI writes back into the platform. **Mitigation:**
write-only, one endpoint, and a failure in the step must not fail the build —
it raises a blocker at the gate instead, where a human sees it.

**Executed path:** run the release build, then read the baseline back and see
the SHA that CI produced.

---

### Slice 4 — Editions load and gate distribution — S · Phase 7

The cheapest dormant-code kill, and it forces the naming collision open.

- Load `catalog/editions.yaml` at startup into `EditionCatalogue`, resolving
  `extends`. A malformed file fails loudly — it must not degrade to "no
  editions", which would silently ship everything everywhere.
- An artifact manifest may declare its edition; the registry filters by the
  configured edition.
- Resolve `PlatformEdition` versus `COMMERCIAL_EDITIONS`: either two axes with
  two names, or one model. Record it.

**Executed path:** `gxp-data-product-policy@1.0.0` is visible under
`nexora-life-sciences` and absent under `nexora-core` — which is what its own
manifest already claims and nothing currently enforces.

---

### Slice 5 — Federation runs against a real registry — M · Phase 7

- Configure `artifactRegistry.federation` and point it at a second registry.
  A second local instance is sufficient and is the honest test: the client's
  `Promise.allSettled` fan-out, the 15s timeout and the unreachable-peer path
  have never executed.
- Exercise the failure modes deliberately: one peer down, one peer slow, one
  peer returning a namespace outside its whitelist.
- Promote the `A-3` scheduler off `setInterval` onto a durable job, or record
  the decision to keep it in-process with its limits stated.

**Executed path:** two registries running, `GET /artifacts?includeFederated=true`
returning merged results with local coordinates winning; then kill the peer and
see local-only results rather than an error.

---

### Slice 6 — Package and source providers — M · closes Phase 7

- Abstract artifact content resolution behind a provider interface. The
  filesystem becomes one implementation rather than the only path.
- Add one second provider — whichever is genuinely needed — so the abstraction
  is proven by use rather than by intent. An interface with one implementation
  is not an abstraction.

**Executed path:** register an artifact whose content comes from the second
provider and read it back through the same API as a filesystem artifact.

---

### Slice 7 — GP-7 out of Core — M · closes Phase 3

- `RUNTIME_PACKAGE_COMPONENT_NAMES`, `RUNTIME_PACKAGE_SOURCE_PATHS` and
  `CATALOG_ONLY_COMPONENT_NAMES` become registry-resolved rather than a Core
  constant, following the pattern `P3-S1b` established when the composition
  lists left Core.
- Prove parity before deleting, per the strategy's no-big-bang rule.

**Executed path:** add a component via a manifest, without touching Core, and
see it appear in the library.

---

### Slice 8 — Per-namespace permission scoping — L · closes Phase 2

Last, and the only slice that needs Backstage ground the repository has never
used. Begin with a **timeboxed spike** before committing to an approach.

- The spike answers one question: can `resourceRef`-aware authorization reach
  the eight registry permissions without conditional decisions? The
  `allowScaffolderTemplateIfReleased` precedent is `resourceRef`-aware but
  cannot filter a list, so the spike must determine whether list filtering is
  actually required or whether per-operation scoping is enough.
- If conditional permissions are required, that is new machinery: convert the
  permissions to `ResourcePermission`, add permission rules, and resolve the
  namespace before authorizing rather than after.

**Stop condition:** if closing this requires modifying the Backstage Permission
Framework rather than extending it, stop and report
`BACKSTAGE_CORE_PROTECTION_BLOCKED` with a proposed extension-point solution.
Phase 2 then stays open with a documented reason, which is an honest outcome —
seven of eight phases are closed by this point.

**Executed path:** a DATA_PRODUCT_OWNER of namespace A attempts to certify in
namespace B and is refused; the same actor certifies in namespace A and
succeeds.

---

## 6. Order and dependencies

```
Slice 0  Record trustworthy         ── prerequisite for everything
   │
Slice 1  Contract identity (L)      ── blocks Slice 2
   │
Slice 2  Exchange definitions (M)   ══ PHASE 4 CLOSED
   │
Slice 3  CI evidence (M)            ══ PHASE 5 CLOSED
   │
Slice 4  Editions loader (S)
   │
Slice 5  Federation operational (M)
   │
Slice 6  Package providers (M)      ══ PHASE 7 CLOSED
   │
Slice 7  GP-7 out of Core (M)       ══ PHASE 3 CLOSED
   │
Slice 8  Namespace scoping (L)      ══ PHASE 2 CLOSED  (stop condition applies)
```

Only Slice 1 → Slice 2 is a hard dependency. The rest is a priority order, so
a slice can be re-prioritised without breaking the ones after it — but only one
runs at a time.

---

## 7. Explicitly out of scope

Named here so their absence is a decision rather than an oversight. Both are
called first-class in `NEXORA_STRATEGY.md` but appear nowhere in
`IMPLEMENTATION_PLAN.md`, and this plan closes the plan's phases.

- **Semantics layer.** The strategy names Semantics alongside Contracts and
  Lineage. There is no glossary, ontology or semantic model in the repository;
  `nexora-industrial-vocab` is annotations, not semantics. Closing this is real
  domain modelling and deserves its own plan.
- **Events and streams as exchange types.** Only request/response contracts
  exist. Slice 2's delivery mechanism is deliberately an open vocabulary so
  that adding these later needs no Core change.

Both should be scoped once the eight phases are closed.

---

## 8. What would make this plan fail

Stated plainly, because a plan that does not name its own failure mode is not
robust.

1. **DoD point 2 gets skipped under time pressure.** It is the slowest part of
   each slice and the easiest to drop, and dropping it reproduces exactly the
   state this plan exists to fix. If a slice genuinely cannot be executed
   end-to-end, that is a finding to report, not a step to omit.
2. **Slice 1 gets done incrementally.** A half-migrated contract model would
   tax every subsequent slice. It lands whole or not at all.
3. **A guard test gets "fixed" by relaxing it.** Two of the four that failed on
   2026-09-22 were catching real regressions. Treat a red guard as a question.
4. **Slices land faster than `DECISIONS.md` grows.** That is the 2026-09-21
   failure in miniature: thirty commits, two decision records.
