# Validation Scope — CSV Phase 0 (PROPOSED)

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-VS-001 |
| Baseline candidate | **PLATFORM CORE VALIDATION BASELINE 0.1** |
| Status | PROPOSED — **GATE-02 Validation Scope Approval** required |
| Product validation status | **NOT_VALIDATED** |
| Date | 2026-08-23 |
| Inputs | AS-IS assessment; `validation/baseline/BASELINE.yaml` (requirements package, still NOT_VALIDATED) |

---

## 1. Scope hypothesis (adopted as Phase 0 recommendation)

Aligns with the assessment hypothesis and existing requirements baseline exclusions.

### 1.1 Candidate IN_SCOPE (Platform Core Baseline 0.1)

| Component | Classification | Rationale |
| --- | --- | --- |
| Platform Core / Control Plane identity | IN_SCOPE | Validation object |
| Backstage frontend (`packages/app`) | IN_SCOPE | User interface for intended use |
| Backstage backend (`packages/backend`) | IN_SCOPE | Control Plane runtime |
| Authentication (GitHub OAuth; Guest policy) | IN_SCOPE | Access control foundation |
| Authorization / permission framework | IN_SCOPE | RBAC enforcement |
| Permission policy (`platform-common` + backend policy) | IN_SCOPE | Deterministic allow/deny |
| Software Catalog (engine + non-sample locations) | IN_SCOPE | Discovery of governed assets |
| Scaffolder engine | IN_SCOPE | Creation pathway |
| Platform configuration / overlays for frozen env | IN_SCOPE | Configuration identity |
| Core persistence (SQLite/Postgres for Backstage) | IN_SCOPE | State required for catalog/auth/scaffolder |
| Technical GitHub integration for auth + publish | IN_SCOPE | Required for intended create flow |
| Entitlements (create/commercial gate) | IN_SCOPE *(access control)* | Coupled to create authorization in AS-IS |
| Marketplace (template discovery UI) | IN_SCOPE *(discovery only)* | Entry to Golden Paths; not commerce |
| Data Products plugins (metadata / CI status display) | IN_SCOPE *(technical metadata)* | Part of Control Plane; statuses ≠ GxP validation |

### 1.2 Candidate OUT_OF_SCOPE (Baseline 0.1)

| Component | Classification | Rationale |
| --- | --- | --- |
| Validation Expert | OUT_OF_SCOPE | Untracked WIP; not in HEAD; not required for Intended Use 0.1 |
| Plugin Directory | OUT_OF_SCOPE | Untracked WIP; inventory only; no install lifecycle |
| AAS adapter + `aas-asset` template | OUT_OF_SCOPE | In-memory prototype / Level 0 |
| Nexora industrial mock as operational capability | OUT_OF_SCOPE | Mock default; not plant connectivity |
| OEE commercial functionality | OUT_OF_SCOPE | Documented FUTURE commercial |
| Experimental / demo / sample catalog entities | OUT_OF_SCOPE | Must be isolated from validated discovery set |
| Pilot harnesses (`pilot/`) | OUT_OF_SCOPE | Demo/integration aids |
| Unified Namespace as validated capability | OUT_OF_SCOPE | DEVELOPMENT |
| Part 11 ER/ES / e-sign | OUT_OF_SCOPE | Explicitly NOT_CLAIMED |
| AWS Marketplace sell-side | OUT_OF_SCOPE | Commercial blocked / incomplete |

### 1.3 EXTERNAL_DEPENDENCY

| Dependency | Classification |
| --- | --- |
| GitHub (IdP, repos, Actions) | EXTERNAL_DEPENDENCY |
| PostgreSQL / SQLite engine | EXTERNAL_DEPENDENCY (infra) |
| Docker / container runtime | EXTERNAL_DEPENDENCY |
| npm/Yarn / PyPI registries | EXTERNAL_DEPENDENCY |
| Backstage open-source framework | EXTERNAL_DEPENDENCY (SOUP/OTS) |

### 1.4 FUTURE_SCOPE

| Item | Classification |
| --- | --- |
| Validation Expert (when released & intended) | FUTURE_SCOPE |
| Plugin Directory lifecycle management | FUTURE_SCOPE |
| Persistent AAS / Foundation service | FUTURE_SCOPE |
| Nexora remote industrial integrations | FUTURE_SCOPE |
| OEE commercial offering | FUTURE_SCOPE |
| Broader Golden Path catalog beyond official three | FUTURE_SCOPE |

### 1.5 REQUIRES_DECISION

| Item | Question |
| --- | --- |
| Golden Paths content | Layer 1 vs Layer 2 (see §2) |
| Guest provider | Allowed only in local non-validated envs? |
| Data Products “CERTIFIED” labels | Confirm naming does not imply GxP validation |
| Entitlements AWS adapter | In or out of Baseline 0.1 IQ |
| Sample catalog locations | Remove from frozen config vs label as non-validated |

---

## 2. Golden Paths — scalable recommendation

**Recommendation: Option B — separately qualified reusable components (Layer 2).**

| Option | Description | Verdict |
| --- | --- | --- |
| A. Inside Platform Core | Template content validated with Control Plane | Rejected — couples platform releases to every template change |
| **B. Separately qualified reusable components** | Platform validates scaffolder *engine* + template *registration*; each official GP has its own qualification package | **Recommended** |
| C. Fully separate validated products | Each GP is its own product CSV with no inheritance | Possible later; heavier; use after B matures |

**Evidence inheritance (proposed):**

- Platform Core evidence: authn/authz, scaffolder engine, catalog registration of Template entities.  
- Golden Path package: template parameters, generated project structure, content tests, container/CI of **template content**.  
- Generated Data Product (Layer 3): site-specific config, deployment, GxP fit-for-purpose — **new** or delta validation.

Official GP template **content** may be referenced as Layer 2 candidates (MQTT Temperature, REST Equipment, OEE) but are **not** auto-included in Platform Core Baseline 0.1 scope without GATE-02 decision.

---

## 3. Per-capability evaluation (AS-IS informed)

| Capability | Proposed class | Notes |
| --- | --- | --- |
| Backstage Frontend | IN_SCOPE | Smoke not verified in AS-IS — entry criterion |
| Backstage Backend | IN_SCOPE | Health verified |
| Software Catalog | IN_SCOPE | Samples OUT / controlled |
| Scaffolder | IN_SCOPE (engine) | Publish E2E not verified — entry/open |
| Authentication | IN_SCOPE | Interactive login not re-verified |
| Authorization | IN_SCOPE | Unit verified |
| Permission Policy | IN_SCOPE | Unit verified |
| GitHub integration | IN_SCOPE (technical) | External dependency |
| CI/CD integration | EXTERNAL + Layer 2/3 | Platform CI ≠ GP CI |
| Database/persistence | IN_SCOPE (platform DB) | |
| Logging | REQUIRES_DECISION / PARTIAL | Depth TBD in URS |
| Audit functionality | PARTIAL IN_SCOPE | Create-authorization audit where present; not Part 11 |
| Golden Paths | Layer 2 (recommended) | |
| Data Products functionality | IN_SCOPE (metadata UI/API) | |
| Entitlements | IN_SCOPE (gates) | |
| Marketplace | IN_SCOPE (discovery) | |
| Validation Expert | OUT_OF_SCOPE | |
| Plugin Directory | OUT_OF_SCOPE | |
| AAS | OUT_OF_SCOPE | |
| Nexora Industrial | OUT_OF_SCOPE (mock) | |
| OEE commercial | OUT_OF_SCOPE | |

---

## 4. Known validation gaps affecting scope

From AS-IS (non-exhaustive):

- Dirty working tree → **BASELINE NOT YET FROZEN**  
- Frontend smoke not verified  
- No scaffolder→GitHub E2E in assessment  
- Guest enabled in default development config  
- Sample entities loaded by default  
- WIP plugins present in WT  

These are **gaps to close or formally accept before freeze**, not scope expansions.

---

## 5. Human approval

| Gate | Decision |
| --- | --- |
| **GATE-02** | Approve IN/OUT/EXTERNAL/FUTURE classifications and Golden Path Layer 2 approach |

**AI must not approve GATE-02.**
