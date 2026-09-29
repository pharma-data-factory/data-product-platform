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
starts. No parallel tracks. **That rule survives everything below and is the
one thing in this section that has not changed.**

### 3.1 The original three rules, and why two of them are spent

1. **Structural before decorative.** Spent: `DataContract` moved in Slices 1
   and 2.
2. **Dormant code before new code.** Its cheapness argument survives; its real
   argument — "it removes the misleading signal that they are done" — has been
   satisfied for free. `STATUS.md` now records Editions and Federation as
   inert Wave-3 scaffolding, so the signal is gone at the cost of a paragraph.
3. **Highest uncertainty last.** Its justification is dead text. It read "if
   Slice 8 stalls, seven of eight phases are already closed rather than none" —
   and seven of eight are closed *now*, before any remaining slice begins.

### 3.2 Re-founded 2026-09-28: the phase frame retires, the plan does not

This document was organised around closing the eight phases of
`IMPLEMENTATION_PLAN.md`. That axis is exhausted, and keeping it produced a
measurably wrong order.

`STATUS.md` repudiated this plan's phase attribution on 2026-09-26, four days
after it was written: per-namespace scoping is *"deferred, not part of Phase
2"*; GP-7 is *"a component registry, not the hard-coded domain composition
Phase 3 names"*; Editions and Federation *"appear in no phase text at all —
they are Wave 3, post-plan"*. So of the five slices that remained, **exactly
one — Slice 6 — closes a phase**, and the order in §6 placed two Wave-3 slices
that close nothing in front of the last phase gate.

Two consequences were buried by that frame and are now surfaced:

- **Slice 4's only real defect is not a slice.** An artifact manifest declares
  `distribution: [life-sciences]`, and the registry casts it unchecked into
  `DistributionChannel[]` — a value from a different axis, already persisted,
  under an id that does not even match the edition's. That is a validation fix
  of minutes, ranked behind an S-sized loader.
- **Half of Slice 8 needs none of Slice 8's machinery.** Three of the five
  registry lifecycle transitions perform no namespace check at all, and
  `deprecateArtifactVersion` takes no actor. Both are fixable with the
  service-level `memberGroups` check `P7-S2` already added. They sat at
  position nine behind an **L** and a stop condition they have nothing to do
  with.

**What this document keeps:** §2 — the Definition of Done and the stop
conditions. Those are why the plan worked, and they are independent of the
phase frame. Point 2 ("one real path executed once") continues to apply to
every item in §9.

**What it loses:** the phase labels on Slices 4, 5, 7 and 8, and their
inherited position. §9 ranks them against everything else on merit.

See `NXD-073`.

---

## 4. Verified gap inventory

What each phase still owes, with the evidence.

**Corrected 2026-09-28.** The table below is the current state. The evidence
paragraphs that follow it were written 2026-09-22 and several are now
historical; each stale one is marked.

| Phase | Status | Open gaps |
| --- | --- | --- |
| 0 — Stabilize | **Closed** | None. `.github/workflows/ci.yml` runs all four gates. |
| 1 — Core Domain | **Closed** | None. One `Product` model repo-wide. |
| 2 — Registry / Marketplace | **Closed** | None. Per-namespace scoping is deferred scope, not a Phase 2 criterion — see §3.2. |
| 3 — Product Studio / AI | **Closed** | None. GP-7 is inventory debt, not the composition hard-coding Phase 3 names. |
| 4 — Exchange / Contracts | **Closed** | None. Closed by Slices 1 and 2. |
| 5 — Verification / Validation | **Closed** | None. Closed by Slice 3. |
| 6 — Consumer / Analytics | **Closed** | None. |
| 7 — Ecosystem / Scale | **Closed 2026-09-28** | None. Package/source providers closed by Slice 6 (`NXD-076`). Editions and Federation are Wave 3 and belong to no phase. |

**All eight are closed** as of 2026-09-28. What remains is ranked in §9 on merit, not on phase membership.

### Evidence

**P2 — per-namespace scoping.** _[Not a Phase 2 criterion — deferred scope per
§3.2. Two line references below have drifted: `router.ts:433` is now `:486`,
and the gap is wider than described — `submit`, `review` and `deprecate`
resolve no namespace at all.]_ All eight registry permissions are
`BasicPermission`. `packages/backend/src/permission/policy.ts` returns a plain
`AuthorizeResult.ALLOW | DENY` — no conditional decision anywhere in the
repository. `router.ts:433` authorizes `artifactCertifyPermission` before
resolving which namespace the version belongs to. `P7-S2` added a
service-level `memberGroups` membership check, so the plumbing exists; what is
missing is framework-level scoping and list filtering. See
[`NXD-014`](DECISIONS.md).

**P3 — GP-7.** _[Not a Phase 3 criterion — inventory debt per §3.2. The
sub-task "correct the GP-8 row" is done: the table now reads "GP-7 is the only
open row".]_ `RUNTIME_PACKAGE_COMPONENT_NAMES`,
`RUNTIME_PACKAGE_SOURCE_PATHS` and `CATALOG_ONLY_COMPONENT_NAMES` in
`platform-component-library.ts` are still a fixed component registry in Core.
Last open row of `HARDCODED_DOMAIN_INVENTORY.md`.

**P4 — contract identity.** _[Historical — closed by Slice 1.]_
`DataContract.productComponentId` is still the key.
Its own doc comment at `product.ts:192` says "Phase 4 later slices will promote
contracts to a first-class namespace so they can be referenced across
products". Those slices never happened. A contract cannot be referenced by a
stable coordinate from outside its component.

**P4 — provider-neutral exchange.** _[Historical — closed by Slice 2.]_
The Phase 0 audit listed the target fields:
semantics, SLA, classification, access policy, delivery mechanism. The shipped
`DataContract` has `name`, `owner?`, `schemaType`, `schemaRef`, `contractSpec`,
`status`, `version`, `qualityRules`. None of the exchange fields exist.
`grep -E 'deliveryMechanism|accessPolicy|exchangeType'` over `product.ts`
returns nothing.

**P5 — CI evidence chain.** _[Historical — closed by Slice 3; CI now posts to
`POST /baselines/:id/provenance`.]_ `ProductBaseline.snapshot` carries
`releaseCommitSha` and `artifactDigest` (P5-S5), and the service threads them
through. Nothing populates them: the only writers are the request body and a
copy from the version row. `.github/workflows/ci.yml` never calls the Composer.
The chain the phase specifies — CI evidence → ProductBaseline — is a manual
field, not an automated link.

**P7 — Editions.** _[Wave 3, in no phase text. Two corrections: the
`artifact.ts` "read at startup" claim was already fixed in `f054b3c`, though
`catalog/editions.yaml:10` still carries the same lie; and there are **three**
axes using the word, not two — `PlatformEdition`, `COMMERCIAL_EDITIONS` and
`DistributionChannel`, the last of which `ArtifactVersion.distribution` is
already typed against.]_ `catalog/editions.yaml` declares four editions with an
`extends` hierarchy; `PlatformEdition` and `EditionCatalogue` are exported.
Nothing reads the file. `artifact.ts:593` claims editions are "read at
startup"; they are not. Separately, `COMMERCIAL_EDITIONS` in
`commercial-products.ts` uses the same word for a different axis.

**P7 — Federation.** _[Wave 3, in no phase text. Understated: there are also
**zero tests**, and `plugins/artifact-registry-backend/config.d.ts` declares no
`federation` key — so no configuration can be written until the type is
extended.]_ Client, scheduler and `?includeFederated=true` are wired.
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

### Slice 4 — Editions load and gate distribution — S · Wave 3, closes no phase

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

### Slice 5 — Federation runs against a real registry — L · Wave 3, closes no phase

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

### Slice 7 — GP-7 out of Core — M · inventory debt, closes no phase

- `RUNTIME_PACKAGE_COMPONENT_NAMES`, `RUNTIME_PACKAGE_SOURCE_PATHS` and
  `CATALOG_ONLY_COMPONENT_NAMES` become registry-resolved rather than a Core
  constant, following the pattern `P3-S1b` established when the composition
  lists left Core.
- Prove parity before deleting, per the strategy's no-big-bang rule.

**Executed path:** add a component via a manifest, without touching Core, and
see it appear in the library.

---

### Slice 8 — Per-namespace permission scoping — L · deferred scope, closes no phase

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
Slice 6  Package providers (M)      ══ PHASE 7 CLOSED — the eighth and last
```

**Re-founded 2026-09-28 (§3.2).** Slices 4, 5, 7 and 8 were here, in that
order, each annotated with a phase it does not in fact close. Those
annotations were wrong — Phases 2 and 3 were already closed, and Editions and
Federation belong to no phase — and the order they implied put two Wave-3
slices in front of the last phase gate. They have been moved to §9 and ranked
on merit. Two things that were buried inside them come first instead, because
both are defects rather than features: the wrong-axis `distribution` cast, and
the three registry transitions that resolve no namespace at all.

Only Slice 1 → Slice 2 was a hard dependency. Within §9 the dependencies are
stated per item; the one-at-a-time rule from §3 still holds.

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

---

## 9. After the phases — the backlog, ranked on merit

Added 2026-09-28 with the re-founding in §3.2. Everything below competes on
merit; nothing here holds a position it inherited from the phase frame. Sizes
use §5's vocabulary: **S** one or two files, **M** a plugin, **L** a schema
migration or new framework ground.

§2's Definition of Done applies unchanged, with one clarification forced by
these items: **batch by executed path, not by category.** Point 2 asks for
*one* real path per unit of work, so a batch of unrelated small fixes either
violates it or staples three unconnected `curl` outputs into one commit body.
Items with no executable path — a rename, a config default, a corrected
paragraph — are labelled as record or configuration changes and exempted
explicitly, rather than smuggled under point 2.

### 9.1 Before anything else

| # | Item | Size |
| --- | --- | --- |
| 0.1 | **Make the test gate's coverage visible.** `plugins/urs-composer` runs its own runner, so `backstage-cli repo test` never reaches it and every "four gates green" claim is narrower than it reads. `TEST_GATE_COVERAGE` in `verify-platform-guardrails.mjs` now compares each workspace's `test` script against the standard one and requires a named reason for any deviation. **Done 2026-09-28.** | S |
| 0.2 | **Correct the record.** This section, §3.2, §4's table, §6, and the two `STATUS.md` paragraphs overtaken by `9d80d16`. **Done 2026-09-28** (`NXD-073`). Record change — exempt from DoD point 2. | S |

Deliberately *not* in 0.2: `catalog/editions.yaml:10`, which still claims
"Core reads this file at startup". That line belongs to whichever slice decides
whether a loader is ever coming; correcting it now means writing an interim
statement that is immediately replaced.

### 9.2 Two defects buried inside slices

Both are executable today and need no decision.

| # | Item | Size |
| --- | --- | --- |
| 1.1 | **Done 2026-09-28** (`NXD-075`). **A value from the wrong axis, already persisted.** `gxp-data-product-policy.yaml` declares `distribution: [life-sciences]`; the registry service casts it unchecked into `DistributionChannel[]`, whose members are `INTERNAL`/`TEMPLATE_EDITION`/`PLATFORM_EDITION`/`SAAS`. The value belongs to the `PlatformEdition` axis, where it is spelled `nexora-life-sciences`. Reject it or map it; fail loudly. | S |
| 1.2 | **Done 2026-09-28** (`NXD-075`) — and it was five, not three, once `actor` stopped being optional. **Three registry transitions check nothing.** `submit`, `review` and `deprecate` run through the shared transition helper with no actor and no namespace resolution; `deprecateArtifactVersion` takes no actor at all. This needs no conditional permissions — the service-level `memberGroups` check from `P7-S2` already exists. A mutating registry operation that does not know who invoked it is a hole in the audit trail, not a framework gap. | M |

### 9.3 The eighth phase

| # | Item | Size |
| --- | --- | --- |
| 2.1 | **Done 2026-09-28** (`NXD-076`). **Slice 6 — package and source providers. Closed Phase 7, the last one.** HTTP(S) is the second provider; OCI was declined because it would have triggered the unapproved-dependency stop condition. | M |

Two constraints, both learned from this plan's own history:

- **Decide the second provider before starting.** §5 already says an interface
  with one implementation is not an abstraction. Expect a possible
  `DEPENDENCY_CHANGE_REQUIRED` — an OCI provider almost certainly triggers
  `AGENTS.md`'s unapproved-dependency stop condition, and that signal is worth
  having early rather than late.
- **Explicit non-goal: `RUNTIME_PACKAGE_SOURCE_PATHS` does not migrate with
  it.** Checked 2026-09-28: `sourcePath` is read at exactly two sites, both in
  `PlatformComponentDetailPage.tsx`, and both only *display* it — nothing opens
  the path. Slices 6 and 7 therefore do not overlap. Without stating this,
  Slice 6 would build an abstraction for a consumer that never arrives, which
  is the Editions failure mode repeated.

### 9.4 The ranked backlog

| Rank | Item | Size | Blocked by |
| --- | --- | --- | --- |
| 1 | **Done 2026-09-28** (`NXD-079`); walked live 2026-09-29 (`NXD-080`), which found the seven templates unscaffoldable and fixed them. DoD point 2 is met up to the credential: no repository was created, because this environment has no GitHub App token. **Remove the hard-coded GitHub org.** 29 source sites (7 templates × 4, plus `ComposePage.tsx`) and ~16 test assertions. The reference implementation is already in the repository: `node-service` and `mqtt-connector` use `${{ parameters.repoUrl }}`, and the 7 offending templates already *collect* the picker value and discard it. First because it clears the same seven files rank 5 must edit. | M | one decision |
| 2 | **Done 2026-09-28** (`NXD-077`). **Evidence-package aggregator**, read-only over the ~15 endpoints that already return every piece. `validation-expert-backend`'s `buildOverview()` is the reusable assembly shape, including its pattern of merging static and runtime sources. | M | nothing |
| 3 | **Hybrid GMP**, if wanted at all | M | one decision |
| 4 | **Product-side change control.** The URS implementation is complete and largely liftable; `ChangeRequestStatus` and `SignatureTargetType.CHANGE_REQUEST` are already in `platform-common`. | L | rank 3, and the signature decision below |
| 5 | **URS→Product steps 3 → 4 → 5.** Step 2 landed in `9d80d16`. | M each | 3: an ordering decision · 4: step 3 · 5: rank 4 |
| 6 | **Slice 7 — GP-7 out of Core.** Last open row of `HARDCODED_DOMAIN_INVENTORY.md`. | M | nothing |
| 7 | ~~Slice 4 remainder~~ · ~~Slice 5 — Federation~~ | — | **Re-ranked 2026-09-28 — moved to §9.6** |
| 8 | **Return `urs-composer` to the gate**, with its 9 pre-existing `CreateWizard` failures | ? | unknown cost |
| 9 | **Slice 8 spike** — conditional permissions | L | stop condition |

Out of scope here, as §7 already implies: the AI Test Coordinator, the AI GMP
Impact Agent, Kubernetes and platform observability, Marketplace
install/update. `TARGET_CONFORMANCE_AUDIT.md` §11 excludes them from MVP1
explicitly. They need their own plans, not ranks in this one.

### 9.4a The execution order across §9.4 and §9.6

Added 2026-09-29. §9.4 ranks the backlog and §9.6 orders the topology track,
but nothing said how the two interleave, or where the work that belongs to
neither — untested modules, stale records, small defects — sits against them.
Agreed with the product owner and executed in this order:

| Wave | Contents | Status |
| --- | --- | --- |
| 0 | Rank 1's remaining live publish, and the push | **Blocked on a GitHub credential this environment does not hold** |
| 1 | The three modules that shipped with no test: edition resolver, installation identity, evidence-package aggregator | **Done 2026-09-29** — `NXD-081`, `NXD-082`, `NXD-083`. One real defect |
| 2 | Correct the record: this section, §9.5, `STATUS.md` §Current Phase / §Known Risks / §Next, `TARGET_CONFORMANCE_AUDIT.md` §1/§7/§9/§10 | **Done 2026-09-29.** Record change — exempt from DoD point 2. The four "missing" NXD records turned out to exist (`NXD-044`…`NXD-047`); the entry claiming they were missing was itself the stale thing |
| 3 | Three small visible defects: the unrouted `catalog-graph`, the advertised-but-unwired lineage DAG, the two live product names. Three commits, not one | Open |
| 4 | **T3** — consumer credentials and the read routes | Open |
| 5 | **Rank 5** — URS→Product steps 3, 4, 5 | Open, after the ordering decision in §9.5 |
| 6 | **Rank 6** — GP-7 out of Core | Open |
| 7 | **Rank 3** — Hybrid GMP: reconcile the two idioms, then decide, then build | Open |
| 8 | **Rank 4** — product-side change control | Open, after wave 7 |
| 9 | **T4 → T5 → T6** — federation, the consumer registry, the install verb | Open |
| 10 | Debt without a date: `supertest`, the durable scheduler, the cross-plugin import, the four string-matching deployment guards, `data-product-sdk`, rank 8, rank 9, the five open decisions in `TARGET_CONFORMANCE_AUDIT.md` §12 | Open |

**Why proving came before building.** On 2026-09-28 `NXD-079` shipped with four
green gates, 2129 passing tests and a careful record, and left seven of nine
templates unscaffoldable — found the next morning by the live run it had
deferred (`NXD-080`). Three modules were in exactly that state, and one of them
was broken: the evidence-package route threw for every product version on any
driver that does not return a `Date` for a timestamp column (`NXD-083`). That
is §8's failure mode 1, measured twice in two days, which is why wave 1 outranks
every feature below it.

### 9.5 The decisions that gate ranks

**Does the product side need an electronic signature?** Recorded here because
it was nearly planned as a prerequisite slice, and should not be:

- `docs/compliance/traceability-and-gmp.md` §1.2 scopes electronic signatures
  to `urs-composer-backend`. Its gap list G-1…G-7 does **not** include
  "product-side approvals are unsigned". §4 rule 2 — nobody approves their own
  work — already holds, through permission plus segregation of duties, and
  answers 403 since `NXD-072`.
- "Lift the signature service into `platform-common`" is not a lift. It is 465
  lines importing seven URS domain types and a repository handle, and
  `signature_credentials` lives in the URS plugin's own database.
  `AGENTS.md` §PLUGIN BOUNDARIES forbids the cross-plugin reach, and
  `NXD-066` already met this exact wall and chose duplication.

So it is **a decision to record, not a slice to land** — and it must be taken
before rank 2 ships. An evidence package that prints "URS baseline: signed by
X, QA role, second factor, hash-bound" beside "Product baseline: approved by Y"
invites precisely the question one does not want asked in an audit.

> **Taken 2026-09-28, with rank 2** — [`NXD-077`](DECISIONS.md), section "The
> signature question, answered". The asymmetry is **held, not closed**, and
> therefore **stated**: the package's `limits` array says in its own words that
> a URS baseline carries a Part 11 signature bound to a content hash while a
> product approval carries the actor, the timestamp and a segregation-of-duties
> refusal, and that the two are not equivalent. `NXD-083` makes that line a
> failing test, so removing it is a decision rather than an edit. Nothing here
> is outstanding.

| Decision | Gates |
| --- | --- |
| ~~Is the GitHub org user-chosen or platform-configured?~~ **Answered: platform-configured** (`NXD-079`). `nexora:scm:resolve-repo` reads `nexora.scm.*` inside the task and fails when unconfigured; all nine publishing templates converted, including the two that had let the user choose. | ~~rank 1~~ |
| Hybrid GMP: does it count as GxP-relevant, and which approval workflow does it select? **The two incompatible idioms must be reconciled first** — allow-list (`=== DIRECT \|\| === INDIRECT`) against deny-list (`!== 'NONE'`) — or the fourth level behaves differently in the release gate than in the policy evaluator. Three parallel enum declarations, 11 edit sites. | rank 3 |
| Step 3 ordering: read the URS baseline at `fetch-base` time, or make a second commit after `publish:github`? `nexora:product:create` runs **last**, so at repo-content time no product version exists yet. | rank 5 |
| ~~Which second content provider?~~ **Answered: HTTP(S)** (`NXD-076`). OCI was declined because it would have triggered `AGENTS.md`'s unapproved-dependency stop condition; `fetch` is already used across the repository. OCI remains available as a third. | ~~§9.3~~ |

**One pairing to avoid.** `gxpRelevance` is a hashed field in
`content-hash.ts`, so a fourth level is a migration question about
already-signed content and needs the explicit invariant *no signed row changes
level*. Never schedule the signature decision and Hybrid GMP adjacently: that
is two simultaneous changes to the same invariant.

### 9.6 The topology track

Added 2026-09-28 with [`NXD-074`](DECISIONS.md). Slices 4 and 5 left §9.4 for
this section: they are not loose backlog items but consecutive steps of one
capability — an installation that can consume from upstream and publish
downstream. The target picture is `TARGET_OPERATING_MODEL.md` §6.

Strictly ordered; each step is unusable without the one before it.

| # | Step | Size | Why it cannot move earlier |
| --- | --- | --- | --- |
| T1 | **Slice 6 — portable artifact content** (already §9.3) | M | A consumer cannot obtain what it does not have. One added constraint from the target picture: the provider seam must yield a **portable** coordinate. `sourceRef: "template:default/x"` and `documentation: "/create/..."` resolve against whoever reads them, so federating them today ships a 404. |
| T2 | **Done 2026-09-28** (`NXD-078`). **Installation identity + the Editions loader** | M | Two instances collide on the platform product `nexora-core`, on `organizationId: internal`, on catalog namespace `default`, and on artifact coordinates — a local fork silently shadows an upstream version. "Which edition am I" is part of the same answer, which is why the Editions loader lands here rather than at rank 7. |
| T3 | **Consumer credentials and the read routes** | S | One `externalAccess` array entry per consuming installation — no code. The code is widening the registry's read routes from `{ allow: ['user'] }` to also accept a service principal, reusing `authorizeReadOrService`. Until this lands every federated read is a 401, so T4 cannot be tested at all. |
| T4 | **Federation that carries content and origin** | L | Today: six scalar fields per artifact, the manifest fetched and discarded, nothing persisted, no screen requesting it, no config key in the schema, zero tests. Needs all of that plus origin attribution, so an upstream artifact is distinguishable from a local one. |
| T5 | **The consumer registry and its view** | M | An append-only store owned by `artifact-registry-backend` recording which installation read what and when — the first audited *read* in the repository. The topology view reuses `SVGGraph`/`GraphNode`/`GraphEdge` from `LineageDAGView.tsx`. |
| T6 | **A verb for taking an artifact up** | M | There is no install action anywhere, and its absence is a tested invariant. Needs T1's portable coordinate to have anything to act on. |

**Not in this track, by decision:** deployment and runtime operation. GitHub
deploys; Nexora governs and records (`NXD-074`,
`TARGET_OPERATING_MODEL.md` §6.3). The audit's "Deployment — MISSING" stays
closed rather than worked off.

**Relation to §9.4.** T1 is already ranked there and closes Phase 7; the rest is
new work that did not exist as a plan. Whether the topology track runs before,
after or interleaved with the §9.4 backlog is a product decision — it is stated
here as a coherent sequence, not as a claim on the next slot.

Two small defects found while scoping this, both unranked and both cheap:

- `@backstage/plugin-catalog-graph` is a declared dependency that is never
  registered in `createApp`, so the `/catalog-graph?rootEntityRefs=…` links the
  code already builds point at an unrouted path.
- `GET /versions/:id/lineage/dag` has no frontend consumer; the richer endpoint
  is advertised in placeholder text on the page that would render it.
