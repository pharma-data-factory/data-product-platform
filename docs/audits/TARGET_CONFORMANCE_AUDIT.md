# Target Conformance Audit

Owner: Platform Team
Audit date: **2026-09-26**
Commit: **`d68308f`** (branch `ms/composer-ai-spec-and-ci-quality-gate`)
Method: repository inspection + executed test suite + executed guardrail check
Audience: INTERNAL ENGINEERING / PRODUCT / QUALITY
Status: AUTHORITATIVE measured current-state baseline as of the date above

Supersedes `docs/assessment/CURRENT-IMPLEMENTATION-STATUS.md` (2026-08-23) and
`docs/audits/platform-vision-implementation-audit.md` (2026-09-07). Both are
retained as historical records of their own dates; neither describes the
current system.

**Rule for reading:** this document records what was measured, not what was
intended. Where it disagrees with any other document except the code itself,
it wins (`CLAUDE.md` §1).

---

## 1. Executive summary

Nexora is not half-finished. It is **nearly complete in one half and largely
empty in the other.**

- **Governance half** — requirements, approvals, signatures, baselines,
  product binding, release gate: substantial, tested, GxP-shaped. Keep.
- **Engineering half** — design, development context, test, evidence: the
  chain breaks at one identifiable joint, and everything else depends on it.

> Nexora can prove that a product was **governed**.
> It cannot prove that the product **works**.
>
> `VERIFIED_BY` exists as a relationship type and has **no producer anywhere
> in the codebase**. There is no test entity, no execution record, no evidence
> ingestion for products.

**Where the lifecycle stops:** Stage 3 (Design & Planning) is entirely absent
— no FS, no TDS, no user story, no task, zero source references. The evidence
half of Stage 7 is not captured.

**Strongest foundations:** the URS domain; the `product_requirements` snapshot
design; HTTP-only plugin boundaries; `verify-platform-guardrails.mjs`; and the
decision-record discipline (59 NXD records).

**Largest risks:** `VERIFIED_BY` has no producer · the shipped default
disables the GxP invariants · two unrelated systems are both called "Composer"
· AI spec drafts live in an in-process `Map`.

---

## 2. Measured facts

```
yarn test          Test Suites: 3 skipped, 220 passed, 220 of 223 total
                   Tests:       65 skipped, 1923 passed, 1988 total
                   Time:        162.4 s        exit 0

yarn guard:platform    PASS 9 · WARNING 9 · FAIL 0 · RESULT: GUARDRAILS_OK
```

The 3 skipped suites are the PostgreSQL GxP proofs, gated by
`URS_TEST_PG_AVAILABLE`; CI provisions PostgreSQL and runs them.

|                    |                                                               |
| ------------------ | ------------------------------------------------------------- |
| Kernel             | Backstage **1.53.0**                                          |
| Monorepo           | Yarn **4.13.0**, workspaces `packages/*` + `plugins/*`        |
| Runtime            | Node 22\|\|24 · TypeScript ~5.8 · React 18 · Material UI v4   |
| Plugins            | **21** first-party · **7** packages                           |
| Database           | 39 tables across 5 owning plugins                             |
| Composition layers | `app/src` 155 files / 30,313 lines · `backend/src` 46 / 6,453 |
| Commits            | 165 (2026-08-15 → 2026-09-25), 143 of them in September       |
| Markdown           | 619 files; 335 in `docs/`                                     |

**Backstage dependency: technical, deep, structural.** Catalog, Scaffolder,
Permission Framework, Auth, Search, TechDocs, Events, Signals and
Notifications are consumed as `@backstage/*` plugins. No patches, no vendored
source, no private-internals imports.

---

## 3. Architecture

`packages/backend/src/index.ts` is 60 lines of registration. Domain behaviour
lives in plugins; each owns its tables; cross-plugin reads go over
authenticated HTTP resolvers.

**Table ownership:** `urs-composer-backend` 15 · `composer-backend` 12 ·
`validation-expert-backend` 6 · `artifact-registry-backend` 3 ·
`users-backend` 3. `aas-backend`, `entitlements-backend`,
`model-company-backend` and `plugin-directory-backend` hold **none** — they
are in-memory (`new Map`) or config-derived.

**Documented deviation:** Community RBAC is disabled because it claims the
same `/alpha` `policyExtensionPoint`; a second `setPolicy()` throws. A
proprietary `PlatformPermissionPolicy` is sole authority. Recorded as D-1 in
`docs/architecture/ARCHITECTURE_GUARDRAILS.md`.

---

## 4. Domain model

Three structural observations matter more than the table list:

1. **`traceability_links` has zero foreign keys** — only a composite unique
   index. Source and target types and ids are unvalidated strings. This is the
   table the V-model rests on.
2. **`product_requirements` is a deliberate copy, not a join** — it snapshots
   an approved URS baseline including `content_hash`, so a product keeps the
   wording it was built against. A genuinely strong design.
3. **The legacy `requirements` table is marked deprecated and still written.**

Cross-plugin relationships are HTTP resolvers, **not** foreign keys:
`baselines → product_requirements`, `baselines → validation_contexts`.

---

## 5. Lifecycle, traced end to end

| Transition                                                           | Verdict                         |
| -------------------------------------------------------------------- | ------------------------------- |
| Create UAS → requirement versions → APPROVED via QA e-signature      | **WORKING**                     |
| Baseline created, submitted, chain walked (ordered, role-gated, SoD) | **WORKING**                     |
| UAS → Product, snapshot bind, verified APPROVED in three places      | **WORKING**                     |
| Repository provisioning via Scaffolder                               | **WORKING** as a mechanism      |
| Product ↔ Repository join                                            | **PARTIAL** — 2 of 10 templates |
| Components added on DRAFT version                                    | **WORKING**                     |
| Requirement → Component link                                         | **PARTIAL** — manual, no FK     |
| Product baseline created and approved, SoD-enforced                  | **WORKING**                     |
| ValidationDecision by independent expert                             | **WORKING**                     |
| CI posts release provenance (write-once, service principal)          | **WORKING**                     |
| Release gate → RELEASED                                              | **WORKING**, evidence-thin      |
| Deployment                                                           | **MISSING**                     |

**Four doors create a Product** — `POST /products`, the scaffolder action, an
applied AI spec draft, and `platformProductBootstrap` — and only the
scaffolder path produces `repositoryUrl` and `catalogEntityRef`.

### Template capability matrix (measured)

| Template                     | urs-verify | product-create | publish | register |
| ---------------------------- | ---------- | -------------- | ------- | -------- |
| `aas-asset`                  | –          | –              | –       | –        |
| `aas-data-product`           | ✅         | –              | ✅      | ✅       |
| `machine-state-consumer`     | ✅         | –              | ✅      | ✅       |
| `mqtt-connector`             | –          | –              | ✅      | ✅       |
| `mqtt-temperature-product`   | ✅         | –              | ✅      | ✅       |
| `node-service`               | –          | –              | ✅      | ✅       |
| **`oee-data-product`**       | ✅         | ✅             | ✅      | ✅       |
| `python-service`             | –          | –              | ✅      | ✅       |
| **`rest-equipment-product`** | ✅         | ✅             | ✅      | ✅       |
| `unified-namespace`          | –          | –              | ✅      | ✅       |

---

## 6. Findings by domain

**UAS / Requirements — WORKING.** The strongest subsystem. Full lifecycle,
content freeze after DRAFT enforced by a PostgreSQL trigger, one-open-version
partial unique index, e-signatures with PIN re-auth and content-hash
verification, SoD, change control with impact assessment, append-only audit.
An approved UAS genuinely becomes an input to development — verified at the
service resolver, inside the scaffolder task, and at the release gate.

**Product — PARTIAL (WORKING for governance).** Product orchestrates the
governance lifecycle. It does not schedule work, hold tasks, or deploy.

**Product Composer — PARTIAL; the most consequential finding.** Two unrelated
systems share the name: `/compose` (a 1,213-line component-selection sandbox
that can only generate when the selection exactly matches an official Golden
Path, and passes no `ursBaselineId`) and `composer-backend` + `/products`
(the Product domain: 12 tables, 55 routes, the release gate).
**`/products/:id` with its seven tabs already is the "Development Workspace"
the target names.** Do not build a second concept.

**Product Components — PARTIAL.** Rows, CRUD and types. No independent
versioning, no repository mapping, no test link. The Marketplace's reusable
unit is the **Artifact**, not the ProductComponent; nothing instantiates one
from the other, which is the missing link for reuse.

**GitHub — PARTIAL.** Auth, publishing and read-only Actions work. **No
webhook handling** (`events-backend` is registered; no GitHub events module).
Hard-coded organisation in 6 templates and in `ComposePage`.

**FS / TDS / Stories / Tasks — MISSING.** Zero source references.

**Testing — WORKING for the platform, MISSING for products.** 1,988 platform
tests. The Validation Expert is a controlled workbench for **Nexora itself**:
it parses `validation/**/*.md` and has exactly three hard-coded runners. Its
own UI says _"Not an AI agent. Not validated."_

**Traceability — PARTIAL.** UAS→Baseline→ProductRequirement is implemented
and strong. Requirement→Component is manual. Implementation→Test and
Test→Evidence are absent.

**GMP — WORKING.** Classification switches four behaviours. No
`Hybrid`/`Shared` level exists.

**RBAC — WORKING.** Backend-enforced on every route. Weaknesses: three
hand-synced permission registries, and `isPrivilegedRead()` is a 19-name
deny-list that fails **open** when someone forgets an entry.

**Audit — PARTIAL.** URS answers who/when/from/to/**why**. The product side
cannot answer "why" — `composer_audit_events` has no `reason` and no
`entity_version`.

**Quality Gate — WORKING, evidence-thin.** Eleven fail-closed blocker codes;
an unknown policy check fails loudly. It never asks whether a test passed,
and it does not consume `getRequirementCoverage`, which computes the
regulated answer correctly.

**Marketplace — PARTIAL.** Discover and select, over a real registry with
immutable coordinates and trust levels. No install, configure or update.

**AI — WORKING and narrow, off by default.** Anthropic and OpenAI clients,
schema-constrained output, prompt templates with tests. The spec-draft path
creates a real Product with a real URS binding and traceability links,
skipping requirement refs the model invented. **Drafts are held in an
in-process `Map`** — lost on restart, invisible to a second instance, and
unauditable. No AI Test Coordinator, no AI GMP Impact Agent.

---

## 7. Conformance matrix

| Capability                                                       | Status      | Action    | Principal gap                        |
| ---------------------------------------------------------------- | ----------- | --------- | ------------------------------------ |
| UAS creation / classification / approval / baseline / versioning | WORKING     | KEEP      | —                                    |
| Product creation                                                 | WORKING     | REFACTOR  | four doors, unequal completeness     |
| UAS → Product                                                    | WORKING     | KEEP      | 5 of 10 templates verify             |
| Product versioning                                               | WORKING     | KEEP      | —                                    |
| Product Composer                                                 | PARTIAL     | REFACTOR  | name collision                       |
| Product Components                                               | PARTIAL     | EXTEND    | no versioning / repo / test link     |
| FS · TDS · Stories · Tasks                                       | MISSING     | BUILD     | entire stage                         |
| Architecture view                                                | PARTIAL     | EXTEND    | graph view, not a design artefact    |
| Repository provisioning                                          | WORKING     | KEEP      | hard-coded org                       |
| GitHub integration                                               | PARTIAL     | EXTEND    | no webhooks                          |
| Templates                                                        | WORKING     | KEEP      | 8 of 10 lack `product:create`        |
| CI/CD                                                            | PARTIAL     | EXTEND    | provenance needs 3 secrets           |
| Development context                                              | PARTIAL     | EXTEND    | no design, no tasks                  |
| Unit / integration tests                                         | WORKING     | KEEP      | platform only                        |
| System tests                                                     | PARTIAL     | EXTEND    | no URS→Release E2E                   |
| UAT                                                              | PLACEHOLDER | BUILD     | platform-only protocol parsing       |
| Test evidence                                                    | PARTIAL     | BUILD     | no product ingestion                 |
| **Requirement → Test traceability**                              | **PARTIAL** | **BUILD** | **no `VERIFIED_BY` producer**        |
| GMP classification / workflow                                    | WORKING     | KEEP      | no Hybrid level                      |
| Audit trail                                                      | PARTIAL     | EXTEND    | no `reason`; memory default          |
| RBAC                                                             | WORKING     | REFACTOR  | 3 registries, fail-open deny-list    |
| Quality Gate                                                     | WORKING     | EXTEND    | ignores coverage and test results    |
| Release                                                          | PARTIAL     | EXTEND    | status, not an entity                |
| Deployment                                                       | MISSING     | BUILD     | —                                    |
| Marketplace                                                      | PARTIAL     | EXTEND    | no install / configure / update      |
| Change Impact Analysis                                           | PARTIAL     | EXTEND    | deterministic, not requirement-level |
| AI Test Coordinator · AI GMP Impact                              | MISSING     | BUILD     | future capability                    |

---

## 8. Duplication

| Concept               | Instances                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Composer**          | `/compose` sandbox · `composer-backend` Product domain                                                                                                                             |
| **Product**           | `products` table · Catalog entity · Artifact kind · commercial SKU                                                                                                                 |
| **Component**         | `product_components` · Platform Component library · Artifact kind · Backstage kind                                                                                                 |
| **Requirement**       | `requirements` (deprecated, still written) · `requirement_versions` · `product_requirements`                                                                                       |
| **Baseline**          | URS · Product · `validation/baseline/`                                                                                                                                             |
| **Release / Version** | version status · golden-path releases · artifact lifecycle                                                                                                                         |
| **Template**          | Scaffolder templates · Artifact kind · GOLDEN_PATH composition                                                                                                                     |
| Marketplace data      | static `data.ts` **and** live registry, on one page                                                                                                                                |
| Permission registries | three, hand-synced                                                                                                                                                                 |
| Audit stores          | four, three different schemas                                                                                                                                                      |
| LLM clients           | duplicated across two plugins                                                                                                                                                      |
| ADR directories       | ~~`docs/architecture/adr/` and `adrs/`~~ — resolved 2026-09-26 (Phase 1.0): both archived under `docs/archive/architecture/adr-legacy/`; `DECISIONS.md` is the single decision log |

---

## 9. Dead, placeholder and stale

Reported, not removed: the deprecated `requirements` table ·
`baselines.requirement_version_ids` · `risk.accept` and `baseline.modify`
(hard-denied for every role) · `OidcStepUpReAuth` (always throws) ·
`REQUIREMENT_ORIGINS` values `ORGANIZATION`/`ARTIFACT` (never produced) ·
~~the `validation.approve` doc comment~~ (resolved 2026-09-26, Phase 2.0: the duplicate registry that carried it is removed; `NXD-061`) ·
the disabled Community RBAC dependency · the `aas-asset` template ·
`pilot/oee/GITHUB_LIVE_PROOF_NOT_RUN`.

**Four defects recorded and open** (`DECISIONS.md`, 2026-09-25; two of the
original six were closed the same day):

1. Approval steps carry no `stepNumber` over the API.
2. Re-approving an approved step answers 500.
3. Binding an unapproved URS baseline answers 500 rather than 409.
4. An unknown requirement-set id answers 200.

Defects 2–4 share one root cause: roughly 25 plain `Error` throws in
`urs-composer-backend/src/service.ts`, which `respondError` can only map to 500.

---

## 10. Gap classification

**Foundation** — no test/evidence entity · `traceability_links` without
referential integrity · AI drafts not persisted · untyped errors.

**Lifecycle** — Stage 3 absent · four unequal creation doors · no deployment ·
`/compose` cannot generate custom compositions · the Composer name collision.

**Traceability** — `VERIFIED_BY` has no producer · the gate ignores
`getRequirementCoverage` · no GitHub webhooks · no Component→Repository map.

**Compliance** — `memory` is the shipped default · no `reason` on the product
audit · product test evidence not captured · no Hybrid GMP level · Community
RBAC disabled.

**Experience** — hard-coded GitHub org · unnumberable approval steps ·
200 on unknown ids · documentation sprawl.

**Future** — AI Test Coordinator · AI GMP Impact Agent · Marketplace
install/update · artifact upgrades · OIDC step-up.

---

## 11. MVP1 boundary

Already satisfied: approved UAS · UAS→Product · components · repository
mechanism · release-readiness gate.

Required to complete a coherent MVP1, in dependency order:

1. `nexora:product:create` in every publishing template
2. **a Test / TestExecution entity with evidence ingestion**
3. **automated `VERIFIED_BY` production from ingested results**
4. **validated references on `traceability_links`**
5. **the release gate consuming `getRequirementCoverage`**
6. persisted AI spec drafts
7. typed errors
8. PostgreSQL by default, or a loud refusal in memory mode
9. `reason` and `entity_version` on `composer_audit_events`
10. the Composer name collision resolved
11. a minimal Stage 3 — FS derived from UAS, linked to components
12. one E2E spec for URS → Product → Release

Items **2–5 are the critical path**.

Explicitly **not** MVP1: Marketplace install/configure/update, artifact
upgrade automation, AI Test Coordinator, AI GMP Impact Agent, deployment and
runtime operation, OIDC step-up, Hybrid GMP classification.

---

## 12. Open decisions

1. ~~Backstage's role~~ — **closed 2026-09-26: Backstage remains the kernel.**
2. Community RBAC — ratify the deviation, or open a Backstage-side workstream?
3. "Composer" — rename `/compose`, rename the domain, or merge?
4. `memory` default — change it, or refuse to boot with permissions enabled?
5. Where does test evidence come from — webhook, CI push, or artefact upload?
6. Does the Validation Expert generalise from the platform to customer
   products, or does a second product-scoped subsystem belong beside it?
7. Should `ProductComponent` become instantiable from an `Artifact`?
8. Is a `Hybrid`/`Shared` GMP classification required?
9. The four open defects — fold into the evidence work, or fix as one batch?
10. Stage 3 scope — full FS+TDS+Stories+Tasks, or an FS-only bridge?
