# Nexora Vision

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING / PRODUCT
Status: TARGET STATE — describes what does **not** exist yet

> **Read this as intent, never as capability.**
> For what exists today: `docs/audits/TARGET_CONFORMANCE_AUDIT.md`.
> For what is released: `ROADMAP.md`.
> For the principles that constrain how we get there: `NEXORA_STRATEGY.md`.
>
> Every stage below carries its measured implementation status. A stage marked
> MISSING or PARTIAL is not available in the running product.

---

## What Nexora is for

**The Open Manufacturing Platform for Life Sciences.**

A regulated product lifecycle is normally carried by documents that reference
each other and by people who keep the references true. Nexora's premise is
that the references should be data: a requirement, the product that implements
it, the code that realises it, the test that verifies it and the release that
ships it should be one connected record, not seven documents that agree by
convention.

Two consequences follow, and both are already visible in the architecture:

- **Engineering Verification and formal Pharma Validation are separate but
  traceable.** A requirement can be verified by CI and still not be formally
  validated. Collapsing the two into one status destroys the distinction that
  makes either meaningful.
- **Nexora manages Nexora with Nexora.** The platform is itself a Product
  (`PRODUCT_TYPE = PLATFORM_PRODUCT`) and runs the same lifecycle.

---

## The lifecycle

| #   | Stage                              | Intent                                                                               | Status (2026-09-26)                |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| 1   | **Requirements / UAS**             | Create, classify, review, approve, baseline, version, trace                          | **WORKING**                        |
| 2   | **Product Initiation**             | An approved UAS becomes a Product with identity, classification, requirements        | **WORKING**                        |
| 3   | **Design & Planning**              | UAS → FS → TDS → Architecture → Stories → Tasks                                      | **MISSING**                        |
| 4   | **Product Components**             | Modular building blocks, reusable across products                                    | **PARTIAL**                        |
| 5   | **Repository & Development Setup** | Repository, structure, documentation, CI/CD, tests                                   | **PARTIAL**                        |
| 6   | **Development**                    | Developer receives requirements, design, components, repository, tasks, traceability | **PARTIAL**                        |
| 7   | **Build / Test / Verification**    | Build, tests at every level, requirement verification, evidence                      | **PARTIAL**                        |
| —   | **Quality Gate**                   | Coverage, tests, GMP controls, traceability, evidence, release readiness             | **WORKING** (evidence-thin)        |
| 8   | **Release**                        | Controlled release with provenance                                                   | **PARTIAL**                        |
| 9   | **Operation**                      | Deployment, monitoring, change management, support                                   | **MISSING**                        |
| 10  | **Marketplace**                    | Discover, select, install, configure, extend, govern, update                         | **PARTIAL** (discover/select only) |

### The gap in one sentence

Nexora can prove that a product was **governed**. It cannot yet prove that the
product **works** — Stage 3 is absent and the evidence half of Stage 7 is not
captured. Closing that is the product's central task, not an enhancement.

---

## Cross-cutting capabilities

| Capability                   | Intent                                                 | Status                                        |
| ---------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Requirements management      | Full controlled lifecycle with e-signature             | **WORKING**                                   |
| Product lifecycle management | Versions, baselines, states, gates                     | **WORKING**                                   |
| Product Composer             | The product's development surface                      | **PARTIAL** — see naming note below           |
| Product Components           | Reusable modular units                                 | **PARTIAL**                                   |
| GitHub integration           | Repositories, CI, Actions, webhooks, PR/commit context | **PARTIAL** — no webhooks                     |
| Repository provisioning      | Golden Path templates → working repository             | **WORKING**                                   |
| RBAC                         | Roles, permissions, backend enforcement                | **WORKING**                                   |
| Versioning                   | Requirements, products, contracts, artifacts           | **WORKING**                                   |
| Auditability                 | Who, when, from what, to what, why                     | **PARTIAL** — "why" only on the URS side      |
| GMP / Non-GMP classification | Classification that changes behaviour                  | **WORKING**                                   |
| V-Model traceability         | UAS → FS → TDS → Component → Test → Evidence → Release | **PARTIAL** — FS/TDS and Test/Evidence absent |
| Automated testing            | Tests run and report into the platform                 | **PARTIAL** — platform only                   |
| Test evidence                | Durable, attributable proof a requirement was tested   | **MISSING** for products                      |
| AI-assisted engineering      | Proposals a human reviews and applies                  | **WORKING** (off by default)                  |
| AI Test Coordinator          | Agent that plans and reconciles verification           | **MISSING**                                   |
| Change Impact Analysis       | What breaks if this changes                            | **PARTIAL** — deterministic, not AI           |
| Quality Gates                | Fail-closed release control                            | **WORKING**                                   |
| Release management           | Controlled release with provenance                     | **PARTIAL**                                   |
| Marketplace / reuse          | Publish, discover, install, upgrade                    | **PARTIAL**                                   |

---

## Vocabulary

The platform reuses several words for different things. The target vocabulary
resolves them; the current code does not yet. Until it does, be explicit.

| Word          | Intended single meaning                                                   | Today                                         |
| ------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| **Product**   | The governed unit: identity, requirements, versions, components, releases | four registries use the word                  |
| **Component** | A part of a product version                                               | four meanings                                 |
| **Artifact**  | A versioned, publishable, reusable unit in the registry                   | consistent                                    |
| **Composer**  | The product's development surface                                         | two unrelated systems                         |
| **Baseline**  | A frozen, approved set                                                    | three meanings, all legitimate — qualify them |

**On "Development Workspace":** the target model names one. It already exists
as `/products/:id` with its tabbed surface. Extend it; do not introduce a
second concept beside it.

---

## What Nexora deliberately does not own

From `NEXORA_STRATEGY.md`: _"GitHub, analytics platforms, exchange
technologies and AI models are providers, not Nexora domain truth."_

Concretely, Nexora does not intend to build: a test runner (tests run in CI),
an issue tracker or backlog (GitHub Issues/Projects), a second RBAC engine, a
second certification store, or a replacement for the Backstage Catalog,
Scaffolder, Auth, Permission Framework, Search or TechDocs.

**Backstage is the kernel** (`AGENTS.md`; re-confirmed 2026-09-26). Nexora is
the product and extension layer above it. The dependency direction is one-way.
