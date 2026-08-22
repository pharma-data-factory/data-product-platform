# Validation Scope — Platform Core

**Document ID:** VAL-SCOPE-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Decision:** DEC-SCOPE-001 ACCEPT  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

This artifact was generated as a PROPOSED validation baseline from repository evidence. Human review and approval are required before it can become part of an approved validation baseline.

This document does not claim the platform is validated, qualified, or GxP compliant. `CERTIFIED` / `RELEASED` are technical product states, not GMP validation.

---

## 1. Objective

Define the **Platform Core** computerized-system boundary for a retrospective validation baseline of the existing Control Plane.

The baseline describes intended Control Plane capabilities already present in the repository. It does not add Golden Paths, change application code, or invent regulatory obligations.

## 2. System under consideration

| Field | Value | Evidence |
| --- | --- | --- |
| Product | Pharma Data Factory (UI brand: Nexora) | `PRODUCT.md`; `data-product-platform/app-config.yaml` (`app.title: Nexora`) |
| System | Platform Core / Control Plane | `ARCHITECTURE.md` §2, §5; `architecture-model.yaml` layer L1 |
| Foundation | Backstage (not forked) | `AGENTS.md` §3; `data-product-platform/packages/backend/src/index.ts` |
| Technical MVP | TECHNICAL_MVP_COMPLETE / 1.0.0 | `data-product-platform/docs/mvp-1.0-baseline.md` |
| Validation status | NOT VALIDATED | `data-product-platform/docs/status-model.md` |
| This baseline | PROPOSED | this document |

## 3. Platform Core boundary (IN SCOPE)

Platform Core is the **single-organization Control Plane** that authenticates users, authorizes actions, catalogs assets, scaffolds repositories, enforces commercial/legal create gates, and displays technical CI status.

| Element | In Platform Core? | Rationale | Evidence |
| --- | --- | --- | --- |
| Backstage host (app + backend packages as configured) | Yes — as configured product | Runtime of the Control Plane | `data-product-platform/packages/app`; `data-product-platform/packages/backend` |
| Custom frontend plugins: marketplace, data-products, nexora-* UI | Yes — product layer | Discover / Data Products / industrial views hosted by Core | `data-product-platform/plugins/` |
| Custom backend plugins: data-products-backend, entitlements-backend, nexora-backend | Yes — product layer | CI status, certification overlay, entitlements, industrial proxy | same |
| `packages/platform-common` | Yes | Shared roles, permissions, entitlements, releases, access policy | `data-product-platform/packages/platform-common` |
| Authentication (GitHub OAuth, Guest policy) | Yes | Identity into the Control Plane | `app-config.yaml`; `packages/platform-common/src/accessPolicy.ts` |
| Authorization / Permission Framework | Yes | RBAC enforcement | `packages/backend/src/permission/policy.ts`; `app-config.yaml` `permission.enabled: true` |
| Entitlement enforcement | Yes | Commercial AND-gate on Create | `packages/platform-common/src/entitlement-service.ts` |
| Legal distribution gate | Yes | Customer-handoff block | `entitlement-service.ts` (`reason: 'LEGAL'`); `app-config.yaml` `legalDistributionStatus` |
| GitHub integration (OAuth + App + CI status read) | Yes — as Control Plane interfaces | Publish and status display | `app-config.github.yaml`; `plugins/data-products-backend/src/githubActions.ts` |
| Catalog | Yes | Entity source of truth for Core | `app-config.yaml` `catalog.locations`; `catalog/` |
| Scaffolder | Yes | Create journey | `@backstage/plugin-scaffolder-backend` in `packages/backend/src/index.ts` |
| CI/CD **integration** (read/display of Actions) | Yes — interface | Quality Gate card | `GET /api/data-products/ci-status` |
| Persistence of Control Plane state | Yes | SQLite local / PostgreSQL hosted | `app-config.yaml`; `app-config.production.yaml`; `docker-compose.yml` |
| Logging available to Core | Yes — as implemented | Catalog logs module; process logs | `plugin-catalog-backend-module-logs` in `index.ts` |
| Entitlement decision recording | Yes — as implemented | In-memory trail | `entitlement-service.ts` `events[]`; `auditTrail()` |
| Marketplace (technical discovery) | Yes | Product discover/create entry | `plugins/marketplace` |
| Developer Hub / Search / TechDocs **as hosted by Core** | Yes | Discover documentation | `packages/app/src/modules/developer-hub`; TechDocs backend |

## 4. Distinctions (must not be collapsed)

### 4.1 Backstage upstream functionality

**Classification:** Software of unknown pedigree (SOUP) / open-source foundation.

In scope: **how Platform Core registers, configures, and constrains** Backstage (auth providers, permission policy module, catalog locations, GitHub scaffolder module).

Out of scope: validating Backstage internals, upstream defects, or the Backstage project itself.

Evidence: `AGENTS.md` §3 “Do not fork Backstage”; `packages/backend/src/index.ts`.

### 4.2 Custom plugins

In scope as **Platform Core product code** (behavior of routes, UI, and policy wiring).

Out of scope: treating plugin `CERTIFIED` labels (none on plugins) as validation.

### 4.3 `packages/platform-common`

In scope. This library **is** the commercial/RBAC/release decision core.

### 4.4 Authentication / authorization / entitlements / legal gates

In scope as Control Plane functions. Legal gate observable behavior is **customer artifact handoff**, not a blanket block of internal Create.

Evidence: `entitlement-service.ts` lines checking `handoff === 'customer'`.

### 4.5 GitHub integration

In scope: credential separation, server-side publish, server-side CI status.

Out of scope: GitHub.com as a validated system; generated-repo Actions as Platform Core OQ (those belong to a future Data Product / Golden Path package).

### 4.6 Catalog and Scaffolder

In scope as Core services. Template **content** (generated source) is not Core.

### 4.7 CI/CD integration vs CI/CD of generated products

| Topic | Scope |
| --- | --- |
| Control Plane workflow that tests/builds the portal | Adjacent evidence candidate; not Data Product validation |
| Reusable `data-product-quality.yml` | **Interface/dependency** only (consumed by generated repos) |
| Execution of a generated product pipeline | **Out of Platform Core** |

### 4.8 Persistence

In scope: Control Plane database choice and configuration (SQLite vs PostgreSQL).

Out of scope: SQLite files inside generated Data Products.

### 4.9 Logging and audit

In scope: what Core actually implements (catalog-logs module; in-memory entitlement events; AAS in-memory audit is **implemented in the process** but **excluded from this baseline** because AAS is DEVELOPMENT / outside MVP 1.0 value).

Out of scope: inventing Part 11, WORM, e-signatures, or ALCOA+ as current URS.

Evidence of exclusion of GxP audit: `validation-gap-analysis.md` §5; `platform-components/operations/audit/catalog-info.yaml` (catalog-only).

### 4.10 Generated Data Products

**OUT OF SCOPE** except as an **interface**: Core must publish a repo and later display catalog/CI metadata. Domain APIs (`/api/v1/oee`, temperature ingest, MES) are not Platform Core.

### 4.11 Golden Paths

**OUT OF SCOPE** as product assets under validation. Templates are **dependencies** of Scaffolder Create (template IDs, release catalog). Official path `CERTIFIED` / `RELEASED` must not be read as GMP validation.

Evidence: `data-product-platform/docs/status-model.md`; `packages/platform-common/src/golden-path-releases.json`.

### 4.12 Pilot harnesses

**OUT OF SCOPE.** `pilot/oee` is a local integration harness. Pilot Exit findings are incorporated as **gaps**, not as Core URS.

Evidence: `data-product-platform/docs/pilot-exit-gate.md`.

### 4.13 Wave 1 libraries

**OUT OF SCOPE** as runtime libraries. They are composed into generated products. Core may catalog them as platform-component entities (Catalog interface only).

Evidence: `data-product-platform/docs/mvp-1.0-baseline.md`; `platform-components/catalog.yaml`.

## 5. Explicit exclusions

The following are **not** in the Platform Core validation baseline:

| Exclusion | Class | Notes |
| --- | --- | --- |
| MQTT Temperature / REST Equipment / OEE template source | Golden Path | Interface via template ID / release only |
| Generated FastAPI/Express services | Data Product instance | Independent runtime |
| Wave 1 Python packages (`pdf-*`) | Foundation libraries | Catalog listing only |
| `uns/` Unified Namespace | DEVELOPMENT | Outside MVP 1.0 value |
| AAS Foundation standalone + Control Plane AAS plugin | DEVELOPMENT / PROTOTYPE | Excluded despite code in `packages/backend/src/aas` |
| Nexora industrial mock/remote as shopfloor truth | Fixture / proxy | UI may remain in Core; live plant data is not Core OQ |
| Machine Metrics, Machine State Consumer | Reference proofs | Not official Golden Paths |
| Intelligence / Kafka / RAG placeholders | PLANNED | Catalog only |
| AWS live Marketplace listing, billing, metering | Commercial FUTURE | Adapter exists; metering returns 501 |
| Multi-tenancy / SaaS tenant isolation | FUTURE | OrganizationContext is single-org |
| Customer Entra ID / OIDC | PLANNED Platform Edition | Not implemented |
| Kubernetes, Neo4j, TimescaleDB | Out of MVP | — |
| Real SAP / Snowflake | Out of MVP | — |
| GxP validation claims, Part 11, IQ/OQ/PQ execution | Out of MVP | Absence is a **compliance gap**, not a silent URS |
| Legal LICENSE/NOTICE counsel approval | Legal | BLOCKED; not a software URS beyond the legal gate |
| `OEE_GITHUB_LIVE_PROOF_NOT_RUN` as a Core requirement | Pilot / Golden Path evidence | Classified in Open-Gaps, not converted to URS |
| Plant MQTT TLS | Pilot / Data Product runtime | Not Core |

## 6. Interfaces and dependencies (in scope as interfaces only)

```text
User ──► Platform Core (auth, RBAC, catalog, scaffolder, entitlements)
              │
              ├── GitHub OAuth (identity)
              ├── GitHub App (publish, optional Actions read)
              ├── PostgreSQL / SQLite (Core state)
              └── Catalog files (entities, org, templates, components)
                    │
                    ▼  (out of Core validation)
              Generated repository / Actions / Data Product runtime
```

## 7. Environments covered by this proposed baseline

| Environment | In proposed IQ/OQ thinking | Evidence |
| --- | --- | --- |
| Local `yarn start` (SQLite, Guest allowed) | Development only; not a production validated env | `app-config.yaml` |
| Docker Compose / hosted (PostgreSQL, Guest forbidden) | Candidate production-pilot profile | `docker-compose.yml`; `app-config.docker.yaml`; `app-config.production.yaml` |
| AWS production | **Not** in baseline | MVP docs: technical-pilot profile, not AWS production |

## 8. Intended use (for URS derivation)

From product docs, Platform Core is intended to let an approved organization:

1. Sign in and obtain a platform role.
2. Discover templates and Data Products (Marketplace, Catalog, Data Products, Docs).
3. Create a repository from an approved template when RBAC, release, entitlement, and (for customer handoff) legal gates pass.
4. See technical certification and CI Quality Gate metadata without treating them as GxP.
5. Administer entitlements and (for owners/admins) technical certification.

Evidence: `PRODUCT.md` §3; `ARCHITECTURE.md` §5–§6, §9; `docs/mvp-1.0-baseline.md`.

## 9. Non-claims

- This scope is not an approved validation master plan.
- Inclusion of a capability does not create a 21 CFR Part 11 requirement.
- Exclusion of Golden Paths does not mean they are untested; they have a **separate** technical certification model.
- Pilot Exit FAIL does not change Technical MVP COMPLETE.

## 10. Baseline freeze

DEC-SCOPE-001 is **ACCEPT**. Golden Path content and generated Data Products remain outside this baseline. OEE live proof remains outside (DEC-OEE-001). Backstage is SOUP (DEC-SOUP-001) and is not itself validated by this project.
