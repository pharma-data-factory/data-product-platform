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
