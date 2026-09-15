# E2E platform consolidation

Owner: Platform Team  
Last reviewed: 2026-09-15  
Audience: INTERNAL ENGINEERING / PRODUCT  
Version: 0.1.0 (proposal)

A proposal, not a description of the running system. It argues for one build
entry point instead of two, and for a single product record that carries a
data product from requirement to release.

Related: [Status model](status-model.md) ·
[Composition Builder](platform-components/composer.md) ·
[Future composition generation](platform-components/future-composer.md) ·
[Identity and RBAC](identity-and-rbac.md)

## Findings

Four facts from the code. They restate the problem more precisely than
"the Composer is too complex".

### 1. The Composer is a dead end for all but one selection

`officialGoldenPathForSelection`
(`packages/platform-common/src/composer.ts:307`) returns a Golden Path only
when the selection is **exactly** the OEE component set. 21 platform
components across 5 categories, freely combinable by checkbox — and exactly
one combination produces a product. Every other combination ends in a YAML
export. This matches what [Future composition
generation](platform-components/future-composer.md) already states: generic
generation from arbitrary selections is PLANNED, not implemented.

The Composer is not too complex. It is **complex without a payoff**.

### 2. "Composer" names two different things

| | Frontend `/compose` | `plugins/composer-backend` |
| --- | --- | --- |
| Builds | `GoldenPathComposition` manifest | `Product → ProductVersion → Baseline` |
| File | `packages/app/src/modules/composer/ComposePage.tsx` (1116 lines) | `plugins/composer-backend/src/service.ts` |
| Carries the release gate | no | yes |
| Has a UI | yes | **no** |

The frontend consumes only the AI endpoints of the backend
(`packages/app/src/modules/composer/composerApi.ts`). The whole product
lifecycle — components, contracts, traceability, baselines, release gate —
has no user interface at all.

### 3. The release gate exists and does not know about validation

`checkReleaseGate` (`plugins/composer-backend/src/service.ts:326`) checks
seven blockers:

- `INVALID_STATUS`
- `NO_COMPONENTS`
- `INCOMPLETE_TRACEABILITY`
- `NO_APPROVED_BASELINE`
- `POLICY_OBLIGATION_UNMET` (from `platform-policy.ts`)
- `NO_URS_BASELINE`
- `NO_APPROVED_URS_BASELINE`

None of them asks the Validation Expert. The gate also runs once, on the
transition to `RELEASED`, and surfaces as an error string of concatenated
codes rather than as a standing checklist.

### 4. The Validation Expert role does not exist

`PLATFORM_ROLES` (`packages/platform-common/src/roles.ts:11`) has five roles;
Validation Expert is not one of them. `validation.approve`, `risk.accept` and
`baseline.modify` are denied for **every** caller in `decidePermission`
(`packages/platform-common/src/policy.ts:52`) — including `PLATFORM_ADMIN`,
because the denial is evaluated before any role check.

Meanwhile `validation.review` sits on `DATA_PRODUCT_OWNER`
(`packages/platform-common/src/permissions.ts:359`): the product owner
reviews their own validation. So the involvement is not "insufficiently
structured" — it is absent, plus a segregation-of-duties defect.

> Consequence: the goal is not to simplify two routes. It is to create **one
> continuous product record** that both routes, the gate, and the Validation
> Expert hang off.

## 1. Route differentiation and simplification

### 1.1 Start Building vs Composer

| Dimension | **Start Building** (`/create`) | **Composer** (`/compose`) |
| --- | --- | --- |
| Entry | Golden Path selection → scaffolder form | Empty checkbox list across 5 categories |
| Mental model | "Pick a proven pattern" | "Build a pattern" |
| Cognitive load | Low (guided, fields prefilled) | High (21 components; compatibility and conflicts are the user's problem) |
| Output | Generated repo + catalog entry | YAML manifest; generation **only** on an exact OEE selection |
| Success rate | Deterministic | 1 of n combinations |
| Governance | Template is RELEASED and certified; RBAC applies per template | None — the manifest is not a product record |
| URS binding | Not in the flow | Only via AI spec draft from a URS baseline |
| Validation binding | None | None |
| Actual audience | Developers | Nominally developers, in practice the platform team |
| What the platform says about it | Primary CTA in the hero | `Advanced` pill, orange border, separate "Advanced" section |

The last row is the real finding. The platform already signals in two places
(`packages/app/src/modules/build/BuildLandingPage.tsx:321`,
`packages/app/src/modules/nav/Sidebar.tsx:162`) that the second path is a
special case. **Two equal routes have already been abandoned — only the
information architecture has not caught up.**

### 1.2 Proposal: one door, three depth levels

The Composer becomes a **mode** inside Build rather than a **route**. No
second entry point, no "Advanced" branch.

```text
/build  →  "What should the product do?"  (intent, not technology)
   │
   ├─ L1  Golden Path              → form, 4–6 fields, generate
   │      (default, covers ~80 %)
   │
   ├─ L2  Golden Path + variants   → L1 plus expandable options
   │      (smart presets: the path's optional components)
   │
   └─ L3  Free composition         → component selection, reachable only
          when L1/L2 demonstrably do not fit
```

Progressive disclosure, concretely:

- **L1 is the only visible entry.** Golden Paths already come from
  `releaseCatalogRows()` filtered by release status.
- **L2 is built from the presets that already exist.** `composerPresets()`
  (`packages/platform-common/src/composer.ts:323`) returns five presets with
  `optionalNames`. That is variant logic sitting in the wrong route; it
  belongs on the Golden Path.
- **L3 unlocks only** when the user picks "none of these fit" in L1/L2. That
  choice is the most valuable product signal on the platform: **every L3 use
  is a ticket for a missing Golden Path.**
- **The "Advanced" marker goes away.** Today it warns about a route instead
  of setting an expectation.

Two preconditions, without which the simplification does not hold:

1. **Golden Path resolver from 1 to n.** While only OEE resolves, L3 is not a
   depth level but an export. The resolver needs a component signature per
   Golden Path (required set plus optional set) instead of an exact match
   against one hardcoded list.
2. **L3 must be honest.** When no signature matches, the outcome must not
   silently be "download YAML" but: *"This combination matches no released
   Golden Path. You can submit it as a Golden Path proposal."* — a defined
   exit instead of a dead end. `canProposeGoldenPathRelease`
   (`packages/platform-common/src/releases.ts:348`) already exists.

Measured relief: L1 asks for four decisions (path, name, owner, domain). The
current Composer asks for up to 21 binary decisions plus a compatibility
judgement, and in almost all cases returns no product.

## 2. End-to-end implementation concept

### 2.1 The continuous path

Three decoupled lifecycles exist today:

| Lifecycle | States | Owner |
| --- | --- | --- |
| Requirement | `DRAFT → IN_REVIEW → APPROVED` + baseline | `plugins/urs-composer-backend` |
| Product | `DRAFT → APPROVED → RELEASE_CANDIDATE → RELEASED → SUPERSEDED` | `plugins/composer-backend/src/service.ts:51` |
| Validation | `PENDING → RUNNING → COMPLETED / ABORTED` | `plugins/validation-expert-backend` |

They share no object. The core of this concept is to make the **product
record** from `composer-backend` that shared object — it already references
URS baselines through `ursBaselineIds` and already carries the gate.

### 2.2 Step by step

| # | Step | Trigger | System behaviour | Resulting state |
| --- | --- | --- | --- | --- |
| 1 | **Capture need** | Business Capability Lead / Owner creates a requirement set | URS Composer, requirement quality checks | URS `DRAFT` |
| 2 | **Approve requirement** | Review plus signature | `urs.approve` / `urs.sign`; baseline frozen | URS baseline `APPROVED` |
| 3 | **Build** | Developer opens `/build`, picks the baseline as context | L1/L2/L3; scaffolder creates the repo **and** a product record carrying `ursBaselineIds` | Product version `DRAFT` |
| 4 | **Automatic pre-check (continuous)** | Every commit / every change to the record | Gate evaluated in the background: policy obligations, traceability completeness, URS binding, CI quality | Readiness display, **no** state change |
| 5 | **Draw a baseline** | Developer declares the state ready for review | Snapshot of components, contracts and traceability links (`createProductBaseline`) | Product baseline `DRAFT` → `APPROVED` |
| 6 | **Hand off to validation** | Automatic on baseline approval | Validation context derived from the URS baseline (`urs-baseline-resolver`); case enters the **Validation Expert's work queue** | Validation run `PENDING` |
| 7 | **Plan and execute validation** | Validation Expert | IQ/OQ/UAT protocols; automated runners produce evidence, manual tests are signed | Run `RUNNING → COMPLETED` |
| 8 | **Validation verdict** | Validation Expert (**not** the owner) | `validation.approve` — currently denied to everyone, must be opened for this role | Validation `APPROVED` / `REJECTED` |
| 9 | **Release gate** | Owner requests release | Gate checks all blockers **including a new `VALIDATION_NOT_APPROVED`** | Version `RELEASE_CANDIDATE → RELEASED` |
| 10 | **Operate and re-validate** | URS change / new version | Impact assessment (`RequirementSetImpact` exists) flags affected products | Back to step 5 |

The decisive difference from today is step 4: it runs *continuously and
visibly* rather than as an exception in step 9. A gate you first meet when
you press the release button produces exactly the frustration currently
attributed to the Composer.

### 2.3 Responsibilities

| Step | Developer | Data Product Owner | Validation Expert | Platform (automatic) |
| --- | --- | --- | --- | --- |
| 1–2 Requirement | Consulted | **Accountable** (approve/sign) | Informed (sees demand coming) | Requirement quality checks |
| 3 Build | **Accountable** | Informed | — | Scaffolder, product record, URS binding |
| 4 Pre-check | Receives findings | Informed | — | **Accountable** (gate evaluation) |
| 5 Baseline | **Accountable** | Approves | Informed | Snapshot and immutability |
| 6 Handoff | — | Triggers | **Recipient** | Validation context, queue entry |
| 7 Execution | Supports on findings | Informed | **Accountable** | Automated runners, evidence store |
| 8 Verdict | — | **Excluded (SoD)** | **Solely accountable** | Audit trail |
| 9 Release | — | **Accountable** (request) | Contributor (validation result) | The gate decides, not a person |
| 10 Change | Implements | **Accountable** | Scope of re-validation | Impact assessment |

Three boundary rules to enforce in code, not in prose:

- **The Validation Expert validates and does not build.** No `scaffolder.*`
  and no `product.manage`.
- **The owner requests a release and does not grant it.** The gate grants it.
  `validation.review` must move off `DATA_PRODUCT_OWNER`; today the owner
  reviews their own work.
- **AI proposes and never decides.** Already correct in the code — an
  `AISpecDraft` stays `PENDING_REVIEW` and the baseline stays `DRAFT`
  (`plugins/composer-backend/src/service.ts:794`). The rule carries over
  unchanged to every new AI capability.

## 3. Harmonisation measures

### M1 — Make the product record visible

**Problem:** the full product lifecycle lives in the backend with no UI; the
frontend uses only the AI endpoints.

**Measure:** a product detail page showing version, components, contracts,
traceability, baselines and gate status in one place — the destination of
both "Start Building" and L3, and the object URS Composer and Validation
Expert link to.

**Effect:** three lifecycles become one object with three facets. Without M1,
M2–M5 are invisible.

### M2 — Turn the quality gate from an exception into a checklist

**Problem:** `checkReleaseGate` runs once and throws
`Release gate failed: CODE_A, CODE_B`.

**Measure:** expose gate evaluation as a read endpoint from day one of a
product; render it as a checklist of met / open / not applicable with the
concrete next action per blocker. Add a `VALIDATION_NOT_APPROVED` blocker,
which connects the Validation Expert to the gate for the first time. The
gate already collects all findings instead of failing fast — the pattern is
right, only the visibility is missing.

**Effect:** nobody learns about a requirement on release day.

### M3 — Introduce the Validation Expert role for real

**Problem:** the role exists as a plugin and a sidebar entry but not in the
role model. `validation.approve`, `risk.accept` and `baseline.modify` are
globally denied.

**Measure:** a sixth role `VALIDATION_EXPERT` with group
`validation-experts`; open the three reserved permissions for that role only,
keeping them denied for everyone else including `PLATFORM_ADMIN`; move
`validation.review` from the owner to the Validation Expert. Apply a
segregation-of-duties check analogous to the one the URS signature service
already performs.

**Effect:** the approval process becomes executable rather than described.
**This is the precondition for step 8 — without M3 the E2E path cannot be
completed.**

### M4 — Role-based dashboards with a work queue

**Problem:** there is no handoff point. The Validation Expert is never told
that something is waiting.

**Measure:** a work list per role instead of a landing page — Developer:
"products with open gate blockers"; Owner: "awaiting approval / ready to
release"; Validation Expert: "awaiting validation, ordered by risk"; Business
Capability Lead: "URS in review". The notifications plugin is already wired
in (`packages/app/src/modules/nav/Sidebar.tsx:243`) and can deliver the
handoffs in steps 6 and 8.

**Effect:** parallel tools become a process with a baton pass.

### M5 — Readiness progress instead of an aggregate status

**Problem:** nobody can see where a product stands end to end. At the same
time [Status model](status-model.md) explicitly forbids collapsing the four
status dimensions into one badge — for good reason: `CERTIFIED` must never
read as "GxP validated".

**Measure:** no new status, but a **progress indicator over gate
satisfaction** — "7 of 9 release conditions met", expandable to the
individual conditions, each labelled with its own dimension. The progress is
derived and never stored, so no fourth source of status appears.

**Effect:** end-to-end transparency without violating the status model — by
construction the indicator cannot imply a compliance claim.

### Dependencies and order

```text
M3 (role)    ──┐
               ├──> M2 (visible gate + validation blocker) ──> M4 (queues) ──> M5 (readiness)
M1 (record)  ──┘
```

M1 and M3 are independent and can run in parallel. M3 is the smallest change
with the largest unblocking effect: without it the E2E path stops at step 8
no matter how good the interface becomes. The route consolidation in section
1 is orthogonal and can start immediately, but should schedule the resolver
rework (1 → n Golden Paths) as a precondition.

## Summary

The Composer is not too complex but inconsequential — 21 choices lead to
exactly one producible product, and the product backend that carries the
release gate has no interface at all. The Validation Expert is not an
insufficiently integrated process step but a role that does not exist in the
permission model, whose central permissions are hard-denied to every user.
The consolidation is therefore two movements: **at the front**, one door with
three depth levels instead of two routes; **at the back**, one continuous
product record carrying a permanently visible quality gate and a validation
role that actually exists.
