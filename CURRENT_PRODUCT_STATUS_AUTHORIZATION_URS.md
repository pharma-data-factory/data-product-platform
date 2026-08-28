# CURRENT PRODUCT STATUS — AUTHORIZATION + URS COMPOSER

**Audit date:** 2026-08-26  
**Mode:** READ-ONLY (repository + executed tests authoritative)  
**Prior reports:** Not accepted as proof

---

## 1. Executive Verdict

| Domain | Exact status |
|--------|----------------|
| Authorization / Access | **AUTHORIZATION_PLUGIN_OPERATIONAL_WITH_GAPS** |
| URS Composer | **URS_COMPOSER_PARTIAL** |

**Deciding evidence:**
- Authorization: Backstage Permission Framework + `PlatformPermissionPolicy` + Catalog groups + Community RBAC packages are **registered and used** by privileged backends. Gaps: no runtime Authorization Profile Registry service, no custom Admin Access UX, domain `authorization.yaml` is metadata-only, Jest policy suites currently fail to execute.
- URS: Backend HTTP API (in-memory) is **tested green (27/27)**. Product UI is **not mounted** in `App.tsx`, draft `PUT` is stubbed, library/detail/approval UX incomplete, `postgres-repository.ts` corrupted from ~L829 with pasted markdown.

---

## 2. Authorization Plugin Status

| Component | Evidence | Status |
|-----------|----------|--------|
| `@backstage/plugin-permission-backend` | `packages/backend/src/index.ts` | IMPLEMENTED |
| `permissionModulePlatformPolicy` | `packages/backend/src/permission/` | IMPLEMENTED |
| `PlatformPermissionPolicy` | `policy.ts` + `decidePermission` | IMPLEMENTED |
| Permission definitions | `packages/platform-common/src/permissions.ts` | IMPLEMENTED |
| Role/group mapping | `packages/platform-common/src/roles.ts` | IMPLEMENTED |
| Entitlement gate (commercial create) | policy + entitlements plugin | IMPLEMENTED |
| Community RBAC backend | `@backstage-community/plugin-rbac-backend` | IMPLEMENTED (registered) |
| Community RBAC frontend | `rbacPlugin` in `App.tsx` | IMPLEMENTED (registered) |
| Custom Access Admin app | `/admin/access/*` | MISSING |
| Authorization Profile Registry **service** | no TS discovery/API | MISSING |
| Static registry doc YAML | `docs/architecture/authorization-profile-registry.yaml` | DOCUMENTATION ONLY |

---

## 3. Backstage Permission Framework Status

```
Identity (guest / GitHub)
  → Catalog User / Group ownershipEntityRefs
  → PlatformPermissionPolicy.handle()
  → decidePermission(role) (+ entitlement/release on commercial scaffolder)
  → plugin routers: permissions.authorize([...])
```

**BACKSTAGE_PERMISSION_FRAMEWORK:** **IMPLEMENTED**

**CUSTOM_RBAC_DUPLICATION:** **NO**  
No separate user/IAM database. Community RBAC is the Backstage community policy-admin plugin registered alongside the platform policy—not a second identity system.

Insecure patterns (`x-user-role`, client role headers): **not found** in plugin `router.ts` files (repo search this audit).

---

## 4. Authorization Profile Registry Status

| Metric | Count (this audit) |
|--------|--------------------|
| TOTAL_GOLDEN_PATHS (template directories) | **10** |
| TOTAL_AUTHORIZATION_YAML present | **6** |
| Missing YAML | `aas-asset`, `mqtt-connector`, `node-service`, `python-service` (**4**) |
| Runtime-validated profiles | **0** (no registry runner) |
| Discovered permissions via registry API | **0** |
| Domains with YAML only | oee, mqtt (temp), equipment/rest, aas-data-product, unified-namespace, machine-state-consumer |

**Files ≠ registry.**  
`docs/architecture/authorization-profile-registry.yaml` lists profiles statically—**DOCUMENTATION ONLY**, not executable discovery.

Domain permissions in YAML (`oee.read`, etc.) are **NOT** registered in `platform-common` `createPermission` catalog → **not Backstage-enforceable** as first-class permissions today.

---

## 5. Admin Access Status

| Surface | Classification | Evidence |
|---------|----------------|----------|
| Community RBAC plugin UI | IMPLEMENTED (registered) | `App.tsx` imports `rbacPlugin` |
| Sidebar `/admin/access` | MISSING | Sidebar has `/admin/entitlements`, `/admin/marketplace-integration` |
| Users (custom Access page) | MISSING | Catalog Users exist in `catalog/org.yaml` |
| Groups (custom Access page) | MISSING | Groups in Catalog |
| Roles (custom Access page) | MISSING | Roles in `roles.ts` code |
| Permissions / Effective Access | MISSING | |
| Authorization Profiles admin | MISSING | |

### Platform roles (repository evidence)

| Role | Source | Catalog group | Runtime enforcement | Admin visibility |
|------|--------|---------------|---------------------|------------------|
| VIEWER (“Viewer”) | `roles.ts` | `platform-viewers` | `decidePermission` | Via code/RBAC plugin only |
| DEVELOPER (“Developer”) | `roles.ts` | `data-product-developers` | `decidePermission` | same |
| DATA_PRODUCT_OWNER (“Data Product Owner”) | `roles.ts` | `data-product-owners` | `decidePermission` | same |
| PLATFORM_ADMIN (“Platform Admin”) | `roles.ts` | `platform-admins` | `decidePermission` | same |

Extra Catalog groups (`urs-authors`, `validation-reviewers`, …) exist as **entities** but are **not** in `PLATFORM_GROUPS` / `GROUP_TO_ROLE` → they do **not** auto-map to platform roles.

---

## 6. Authorization Remaining Gaps

**P0**
1. No operational Authorization Profile Registry (load/validate/expose YAML).
2. Domain YAML permissions not in Backstage permission catalog.
3. No first-party Admin Access IA (Users/Groups/Roles/Effective Access).
4. Jest broken for `platform-common` policy tests (`runtime.enterTestCode`) → cannot re-prove policy unit suite this session.

**P1**
5. Wire domain Catalog groups into enforceable assignments (RBAC admin or policy).
6. Document/test precedence: Community RBAC vs `PlatformPermissionPolicy`.
7. Complete remaining 4 `authorization.yaml` **after** registry exists.
8. Sidebar discoverability for RBAC admin.

---

## A3. Backend Enforcement (sample)

| Plugin | Capability | Permission family | Enforcement | Result |
|--------|------------|-------------------|-------------|--------|
| urs-composer-backend | sets/requirements/baselines/approvals | `urs.*` | `permissions.authorize` | ENFORCED |
| validation-manager-backend | packages/reviews | `validation.*` | `permissions.authorize` | ENFORCED |
| validation-expert-backend | evidence/runs | `validation.*` | `permissions.authorize` | ENFORCED |
| data-products-backend | create/govern/consume | `data-product.*` | `permissions.authorize` | ENFORCED |
| entitlements-backend | entitlements | `entitlement.*` | `permissions.authorize` | ENFORCED |
| plugin-directory-backend | directory | `pluginDirectory.*` | `permissions.authorize` | ENFORCED |
| model-company-backend | simulator | `modelCompany.*` | `permissions.authorize` | ENFORCED |
| nexora-backend | industrial APIs | platform perms | `permissions.authorize` | ENFORCED |

No privileged route with `x-user-role` bypass found in this scan.

---

## A6. Identity Provider Readiness

**Configured:** guest (dev), GitHub provider.  
**Model:** Catalog User/Group ownership refs → policy. Provider-agnostic **if** IdP users/groups are represented in Catalog with the same group names.  
**Entra / Okta / LDAP:** NOT IMPLEMENTED (architecture ready in principle; integrations missing).

---

## 7. URS Composer Status

| Piece | Path / evidence | Status |
|-------|-----------------|--------|
| Frontend package | `plugins/urs-composer` | PARTIALLY IMPLEMENTED |
| Backend package | `plugins/urs-composer-backend` | IMPLEMENTED (API) |
| Backend registered | `packages/backend/src/index.ts` | IMPLEMENTED |
| Frontend in `App.tsx` features | **absent** | MISSING mount |
| API client | `ursComposerApi.ts` | IMPLEMENTED |
| Detail page | placeholders; not routable extension | PLACEHOLDER |
| Library | “View All” without navigation | PLACEHOLDER |

---

## 8. Business Capability Integration

| Topic | Finding |
|-------|---------|
| Source of truth | Backend capability seed/data + API `GET /capabilities` — **not** Catalog-as-primary |
| Wizard Step 1 | Loads capabilities via API | IMPLEMENTED (code; app mount missing) |
| Persist on set | `businessCapabilityRefs` on create | IMPLEMENTED |
| Capability → Solution → Golden Path → Evidence closed loop | NOT CONNECTED as product flow |

---

## 9. URS Wizard Status

**Actual steps in code** (not older conceptual 8-type list):

| # | Step | UI | Validation | Persistence |
|---|------|----|------------|-------------|
| 1 | Business Capability | YES | YES | via set create |
| 2 | Business Need | YES | YES | via set create |
| 3 | URS Context | YES | YES | via set create |
| 4 | Requirements | YES | YES | **local only** on Save Draft |
| 5 | Acceptance Criteria | YES | partial | **local only** |
| 6 | Quality & GxP Review | YES | **mock** | not wired to backend validate |
| 7 | Traceability | YES | summary | no graph API |
| 8 | Review & Submit | YES | partial | **Submit TODO** |

---

## 10. Persistence

| Mode | Status |
|------|--------|
| In-memory repository | IMPLEMENTED — proven by P1B HTTP suite |
| PostgreSQL repository | CODE EXISTS + **FILE CORRUPTED ~L829** (Golden Path markdown paste) |
| Migrations / seeds | IMPLEMENTED in code |
| `PUT /requirement-sets/:id` | **STUB** (`Update not yet implemented`) |
| Create → save → reload → update → restart (product) | **NOT OPERATIONAL** |

**Proven system of record today:** in-memory test harness.  
**Intended:** PostgreSQL (blocked for confidence by corruption + no green live PG re-proof this session).

### Core model classification

| Concept | Classification |
|---------|----------------|
| Business Capability | IMPLEMENTED + PERSISTED (seed/API; PG intended) |
| Business Need | IMPLEMENTED + PERSISTED (fields on set) |
| Solution Context | IMPLEMENTED + PERSISTED (fields on set) |
| Requirement Set | IMPLEMENTED + PERSISTED |
| URS Requirement | IMPLEMENTED + PERSISTED (API); wizard local until POST |
| Requirement Version | IMPLEMENTED + PERSISTED |
| Regulatory / GxP fields | IMPLEMENTED + PERSISTED |
| Functional/NFR/Interface as separate step types | MISSING as distinct wizard steps (generic requirement cards) |
| Approval / Audit | IMPLEMENTED + PERSISTED (backend) |
| Relationship / Traceability graph | PARTIAL model / DOCUMENTATION-leaning UI |

**Solution types in code:** `PROJECT`, `PLUGIN`, `COMPONENT`, `DATA_PRODUCT` (enum usage in wizard/API types).

---

## 11. Versioning / Baselines

| Feature | Backend | Frontend |
|---------|---------|----------|
| Revisions / version history APIs | IMPLEMENTED | MISSING |
| Baselines create/list/get | IMPLEMENTED | MISSING |
| Immutability / supersession | IMPLEMENTED (service/repo) | MISSING UI |

---

## 12. Approval Workflow

| Layer | Status |
|-------|--------|
| Backend (baseline → submit → step approve/reject) | IMPLEMENTED |
| Permission Framework on approve/reject | IMPLEMENTED (`urs.approve`) |
| Frontend workflow UX | MISSING / PLACEHOLDER |
| Browser E2E approval | MISSING |

---

## 13. Traceability

| Layer | Status |
|-------|--------|
| Data model links | PARTIAL |
| Traversal / Knowledge Graph API | MISSING |
| Wizard Step 7 | PARTIAL (local counts) |
| Change impact | MISSING |

---

## 14. Validation Expert Integration

| Arrow | Classification |
|-------|----------------|
| URS APIs → Approved Baseline | RUNTIME INTEGRATION (backend) |
| Approved Baseline → Validation Expert consume | NOT CONNECTED |
| CI Evidence → Validation Expert | Separate plugin; not URS-wired |
| Closed URS→VE loop | DOCUMENTATION ONLY / NOT CONNECTED |

---

## 15. URS Authorization

| Permission | Defined | Backend enforced | Frontend visible | In Profile Registry |
|------------|---------|------------------|------------------|---------------------|
| `urs.read` | YES | YES | NO | NO (registry missing) |
| `urs.create` | YES | YES | NO | NO |
| `urs.manage` | YES | YES | NO | NO |
| `urs.approve` | YES | YES | NO | NO |
| `urs.admin` | YES | limited surface | NO | NO |

Developer cannot approve without `urs.approve` — **backend YES** (HTTP 403 in P1B suite).

---

## 16. Audit Trail

| Aspect | Status |
|--------|--------|
| Append-only events | IMPLEMENTED (backend) |
| Actor / time / entity | IMPLEMENTED |
| API retrieval | IMPLEMENTED |
| Frontend Audit tab | PLACEHOLDER |
| GxP audit claim | **NOT MET** — do not market as GxP audit |

---

## 17. End-to-End Architecture

```
BUSINESS CAPABILITY     [PARTIAL — API/seed, not Catalog-primary]
        | WORKING (create with refs)
URS COMPOSER            [PARTIAL — API yes; App mount no]
        | PARTIAL (baseline APIs; no product submit UX)
APPROVED URS            [PARTIAL — backend lifecycle]
        | REFERENCE ONLY
SOLUTION / GOLDEN PATH  [WORKING — Wave-1 templates separate]
        | WORKING
PLATFORM COMPONENTS     [PARTIAL]
        | WORKING
GENERATED DATA PRODUCT  [WORKING for certified GPs]
        | WORKING
CI / TESTS / EVIDENCE   [WORKING per GP]
        | PARTIAL / SEPARATE
VALIDATION EXPERT       [PARTIAL — not URS-wired]
        | MISSING from URS
TRACEABILITY (URS)      [PARTIAL scaffold]
        | MISSING
CONTROLLED CHANGE       [MISSING as closed loop]
```

---

## 18. Tests Executed (this audit)

| Suite | Result |
|-------|--------|
| `urs-composer-backend` `p1b-http-final-verification.test.ts` | **27 PASS / 0 FAIL** |
| `urs-composer` frontend Jest | Prior/current runner: **FAIL to execute** (`enterTestCode`) — treat as **0 executed** |
| `platform-common` policy/access tests | **FAIL to execute** (`enterTestCode`) — **0 executed** |
| Wave 1 / OEE / MQTT / REST regression | **NOT RE-RUN** this session |
| Full monorepo `yarn tsc` | **NOT COMPLETED** this session |

---

## 19. MVP Readiness Matrix

| Capability | DEMO READY | TECHNICAL MVP | PILOT READY | NOT READY |
|------------|------------|---------------|-------------|-----------|
| Component Library | ✓ | ✓ | partial | |
| Composition Builder | ✓ | partial | | |
| Golden Paths / OEE | ✓ | ✓ | partial | |
| Authorization / Admin Access | partial (RBAC plugin) | ✓ enforce | | custom Access UX + registry |
| URS Composer | API-only demo | partial | | product UX |
| Validation Expert | partial | partial | | URS-linked |
| Marketplace | partial | partial | | |
| GitHub publishing | config-dependent | partial | | |
| Hosted Control Plane | | | | ✓ |

**Genuine today:** Golden Path demos + permission-backed APIs + Catalog groups + Community RBAC registration.  
**Not genuine as product demo:** Admin Access console, Auth Profile Registry, browser URS → approved baseline journey.

---

## 20. P0 Gaps

1. Mount URS frontend in the app.  
2. Implement `PUT /requirement-sets/:id` + persist requirements on draft.  
3. Repair `postgres-repository.ts` corruption (markdown from ~L829).  
4. URS Library + live detail (minimum).  
5. Auth Profile Registry **or** explicit freeze of YAML-as-operational claims.  
6. Fix Jest `enterTestCode` so policy/FE suites can execute.

---

## 21. P1 Gaps

1. Wizard submit → baseline → approval UI.  
2. Wire quality step to backend validate.  
3. Admin Access IA (or document Community RBAC as sole admin).  
4. Register domain profile permissions into Permission Framework.  
5. Validation Expert consume-approved-baseline contract.  
6. Green live PostgreSQL verification.  
7. Enforce URS Catalog group assignments.

---

## 22. What Is Documentation-Only

- `docs/architecture/authorization-profile-registry.yaml` as “registry”  
- Claims that domain YAML permissions are RBAC-discoverable at runtime  
- Custom `/admin/access` experience  
- URS Knowledge Graph / full traceability product  
- URS ↔ Validation Expert closed loop  
- GxP-validated URS Composer  
- Durable draft update (stub in router)  
- Historical FE/policy “all green” claims while Jest runner is broken

---

## 23. Exact Recommended Next 3 Actions

1. **Stabilize:** remove corruption from `postgres-repository.ts`; fix Jest runner; re-run policy + URS FE + PG suites.  
2. **URS product shell:** mount FE → draft update + requirement persistence → Library + detail live data.  
3. **Authorization clarity:** implement Authorization Profile Registry **or** stop treating YAML as operational and document Community RBAC + `PlatformPermissionPolicy` as the sole control plane.

---

AUTHORIZATION: AUTHORIZATION_PLUGIN_OPERATIONAL_WITH_GAPS

URS_COMPOSER: URS_COMPOSER_PARTIAL

STOP.
