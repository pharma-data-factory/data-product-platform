# CURRENT IMPLEMENTATION STATUS

**Assessment type:** AS-IS technical due diligence (non-destructive)  
**Assessment date:** 2026-08-23  
**Repository:** `data-product-platform` (`pharma-data-factory/data-product-platform`)  
**Branch:** `main`  
**Commit SHA (HEAD):** `6e8318a093da871a665df92c2ac004d895a49b1f`  
**Working tree:** **DIRTY** — ~70 changed/untracked paths (includes untracked `plugins/validation-expert*`, `plugins/plugin-directory*`)  
**Assessor role:** Principal Software Architect / Backstage Platform Engineer / QA Lead / Technical Due-Diligence Auditor  

**Scope note:** Conclusions are based on repository inspection, local process probes, and executed tests. Documentation claims are treated as claims, not proof. No product code was modified during this assessment (only this assessment package under `docs/assessment/`).

---

## Overall Verdict

| Field | Value |
| --- | --- |
| Status | **PILOT READY WITH CONDITIONS** |
| Confidence | **MEDIUM–HIGH** for Platform Core + official Golden Path *content*; **MEDIUM** for full Control Plane UI; **LOW** for Validation Expert / Plugin Directory as product features (present in working tree, **not in HEAD**) |
| Repository commit | `6e8318a093da871a665df92c2ac004d895a49b1f` |
| Assessment date | 2026-08-23 |
| Product validation status (authoritative in-repo) | **`NOT_VALIDATED`** (`validation/baseline/BASELINE.yaml`) |
| Technical MVP claim (docs) | `TECHNICAL_MVP_COMPLETE` (`docs/mvp-1.0-baseline.md`) — **PARTIAL confirmation** for engineering MVP, not GxP |

---

## Executive Summary

Nexora is a Backstage 1.53.0 monorepo (`yarn@4.13.0`, Node 22/24) implementing a Control Plane (catalog, scaffolder, marketplace, data products, entitlements, Nexora industrial plugins) plus three official Golden Path templates whose **generated application content** builds/tests locally. Backend health was verified on the developer instance (`http://127.0.0.1:7007/.backstage/health/v1/liveness` → `{"status":"ok"}`) and on the Platform Core RC2 validation Compose stack (`:7008` → ok). Frontend on `:3000` was **not reachable** during this assessment (`NOT VERIFIED`). Authentication is Guest (development) + GitHub OAuth; production/docker configs forbid Guest. Authorization is a real permission policy (RBAC + commercial entitlement AND) with unit tests passing. Persistence is SQLite locally and PostgreSQL in Compose/validation stacks; AAS is explicitly in-memory prototype. Validation Expert and Plugin Directory exist as substantial WIP in the dirty working tree and respond on local `/api/*/health`, but are **untracked relative to HEAD** and must not be treated as released platform features. No true automated E2E (developer → scaffold → GitHub → running service) was executed. CSV Phase 0 may proceed **with conditions** (freeze baseline commit, exclude WIP plugins, keep `NOT_VALIDATED`).

---

## 1. Repository Baseline

| Item | Evidence |
| --- | --- |
| Remote | `origin` → `https://github.com/pharma-data-factory/data-product-platform.git` |
| Branch vs remote | `main...origin/main [ahead 7]` |
| Package manager | Yarn 4.13.0 (Corepack), workspaces `packages/*`, `plugins/*` |
| Node | engines `22 \|\| 24`; observed `v22.12.0` |
| Backstage | `backstage.json` → `1.53.0` |
| Python | 3.11.9 observed; templates require `>=3.12` (env mismatch risk for some GP content) |
| Docker | Docker 29.5.3 observed; Compose files present |
| Database | Local: `better-sqlite3` → `.sqlite/` (gitignored). Compose/validation: PostgreSQL 16 |
| Reproducibility | **PARTIAL** — committed state is reproducible with `.env.example` + yarn; **local-only** `.env`, GitHub App secrets, dirty WT plugins |
| Local-only deps | `.env`, GitHub OAuth/App credentials, running unrelated host containers, validation Compose image `platform-core:1.0-rc2` |

### Finding — Dirty tree vs released HEAD

```text
Finding:
Validation Expert and Plugin Directory are wired in the working tree but not present under HEAD plugins/.

Evidence:
git ls-tree HEAD:plugins → data-products*, entitlements-backend, marketplace, nexora-*
git status → ?? plugins/validation-expert/ ?? plugins/plugin-directory/
packages/backend/src/index.ts (WT) imports validation-expert-backend + plugin-directory-backend

Status:
IMPLEMENTED_IN_WORKING_TREE_NOT_IN_HEAD
```

---

## 2. Component Inventory

| ID | Name | Location | Purpose | Technology | Runtime | Persistence | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| COMP-001 | Backstage App (frontend) | `packages/app` | Control Plane UI | React/TS Backstage new frontend | Node/webpack | none | partial module tests | **IMPLEMENTED_NOT_VERIFIED** (port 3000 down) |
| COMP-002 | Backstage Backend | `packages/backend` | API host | Node Backstage backend-defaults | Node :7007 | SQLite/Postgres | permission tests PASS | **IMPLEMENTED_AND_VERIFIED** (health) |
| COMP-003 | Platform common | `packages/platform-common` | Roles, permissions, entitlements helpers | TS library | N/A | file audit helpers | 110 tests PASS | **IMPLEMENTED_AND_VERIFIED** |
| COMP-004 | Marketplace FE | `plugins/marketplace` | Golden Path discovery UI | React | browser | static/catalog | unit tests present | **IMPLEMENTED_NOT_VERIFIED** (UI) |
| COMP-005 | Data Products FE/BE | `plugins/data-products*` | DP views, CI status, certification overlay | React + backend plugin | Node | JSON overlays + catalog | many unit tests | **IMPLEMENTED_NOT_VERIFIED** (API auth) |
| COMP-006 | Entitlements BE | `plugins/entitlements-backend` | Commercial entitlement / create authorize | backend plugin | Node | config + optional file store | router tests | **IMPLEMENTED_NOT_VERIFIED** (runtime) |
| COMP-007 | Nexora industrial | `plugins/nexora-*` | Equipment/contracts/quality UI + industrial API | React + BE | Node | mock/remote | unit tests | **PARTIAL** (mock default) |
| COMP-008 | AAS adapter | `plugins/aas-backend` | AAS prototype API | backend plugin | Node | **IN MEMORY** | unit tests | **PROTOTYPE** |
| COMP-009 | Validation Expert | `plugins/validation-expert*` | Validation workbench | React + BE | Node | validation/ MD + JSON runs | unit PASS (WT) | **PARTIAL / WIP** (not in HEAD) |
| COMP-010 | Plugin Directory | `plugins/plugin-directory*` | Admin plugin inventory | React + BE | Node | FS scan | unit PASS (WT) | **PARTIAL / WIP** (not in HEAD) |
| COMP-011 | Official GP templates | `templates/{mqtt-temperature,rest-equipment,oee}-product` | Golden Paths | FastAPI Python | generated services | app-local | pytest PASS | **CONTENT VERIFIED**; scaffold/publish **NOT TESTED** |
| COMP-012 | Supporting templates | python/node/mqtt-connector/UNS/machine-state/aas | Non-official scaffolds | mixed | generated | varies | mixed | **PARTIAL** / AAS **LEVEL 0** |
| COMP-013 | Platform components | `platform-components/` | Wave 1 building blocks | Python services | Docker | component-local | present in tree | **IMPLEMENTED_NOT_VERIFIED** (this run) |
| COMP-014 | Catalog entities | `catalog/` | Systems/components/samples | YAML | catalog backend | file → DB | none | **IMPLEMENTED_NOT_VERIFIED** (401 without auth) |
| COMP-015 | Validation package | `validation/` | URS/protocols/evidence/baseline | Markdown/YAML | Validation Expert | files | IQ evidence docs | **STATIC CONFIG + EVIDENCE** |
| COMP-016 | CI workflows | `.github/workflows/` | lint/tsc/test/image | GHA | GitHub | N/A | YAML exists | **IMPLEMENTED_NOT_VERIFIED** (Actions not re-run here) |
| COMP-017 | Docker Compose | `docker-compose.yml`, `docker-compose.validation.yml`, production | Local/pilot stacks | Docker | containers | Postgres volumes | healthchecks | **PARTIAL** — validation stack **VERIFIED** healthy |
| COMP-018 | Pilot OEE harness | `pilot/oee` | Local industrial demo | compose | containers | local | present | **DEMO / PARTIAL** |

---

## 3. Backstage Core

### Frontend

| Check | Result | Evidence |
| --- | --- | --- |
| Application starts | **NOT VERIFIED** | `Invoke-WebRequest http://127.0.0.1:3000` connection refused |
| Routes / nav / plugins render | **NOT VERIFIED** | Requires running app |
| Critical browser errors | **UNKNOWN** | No browser session |

### Backend

| Check | Result | Evidence |
| --- | --- | --- |
| Backend starts | **PASS** (developer WT) | Liveness `{"status":"ok"}` on `:7007` |
| RC2 validation image | **PASS** | Compose service healthy; liveness on `:7008` |
| Catalog API | **AUTH REQUIRED** | `/api/catalog/entities` → **401** (expected with `permission.enabled`) |
| Plugin health | **PASS** (WT) | `/api/validation-expert/health`, `/api/plugin-directory/health` → ok |
| Critical startup errors | **NOT OBSERVED** on health path | Full log review not performed |

### Catalog

Locations configured in `app-config.yaml` (entities, samples, industrial, platform-components, org, all templates). Runtime entity load **NOT VERIFIED** without authenticated session. Sample/demo entities are co-located under `catalog/samples/` and loaded by default in base config → **not isolated from local discovery**.

---

## 4. Authentication

| Provider | Configured | Verified login | Notes |
| --- | --- | --- | --- |
| Guest | Yes (`app-config.yaml`, development) | **NOT VERIFIED** (no UI) | Explicitly development-only; production/docker forbid Guest |
| GitHub OAuth | Yes (`AUTH_GITHUB_*`) | **NOT VERIFIED** this session | Required for production-like Compose |
| Google | No | N/A | — |

**Answers:**

1. Can a user log in? **LIKELY YES in prior RC2 IQ context; NOT RE-VERIFIED in UI this assessment.** Backend auth module registered.  
2. Which provider works? **Guest intended for local; GitHub for non-dev.**  
3. Is Guest still enabled? **YES in default `app-config.yaml`; NO in production/docker overlays.**  
4. Production-ready auth? **PARTIAL** — GitHub configured; Guest must stay off in prod (documented).  
5. Secrets loaded securely? **YES pattern** — `${ENV}` + `.env` gitignored; examples only committed.  
6. Credentials committed? **No private keys found in `git ls-files` secret-name scan**; `.env` ignored. **Do not print secrets.**

`AUTHENTICATION WORKS` — **IMPLEMENTED_NOT_VERIFIED** (UI login not re-tested).  
`AUTHORIZATION WORKS` — **IMPLEMENTED_AND_VERIFIED** at unit/policy layer (see §5).

---

## 5. Authorization / RBAC

| Aspect | Status | Evidence |
| --- | --- | --- |
| Permission framework enabled | YES | `app-config.yaml` `permission.enabled: true` |
| Custom policy | YES | `packages/backend/src/permission/policy.ts` — RBAC + entitlement AND |
| Roles | YES | VIEWER / DEVELOPER / DATA_PRODUCT_OWNER / PLATFORM_ADMIN (`platform-common`) |
| Scaffolder gating | YES | Create permissions + release/entitlement checks |
| Unit tests | **PASS** | `policy.test.ts` 11/11; `platform-common` 110/110 |

Guest is a **development fallback** with limited local Golden Path access (test name). Unknown GitHub users do **not** get implicit Viewer (policy test).

---

## 6. Software Catalog Reality

| Class | Examples | Isolation |
| --- | --- | --- |
| Platform / Wave 1 components | `platform-components/` | Loaded via catalog location |
| Official Golden Path templates | mqtt/rest/oee template.yaml | Loaded as Template entities |
| Samples / industrial demos | `catalog/samples/*` | **Loaded in default config** — not production-isolated |
| Org users/groups | `catalog/org.yaml` | Required for Guest/GitHub resolvers |

Catalog accuracy: **partial** — mixes production-shaped platform entities with samples.

---

## 7. Golden Paths

### Level rubric (this assessment)

Per audit brief: Level 0 template → Level 5 production-ready. **No level awarded without evidence.** Scaffolding via Backstage UI/API was **not** executed here.

| ID | Name | Location | Official? | Content tests | Scaffold | GitHub publish | Deploy | Level (evidence) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GP-001 | MQTT Temperature | `templates/mqtt-temperature-product` | YES | **44 PASS** | NOT TESTED | NOT TESTED | NOT TESTED | **≤2** |
| GP-002 | REST Equipment | `templates/rest-equipment-product` | YES | **48 PASS** | NOT TESTED | NOT TESTED | NOT TESTED | **≤2** |
| GP-003 | OEE Data Product | `templates/oee-data-product` | YES (commercial FUTURE) | **75 PASS** | NOT TESTED | NOT TESTED | NOT TESTED | **≤2** |
| GP-004 | Python microservice | `templates/python-service` | NO | NOT TESTED | NOT TESTED | template has publish | NOT TESTED | **0–1** |
| GP-005 | Node microservice | `templates/node-service` | NO | NOT TESTED | NOT TESTED | template has publish | NOT TESTED | **0–1** |
| GP-006 | MQTT connector | `templates/mqtt-connector` | NO | NOT TESTED | NOT TESTED | template has publish | NOT TESTED | **0–1** |
| GP-007 | Machine state consumer | `templates/machine-state-consumer` | NO (composition) | NOT TESTED | NOT TESTED | yes in template | NOT TESTED | **0–1** |
| GP-008 | Unified namespace | `templates/unified-namespace` | NO / DEVELOPMENT | NOT TESTED | NOT TESTED | yes | NOT TESTED | **0–1** |
| GP-009 | AAS asset | `templates/aas-asset` | NO / DEVELOPMENT | no content app | debug:log only | NO | NO | **0** |

Docs claim official GPs **CERTIFIED / RELEASED** (`docs/mvp-1.0-baseline.md`). That is a **product certification label**, not GxP validation, and not re-proven by scaffolder→GitHub E2E in this audit.

### Golden Path matrix

| Golden Path | Scaffold | Build | Tests | GitHub Publish | Catalog | Docker | Deployment | Level |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| MQTT Temperature | NOT TESTED | NOT TESTED | **PASS** (44) | NOT TESTED | PARTIAL (location configured) | PARTIAL (Dockerfile present) | NOT TESTED | **2**\* |
| REST Equipment | NOT TESTED | NOT TESTED | **PASS** (48) | NOT TESTED | PARTIAL | PARTIAL | NOT TESTED | **2**\* |
| OEE | NOT TESTED | NOT TESTED | **PASS** (75) | NOT TESTED | PARTIAL | PARTIAL | NOT TESTED | **2**\* |
| Python / Node / MQTT connector / UNS / Machine state | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | NOT TESTED | **0–1** |
| AAS | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | NOT APPLICABLE | **0** |

\*Level 2 = template *content* verified as an application; Level 1 scaffolder path not re-verified.

---

## 8. Custom Plugins (maturity)

| Plugin | FE | BE | Registered (WT) | In HEAD | Maturity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Marketplace | Y | N | Y | Y | **PLUGIN-M3/M4** | Static + catalog; tested |
| Data Products | Y | Y | Y | Y | **PLUGIN-M4** | Strongest custom feature |
| Entitlements | app module | Y | Y | Y | **PLUGIN-M3/M4** | Local + optional AWS |
| Nexora assets/contracts/quality | Y | via nexora-backend | Y | Y | **PLUGIN-M2/M3** | Mock industrial default |
| Nexora backend | N | Y | Y | Y | **PLUGIN-M3** | Mock/remote |
| AAS | app module | in-tree | Y | Y | **PLUGIN-M2** | In-memory prototype |
| Validation Expert | Y | Y | Y (WT) | **N** | **PLUGIN-M3** (WT only) | File persistence; NOT_VALIDATED |
| Plugin Directory | Y | Y | Y (WT) | **N** | **PLUGIN-M3** (WT only) | Inventory only; no install lifecycle |

---

## 9. Validation Expert (dedicated)

**Product validation status must remain `NOT_VALIDATED`** — confirmed in `validation/baseline/BASELINE.yaml` and `plugins/validation-expert/plugin.yaml`.

| Capability | UI | API | Persistence | E2E verified |
| --- | --- | --- | --- | --- |
| Overview | EXISTS (WT) | EXISTS | validation artifacts | NO |
| Requirements | EXISTS | EXISTS | MD parsers | NO |
| Traceability | EXISTS | EXISTS | MD | NO |
| Risks | EXISTS (read) | EXISTS | MD; accept unavailable | NO |
| Protocols IQ/OQ/UAT | EXISTS | EXISTS | MD | NO |
| Test runs | EXISTS | EXISTS | `runs-store.json` | NO (unit only) |
| Evidence | EXISTS | EXISTS | file index | NO |
| Findings | EXISTS | EXISTS | on FAIL path | NO |
| Approval / e-sign | NOT PRESENT | NOT PRESENT | N/A | N/A |
| Audit trail (Part 11) | NOT PRESENT | Partial executor fields | Partial | NO |
| Versioning | NOT PRESENT | health version only | N/A | N/A |

Unit tests executed (WT): backend 9 PASS; frontend 24 PASS.

---

## 10. Plugin Directory / Plugin Store

**Working tree:** inventory UI + backend FS discovery (`/api/plugin-directory/health` ok).  
**Install/enable/disable lifecycle:** **NOT IMPLEMENTED**.  
**HEAD release:** **NOT IMPLEMENTED** (packages untracked).  
Do not describe as a Plugin Store.

---

## 11. API Inventory (custom / notable)

| API | Method | Endpoint | Implementation | Auth | Persistence | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Backstage liveness | GET | `/.backstage/health/v1/liveness` | core | none | N/A | probe | **VERIFIED** |
| Catalog entities | GET | `/api/catalog/entities` | core | required | DB | probe 401 | **VERIFIED gated** |
| Validation Expert health | GET | `/api/validation-expert/health` | WT plugin | open | N/A | probe + unit | **VERIFIED** (WT) |
| Validation Expert overview+ | GET/POST | `/api/validation-expert/*` | WT | permissioned | files/JSON | unit | **IMPLEMENTED_NOT_VERIFIED** (HTTP) |
| Plugin Directory health | GET | `/api/plugin-directory/health` | WT | open | N/A | probe | **VERIFIED** (WT) |
| Data products | GET/POST | `/api/data-products/*` | HEAD | permissioned | overlays | unit | **IMPLEMENTED_NOT_VERIFIED** |
| Entitlements | GET/POST | `/api/entitlements/*` | HEAD | permissioned | config/file | unit | **IMPLEMENTED_NOT_VERIFIED** |
| Nexora industrial | GET | `/api/nexora-industrial/*` | HEAD | permissioned | mock | unit | **MOCK DEFAULT** |
| AAS | CRUD | `/api/aas/*` | HEAD | permissioned | memory | unit | **PROTOTYPE** |

Dead/placeholder: AAS production persistence; Plugin Store install APIs; Validation approve APIs (permissions reserved/denied).

---

## 12. Persistence — what survives restart?

| Feature | Class | Survives restart? |
| --- | --- | --- |
| Catalog (SQLite/Postgres) | PERSISTENT | YES (if same DB volume/file) |
| Scaffolder tasks | PERSISTENT (DB) | YES |
| Entitlement config map | STATIC CONFIG | YES (config) |
| Create-authorization audit JSONL | PERSISTENT (file) | YES if path mounted |
| Validation runs store | PERSISTENT (JSON file, WT) | YES if file kept |
| Validation baseline/protocols | STATIC CONFIG | YES |
| AAS repository | IN MEMORY | **NO** |
| Nexora industrial mock | IN MEMORY / fixtures | effectively NO |
| Guest sessions | session/token | ephemeral |

---

## 13. CI/CD

| Capability | Present in YAML | Verified this assessment |
| --- | --- | --- |
| Lint | `.github/workflows/ci.yml` | NOT TESTED (GHA) |
| `yarn tsc` | yes | NOT TESTED full |
| Unit tests | `yarn test:all` | **PARTIAL** — selected packages PASS |
| Image build/push GHCR | on main push | NOT TESTED |
| GP template CI | per-template workflows | NOT TESTED on GitHub |
| E2E Playwright | `test:e2e` + config | **NOT EXECUTED** |
| Vuln scanning | limited / template pip-audit | NOT TESTED |

---

## 14. Test Reality Check

| Metric | Value |
| --- | --- |
| Discovered Jest/TS test files (approx.) | ~130 |
| Executed this assessment | platform-common 110; permission 11; validation-expert BE 9; FE 24; plugin-directory BE 6; MQTT/REST/OEE pytest 44+48+75 |
| Passed | **All executed suites above PASS** |
| Failed | **0** (executed set) |
| Skipped | N/A |
| Could not execute | Full `yarn test:all`, Playwright E2E, scaffolder E2E, authenticated catalog/API matrix, Docker image rebuild |

```text
Total discovered: ~130 TS test files + multiple Python suites in templates
Executed:        selected (~327 individual assertions/tests across suites)
Passed:          all executed
Failed:          0
Skipped:         unknown in full suite
Could not execute: full monorepo + E2E + publish paths
```

---

## 15. E2E Boundary

**CURRENT VERIFIED E2E BOUNDARY:**  
Unit/service tests + Golden Path *template content* pytest + backend health probes (+ optional RC2 Compose liveness).

**No verified automated path:** Developer → Backstage UI → Scaffolder → GitHub repo → Actions → running service.

True E2E: **NOT PRESENT / NOT VERIFIED**.

---

## 16. Docker / Hosting

| Question | Answer |
| --- | --- |
| Start complete platform from repo? | **PARTIAL** — Compose + Dockerfiles exist; full cold start not re-run |
| Documented startup? | YES — README / `docs/operations/pilot-runbook.md` / validation compose comments |
| Persistence configured? | YES — Postgres volumes in Compose; audit volume |
| Secrets externalized? | YES — env vars / `.env.example` |
| Deployment reproducible? | **PARTIAL** — depends on secrets + image tags |
| Production-image boot verified? | **PARTIAL** — RC2 validation stack healthy on `:7008` |

---

## 17. Security Reality Check

| Topic | Finding |
| --- | --- |
| Committed secrets | No credential files in tracked set (name scan); `.env` gitignored |
| Auth defaults | Guest on in development — **P1** if mis-deployed |
| Authorization | Enabled + tested |
| AAS / mocks | Insecure to treat as production data |
| API exposure | Permissioned routes return 401 without auth (observed) |
| CORS | Dev allows localhost patterns |
| Logging secrets | Not audited exhaustively — **UNKNOWN** residual risk |

---

## 18. Documentation vs Implementation

| Claim | Documentation | Implementation Evidence | Verdict |
| --- | --- | --- | --- |
| TECHNICAL_MVP_COMPLETE | `docs/mvp-1.0-baseline.md` | GP content tests + backend + plugins in HEAD | **PARTIAL** |
| Official GPs CERTIFIED/RELEASED | same | Content strong; scaffolder/publish E2E not re-verified | **PARTIAL** |
| GxP NOT VALIDATED | baseline + MVP docs | `validation_status: NOT_VALIDATED` | **CONFIRMED** |
| PILOT_READY_WITH_CONDITIONS | MVP baseline | Aligns with gaps (auth ops, commercial blocked, dirty WT) | **PARTIAL** |
| Validation Expert product feature | design/WIP docs | Untracked plugins; functional WT | **OUTDATED / AHEAD OF HEAD** |
| AAS production capability | architecture mentions future | Memory prototype warning in code | **OUTDATED DOCUMENTATION** if implied ready |
| Guest forbidden in production | docker/production config | Config evidence | **CONFIRMED** |

---

## 19. GxP / CSV Technical Readiness (not compliance)

| Area | Rating |
| --- | --- |
| Deterministic builds | PARTIAL |
| Version control | READY |
| Requirements baseline | READY (`BASELINED`, NOT_VALIDATED) |
| Architecture documentation | PARTIAL |
| Testability | PARTIAL |
| Automated testing | PARTIAL |
| Identity | PARTIAL |
| Authorization | PARTIAL→READY (policy) |
| Audit trail | PARTIAL (create-auth audit); Part 11 NOT READY |
| Change control | PARTIAL (dirty tree risk) |
| Traceability | PARTIAL (validation package + tool) |
| Evidence generation | PARTIAL |
| Configuration management | PARTIAL |
| Backup/restore | UNKNOWN / NOT READY |
| Release management | PARTIAL |

**Do not claim regulatory compliance.**

---

## 20. Technical Debt

### P0 — BLOCKER

1. **Uncommitted Validation Expert / Plugin Directory treated as product**  
   - Evidence: untracked `plugins/validation-expert*`, `plugins/plugin-directory*`  
   - Impact: non-reproducible “current” platform; false CSV scope  
   - Remediation: commit+release **or** remove from runtime wiring before baseline freeze  

2. **Dirty main ahead of origin with mixed WIP**  
   - Evidence: `ahead 7` + ~70 WT changes  
   - Impact: unclear validated configuration identity  
   - Remediation: freeze RC tag from clean tree; park WIP branches  

### P1 — HIGH

3. Frontend availability not verified (`:3000` down)  
4. No verified scaffolder→GitHub Golden Path E2E in this audit  
5. Guest auth enabled in default config — production footgun  
6. Sample catalog entities loaded by default  
7. AAS in-memory prototype discoverable as platform capability  
8. Python 3.11 host vs template `requires-python >=3.12` drift  

### P2 — MEDIUM

9. Nexora industrial mock mode default  
10. Playwright E2E not executed / weak true E2E  
11. Full `yarn test:all` / `yarn tsc` not re-run this session  
12. Commercial marketplace/AWS paths incomplete by design  

### P3 — LOW

13. Naming drift across docs (Nexora / Nexora / PDF)  
14. Multiple Compose files with overlapping purposes  

---

## 21. Product Maturity Scorecard

| Area | Maturity % | Confidence | Main Gap |
| --- | ---: | --- | --- |
| Platform Core | 70 | High | UI session not re-verified |
| Backstage | 75 | High | Frontend down this run |
| Authentication | 55 | Medium | Login not re-tested |
| Authorization | 70 | High | Runtime matrix limited |
| Catalog | 60 | Medium | 401; samples mixed in |
| Golden Paths | 65 | Medium–High | Scaffold/publish E2E missing |
| Plugins | 60 | Medium | Industrial mock; WIP plugins |
| Validation Expert | 35 | Medium | Not in HEAD; no approval/CSV |
| Testing | 55 | Medium | No true E2E executed |
| E2E | 15 | High | Boundary = unit + content tests |
| Deployment | 50 | Medium | RC2 compose ok; full prod unknown |
| Security | 55 | Medium | Guest default; scope isolation |
| CSV Readiness | 40 | High | NOT_VALIDATED; freeze needed |

---

## 22. Overall Product Status Decision

**Chosen:** `PILOT READY WITH CONDITIONS`

**Why:** HEAD Platform Core + official Golden Path *content* and RBAC/entitlement design are beyond a mere prototype and match the repo’s own `TECHNICAL_MVP_COMPLETE` / pilot-with-conditions narrative. Conditions: clean/freeze configuration identity; GitHub OAuth correctly configured; Guest off for shared environments; do not include untracked Validation Expert/Plugin Directory in pilot scope; AAS/UNS/mocks out of scope; commercial distribution remains blocked; GxP remains `NOT_VALIDATED`.

Not `PRODUCTION READY` — commercial block, validation status, E2E gaps, prototypes.  
Not `MVP WITH MAJOR GAPS` alone — understates verified GP content and RC2 stack evidence.

---

## 23. What Actually Works Today (verified)

- Backend liveness on developer port 7007 and validation Compose 7008  
- Permission policy unit behavior (RBAC + entitlement AND + audit recording tests)  
- `platform-common` unit suite (110)  
- Official GP template content tests: MQTT 44, REST 48, OEE 75  
- Validation Expert / Plugin Directory **health + unit tests in working tree**  
- Secret hygiene pattern (examples only tracked)  

### Implemented but not verified

- Frontend pages/navigation  
- Guest/GitHub interactive login  
- Catalog entity listing with auth  
- Scaffolder generate + GitHub publish  
- Data Products / Entitlements HTTP with real tokens  
- Full CI on GitHub Actions  
- Docker image rebuild  

### Partial / prototype

- Nexora industrial (mock)  
- AAS (memory)  
- Validation Expert (WT, no approval, NOT_VALIDATED)  
- Plugin Directory (inventory only, WT)  
- Entitlements AWS path  

### Broken / unavailable this run

- Frontend `:3000` connection refused  

### Missing

- True E2E automation of Golden Path publish  
- Part 11 / approval workflow  
- Plugin install lifecycle  
- Production AAS persistence  
- GxP validated state  

---

## 24. Validation Phase 0 Decision

**Decision:** `START PHASE 0 WITH CONDITIONS`

**Why:** A requirements baseline already exists (`BASELINED`, `NOT_VALIDATED`) and RC2 IQ evidence/Compose exist — Phase 0 is appropriate for Platform Core **if** the configuration under test is a clean, tagged commit without untracked plugin surface area, and Validation Expert remains explicitly out of validated scope until released.

**Conditions:**

1. Freeze assessment on a clean git tag (no dirty Validation Expert/Plugin Directory unless intentionally baselined).  
2. Keep authoritative `validation_status: NOT_VALIDATED`.  
3. Exclude AAS, UNS, marketplace commercial, AWS Marketplace from Phase 0 scope.  
4. Record Guest-off and GitHub-on for any hosted IQ/OQ environment.  
5. Do not generate URS in this assessment (per brief).  

---

## 25. Top 10 Next Actions

### Must happen before Phase 0 baseline

| # | Priority | Action | Why | Effort | Dependency | Validation relevance |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Branch/commit or remove WT Validation Expert & Plugin Directory from release identity | Reproducible baseline | M | product decision | High |
| 2 | P0 | Create annotated release tag from clean tree matching IQ evidence | Configuration identity | S | #1 | High |
| 3 | P1 | Re-verify frontend boot + Guest/GitHub login smoke | Prove Control Plane UX | S | running app | High |
| 4 | P1 | Authenticated catalog + scaffolder dry-run of one official GP (no publish) | Prove Level 1 | M | auth | High |
| 5 | P1 | Production overlay check: Guest disabled, permissions on | AuthZ baseline | S | deploy config | High |

### Can happen after baseline

| # | Priority | Action | Why | Effort | Dependency | Validation relevance |
| ---: | --- | --- | --- | --- | --- | --- |
| 6 | P1 | One official GP GitHub publish + Actions green (controlled) | Raise GP to Level 3 | L | GitHub App | Medium |
| 7 | P2 | Run full `yarn test:all` + Playwright smoke | Coverage honesty | M | CI time | Medium |
| 8 | P2 | Isolate sample catalog from pilot discovery | Reduce noise/risk | M | catalog config | Medium |
| 9 | P2 | Decide Validation Expert v0.1 release scope (read-only vs runs) | Avoid scope creep | M | #1 | High later |
| 10 | P3 | Align Python toolchain to 3.12 for GP content | Reproducible pytest | S | devops | Low |

---

## 26. Recommended Next Milestone

**Freeze Platform Core RC2/RC3 clean-tag baseline and execute Phase 0 configuration identification + smoke IQ against that tag — excluding Validation Expert / Plugin Directory / AAS from validated scope.**

---

## Appendix A — Commands executed (selected)

```text
git rev-parse HEAD / git status -sb / git remote -v
node -v; yarn -v; docker -v; python --version
Invoke-WebRequest http://127.0.0.1:7007/.backstage/health/v1/liveness
Invoke-WebRequest http://127.0.0.1:7008/.backstage/health/v1/liveness
Invoke-WebRequest http://127.0.0.1:7007/api/catalog/entities  → 401
Invoke-WebRequest http://127.0.0.1:7007/api/validation-expert/health → ok
Invoke-WebRequest http://127.0.0.1:7007/api/plugin-directory/health → ok
Invoke-WebRequest http://127.0.0.1:3000 → connection refused
yarn workspace @internal/platform-common test --watchAll=false → 110 passed
yarn workspace backend test --watchAll=false permission → 11 passed
yarn workspace @internal/plugin-validation-expert-backend test → 9 passed
yarn workspace @internal/plugin-validation-expert test → 24 passed
yarn workspace @internal/plugin-directory-backend test → 6 passed
python -m pytest (mqtt/rest/oee template content) → 44/48/75 passed
docker ps → platform-core-validation-* healthy
```

## Appendix B — Explicit non-claims

- No GxP validated status  
- No Part 11 compliance  
- No production AWS Marketplace readiness  
- No verified full Golden Path publish E2E in this assessment  
- Validation Expert is not a released HEAD feature  
