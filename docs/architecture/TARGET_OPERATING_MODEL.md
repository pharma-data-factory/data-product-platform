# Target Operating Model

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING / PRODUCT / QUALITY
Status: TARGET STATE, anchored in measured current state

How Nexora operates from requirement to release: who acts, what the system
does, and where the model is not yet realised. Each section states the
current position first, because a target described without its starting point
is not actionable.

Supersedes `docs/nexora-transformation/TARGET_ARCHITECTURE.md` as the
narrative operating model; that file remains the terse architecture statement.

---

## 1. Layering

```
Nexora  —  product and extension layer, owns Product / Requirement / Artifact
   │
   ▼  public APIs and extension points only
Backstage  —  kernel: Catalog, Scaffolder, Auth, Permissions, Search, TechDocs
```

One-way. Enforced by `yarn guard:platform`. See
`docs/architecture/ARCHITECTURE_GUARDRAILS.md` for the checks and the
documented deviations.

`packages/app` and `packages/backend` are wiring. Domain behaviour lives in
owned plugins, and each plugin owns its own tables. Cross-plugin reads go over
authenticated HTTP resolvers.

---

## 2. Roles

Two independent grant systems, plus a commercial gate. Deliberately
independent: a Quality Reviewer is not a senior Developer, and platform tier
should not confer approval rights.

**Platform tiers** — `packages/platform-common/src/roles.ts`

| Catalog group               | Role                     | Grants, in essence                                        |
| --------------------------- | ------------------------ | --------------------------------------------------------- |
| `platform-viewers`          | VIEWER                   | read                                                      |
| `data-product-developers`   | DEVELOPER                | create products, run scaffolder, execute validation tests |
| `business-capability-leads` | BUSINESS_CAPABILITY_LEAD | administer business capabilities                          |
| `data-product-owners`       | DATA_PRODUCT_OWNER       | manage products, review validation, transition releases   |
| `platform-admins`           | PLATFORM_ADMIN           | administration, validation approval                       |

**URS domain groups** — independent of tier

| Group                       | Grants                                 |
| --------------------------- | -------------------------------------- |
| `urs-authors`, `urs-owners` | `urs.read`, `urs.create`, `urs.manage` |
| `urs-business-reviewers`    | `urs.read`, `urs.approve`              |
| `urs-product-managers`      | `urs.read`, `urs.approve`              |
| `urs-quality-reviewers`     | `urs.read`, `urs.approve`, `urs.sign`  |

**Commercial gate** — entitlement and GA-release eligibility are ANDed onto
scaffolder template permissions and every Create decision is audited.

_Current position:_ implemented and backend-enforced. Weaknesses are recorded
as D-4 in the guardrails document.

---

## 3. The operating flow

### Stage 1 — Requirements _(WORKING)_

A Business Capability Lead maintains the capability model. An author creates a
requirement set, classifies it, and writes requirement versions. Each version
walks `DRAFT → IN_REVIEW → REVIEWED → IN_APPROVAL → APPROVED`, reaching
APPROVED only through a valid QA e-signature.

Approved versions are collected into a baseline. Submitting it selects a
workflow **by GxP classification** — three steps with QA for GxP, two without.
The chain is ordered, role-gated and SoD-enforced.

**Output:** an approved, immutable, content-hashed baseline.

### Stage 2 — Product Initiation _(WORKING)_

A product is created and a version bound to an approved baseline. Binding
copies every pinned requirement into `product_requirements` — a snapshot, not
a pointer, so the product keeps the wording it was built against.

Binding is verified server-side in three independent places: the service
resolver, the `nexora:urs:verify-baseline` scaffolder action inside the task,
and the release gate.

**Rule: free to create, bound to release.** Experimentation is unrestricted;
a product must state its requirements before it ships.

_Target refinement:_ all four creation paths must converge so that every
product carries the same record. Today only templates carrying
`nexora:product:create` produce a repository and catalog link.

### Stage 3 — Design & Planning _(MISSING)_

**Target:** an approved UAS produces a Functional Specification whose items
each trace to at least one requirement; the FS informs the component
architecture; stories and tasks live in GitHub, not in Nexora.

**Target boundary:** Nexora owns FS and its traceability. It does not own a
backlog.

### Stage 4/5 — Components and Repository _(PARTIAL)_

Components are declared on a DRAFT version; a Golden Path template produces a
repository with structure, docs, CI and tests, registers a Catalog entity, and
writes the repository and entity reference back onto the Product.

_Target refinement:_ every publishing template writes that link; the GitHub
organisation is configuration, not a literal.

### Stage 6 — Development _(PARTIAL)_

The developer's context is `/products/:id`: requirements, architecture,
repository and build evidence in one surface. **This is the Development
Workspace the target model names** — extend it rather than introducing a
second concept.

_Missing:_ design artefacts (Stage 3) and task context.

### Stage 7 — Build, Test, Verification _(PARTIAL)_

CI in the generated repository runs lint, unit, contract, quality and
compatibility tests, builds an image, and posts release provenance back to the
product baseline (write-once, service principal).

**Target:** CI also reports test results, and the platform derives
`VERIFIED_BY` links from a repository-declared requirement mapping. Today no
component of the system creates a `VERIFIED_BY` link.

### Quality Gate _(WORKING, evidence-thin)_

Fail-closed, evaluated before any `RELEASED` transition, and readable in
advance so blockers can be cleared. Eleven blocker codes today.

**Target:** the gate consumes `getRequirementCoverage` and refuses on
unverified requirements — the computation exists and is currently unused.

### Stage 8/9 — Release and Operation _(PARTIAL / MISSING)_

A release today is a status on a product version, with SoD on approval and
provenance on the baseline. Deployment, monitoring and change management are
not implemented.

### Stage 10 — Marketplace _(PARTIAL)_

Discovery and selection work against a real Artifact Registry with immutable
coordinates, publisher trust levels and policy packs consumed by the release
gate. Install, configure and upgrade do not exist.

**Target:** an Artifact can be instantiated as a Product Component. That link
is what turns the registry from a catalogue into reuse.

---

## 4. Decision rights

| Decision                  | Who                    | Enforced                   |
| ------------------------- | ---------------------- | -------------------------- |
| Requirement content       | Author                 | `urs.manage`, DRAFT only   |
| Business review           | Business Reviewer      | workflow step + role       |
| Product management review | Product Manager        | workflow step + role       |
| QA approval               | Quality Reviewer       | e-signature + SoD          |
| Product version approval  | anyone but the author  | server-side SoD            |
| Product baseline approval | anyone but the creator | server-side SoD            |
| Validation decision       | independent expert     | `validation.approve`       |
| Release                   | Owner / Admin          | gate + SoD                 |
| Dependency change         | maintainer, explicitly | `AGENTS.md` stop condition |

**Invariant across all of them: nobody signs off their own work, and no
automated step produces an approval.**

---

## 5. What this model refuses to do

- Collapse verification and validation into one status.
- Let an AI approve anything.
- Grant approval rights through platform seniority.
- Build a second RBAC engine, test runner, backlog or certification store.
- Treat GitHub, an LLM provider or an analytics platform as domain truth.

---

## 6. Topology — one platform, many installations

Added 2026-09-28. **Target state: none of this exists yet.** See
[`NXD-074`](../nexora-transformation/DECISIONS.md) for the decisions and
`PHASE_CLOSURE_PLAN.md` §9 for the sequence.

Nexora is an open platform, so the model below names no privileged participant.
Roche appears only as a worked example; substitute any operator.

### 6.1 The edge, not the chain

An installation may **consume** artifacts from upstream registries and
**publish** artifacts to downstream ones. That is one relationship, and it
composes:

```
Nexora  ──publishes──▶  an operator  ──publishes──▶  a site
        ◀──consumes──               ◀──consumes──
```

The chain has no fixed length and no privileged position. An operator who takes
templates from Nexora, authors its own, and offers both to its sites is running
the same edge twice — once as consumer, once as publisher. Modelling "vendor
platform" and "customer platform" as two different things would build one
mechanism twice.

This is already the shape the publisher model assumes: a namespace per
publisher, `INTERNAL | PARTNER | COMMUNITY` trust tiers, and self-registration
that lets a team claim a namespace without an admin bottleneck. Nothing
privileges the namespace `nexora`.

### 6.2 Scope is an Edition, never a separate build

Installations differ in *what they do*, not in *what they are*. A site that only
consumes runs the same software as the operator that publishes; it enables fewer
capabilities.

This follows from `NEXORA_STRATEGY.md`: _"One Platform: Producer and Consumer
are capabilities, not separate applications or global modes."_ A reduced
"consumer build" would be exactly the forbidden thing. `catalog/editions.yaml`
is the sanctioned lever and says so itself — _"Adding a new edition does NOT
require changing Core."_

A site edition carries the governing half and drops the authoring half:

| Capability | At a site | Why |
| --- | --- | --- |
| Catalog, Marketplace (read), Product Registry | **yes** | otherwise the site cannot know what it may deploy |
| Validation, release gate, audit trail | **yes** | the local IT/OT team owns validation, so the evidence lives there |
| URS **read** — resolving a baseline binding | **yes** | a product must show which requirements it implements |
| URS authoring, Composition Engine, Product Studio | **no** | requirements and templates are authored upstream |
| External publishers, commercial marketplace | **no** | that is the operator tier — `nexora-enterprise` |

The regulatory argument is the stronger one: **every installation must be
qualified.** A declared edition turns "what can this installation do" into an
auditable fact rather than an assumption, which bounds the qualification scope
per site and makes that bound defensible.

### 6.3 Nexora governs; it does not deploy

Microservice deployment is GitHub's. Nexora records what was approved, what was
verified, what was validated, and refuses a release that cannot show it.

This is a boundary, not a gap. `TARGET_CONFORMANCE_AUDIT.md` lists "Deployment —
MISSING" and excludes runtime operation from MVP1; §6.3 is the reason that entry
should stay closed rather than be worked off.

The return channel already exists and is the right shape: CI posts release
provenance (`POST /baselines/:id/provenance`, `NXD-052`) and test executions
(`POST /test-executions`) under a service token. A site installation learns about
a GitHub deployment the same way the platform's own repository does.

### 6.4 What this costs, stated plainly

Four things must exist before the edge works, and none does today:

1. **Portable artifact content.** Content resolves from the local filesystem
   only; `ArtifactVersion.sourceRef` is the intended seam and is never
   dereferenced. A site cannot obtain what it does not already have.
2. **Installation identity.** There is none. Two instances collide on the
   platform product `nexora-core`, on `organizationId: internal`, on the catalog
   namespace `default`, and on artifact coordinates — a local fork silently
   shadows an upstream version.
3. **Federation that carries content.** It transfers six scalar fields per
   artifact; the manifest is fetched, read for one field, and discarded. Nothing
   is persisted, no screen requests federated results, there are no tests, and
   the config key is absent from the schema.
4. **A verb for taking something up.** There is no install action anywhere, and
   the only call to action links to a *local* scaffolder template — at a site,
   a 404.

### 6.5 Knowing who consumes: the credential is the registry

An installation that publishes must be able to answer "who consumes from me",
show it, and refuse anyone it does not know. Those are not three features. Issue
one credential per consuming installation and all three fall out of it.

**Identity is already carried and already free.** `backend.auth.externalAccess`
is an **array**; each entry has a `token` *and* a `subject`, and Backstage's
static handler returns that subject verbatim into
`credentials.principal.subject`. Today there is exactly one entry —
`subject: release-pipeline`, so CI can post provenance — and adding one per
consuming installation requires **no code at all**. Backstage also supports
per-entry `accessRestrictions` (plugin, permission, permission attribute); the
repository does not use them yet, and they are the scoping knob for "this
consumer may read the catalogue and nothing else".

**On credential shape:** the platform supports two, GitHub OAuth for humans and
a static bearer token for services. There is no username/password anywhere, and
for installation-to-installation traffic a token is the right answer regardless.
A human at a customer who wants to browse the marketplace is a *different*
question — that is user authentication on the publishing installation, not a
consumer credential.

**One route change unblocks it.** No read route admits a service principal
today: `GET /artifacts` is `{ allow: ['user'] }`, so a consuming installation
presenting its token gets 401. The fix is not new ground — the same router
already has `authorizeReadOrService`, used by `POST /policies/resolve`, whose
rule is written out there: a service principal carries no catalog identity, so
possession of the token *is* the authorisation.

**The registry is then a record of reads, not a second table to maintain.**
Nothing on the publishing side records who asked: no read route in any plugin
writes an audit event, and the one access counter that exists
(`data-products-backend`) keeps timestamps in memory and deliberately discards
the caller. So the new piece is an append-only store owned by
`artifact-registry-backend` — the plugin that serves the catalogue and today has
no audit store of its own. `user_sign_in_events` in `users-backend`
(`id, timestamp, actor, provider`) is almost exactly the right shape and the
only access-style record in the repository. Ownership matters here: writing into
another plugin's store is the cross-plugin database access `AGENTS.md` forbids,
and `NXD-052` already rejected precisely that.

This makes a read an auditable event for the first time. That is a deliberate
change of principle, not an oversight being corrected — everything audited today
is a mutation.

**The picture.** A topology view over those records: publishing installation in
the centre, each known consumer a node, the edge carrying last contact and what
was drawn. `LineageDAGView.tsx` already hand-rolls exactly this —
`GraphNode`/`GraphEdge`, a rank layout, drag-to-pan, hover highlight, bezier
edges — with no graph library, and it is reusable as-is. Worth noting while
here: `@backstage/plugin-catalog-graph` is a declared dependency that is **never
registered**, so the `/catalog-graph?rootEntityRefs=…` links the code already
builds point at an unrouted path.

**What this does not do.** It records who *asked*, not who *deployed*. A
consuming installation that draws an artifact and never installs it looks
identical to one that rolls it out everywhere. If the reference line has to show
adoption rather than contact, that is the CI return channel of §6.3, reported by
the consumer — a separate and larger thing.
