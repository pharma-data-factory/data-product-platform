# MODEL COMPANY RUNTIME & FRONTEND AUDIT

**Audit date:** 2026-08-23 (updated same day — Customer Zero MQTT→OEE E2E)  
**Auditor role:** Principal Backstage Architect / Platform QA / Industrial Simulation / Frontend Integration  
**Product validation status (unchanged):** `NOT_VALIDATED`  
**Evidence basis:** Live runtime probes + code inspection + unit/integration tests (documentation not used as proof)

Machine-readable twin: `docs/model-company/model-company-runtime-audit.yaml`

---

## Overall Model Company Status

**`DEMO_READY_WITH_CONDITIONS`**

In-process Model Company (factory-as-code, simulation engine, REST APIs, UNS event buffer, Autoinjector campaign) works end-to-end for SCN-AI-001 through Finished Goods receipt. Frontend is reachable from landing + sidebar.

**New (this session):** Control Plane → Scenario Runtime → Mosquitto → OEE CHECKWEIGHER-01 path is **proven** by automated Customer Zero E2E (`customerZeroOeeE2e.test.ts`). Browser display of the live OEE page was **not** automated (Level 8 `NOT_RUN`).

**E2E declaration:** `MODEL_COMPANY_DATA_PRODUCT_E2E_PARTIAL` (Levels 1–7 PASS; Level 8 NOT_RUN; Level 9 PASS for browser Accept).

---

## Frontend Accessibility

**Classification:** `LANDING_PAGE_ACCESSIBLE`

| Check | Result | Evidence |
| --- | --- | --- |
| Route `/model-company` registered | PASS | `plugins/model-company` `PageBlueprint` + `packages/app` plugin import |
| Backend plugin registered | PASS | `packages/backend` imports `@internal/plugin-model-company-backend` |
| Sidebar navigation | PASS | `Sidebar.tsx` takes `page:model-company*` |
| Landing card + CTA | PASS | `ModelCompanySection` on `PublicLanding` — OPEN MODEL COMPANY → `/model-company` |
| Route renders (in-app) | PASS | Bundle contains Model Company; APIs feed Overview |
| Webpack / module resolve | PASS | App loads; no consumption-package resolve errors observed this session |
| Guest permissions | PASS | Guest token → `/overview` 200 |
| Hard refresh deep link | PASS (browser) | Prior FAIL was a **probe artifact**: Rspack `historyApiFallback` requires `Accept: text/html`. Browser-like Accept → **200** for `/model-company` and `/data-products/...` on `:3000` and `:7007`. Non-HTML Accept → 404 by design. |

---

## Runtime Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Backend `:7007` | PASS | Listening; health 200 |
| Frontend `:3000` | PASS | Root 200 |
| `/api/model-company/health` | PASS | `status=ok`, NON_GXP classification |
| Factory load (`autoinjector-pharma.yaml`) | PASS | `/factory` → Nexora Model Pharma, 4 areas, 4 lines, 18 equipment |
| Scenario engine Compose `:18091` | PASS | Health 200; `POST /api/v1/uns/publish` relays Control Plane UNS → Mosquitto |
| MQTT broker `:41884` | PASS | Existing Model Company Mosquitto; independent subscriber observed Platform UNS |
| OEE CHECKWEIGHER `:18080` | PASS | Compose `oee-checkweigher`; health UP; MQTT subscribed to Platform UNS topics |
| Reset / start / stop / tick | PASS | All POST 200; status transitions STOPPED↔RUNNING |
| Persistence | PASS | `packages/backend/.runtime/model-company/state.json` + `events.jsonl` written |
| Stale factory state | NOTE | State is Autoinjector-shaped; switching factories without reset can leave incompatible persisted state under `.runtime` |

**Control Plane simulation mode:** in-process ticker in `model-company-backend`. When `runtimeBaseUrl` is set, captured UNS messages are forwarded to Scenario Runtime (sole MQTT publisher). Frontend never publishes MQTT.

---

## Autoinjector Scenario Status

### SCN-AI-001 (executed live — prior audit)

| Step | Result |
| --- | --- |
| Reset + run SCN-AI-001 | PASS |
| Drug Product order/batch | PASS — `PO-DP-100001` / `DPB-*` COMPLETED / RELEASED |
| Assembly | PASS — progressed to COMPLETED |
| Packaging | PASS — COMPLETED |
| FG HUs | PASS — `HU-FG-100001/2` **RECEIVED**, qty 48000 |
| Genealogy | PASS — edges present (412 after full run) |
| Serialization sample | PASS — 4 serial levels |
| Campaign phase | PASS — `COMPLETE` at tick ≥275 |

### SCN-AI-007 (Customer Zero MQTT→OEE — this session)

| Step | Result |
| --- | --- |
| Reset + run SCN-AI-007 with unique seed/runId | PASS |
| CHECKWEIGHER-01 → MICROSTOP / PRODUCT_JAM | PASS |
| Platform UNS topic publish via Scenario Runtime | PASS |
| Independent MQTT subscriber observed message | PASS |
| OEE adapter consumed + engine calculated | PASS |
| OEE API `CHECKWEIGHER-01` live (non-fixture) | PASS |

### SCN-AI-001 … SCN-AI-010

| ID | Live API smoke (reset/run/15 ticks) | Unit outcome asserts | Classification |
| --- | --- | --- | --- |
| SCN-AI-001 | PASS + **full COMPLETE** | PASS (`autoinjectorCampaign.test`) | **PASS** |
| SCN-AI-002 | PASS | PASS (QUALITY_HOLD block) | **PASS** |
| SCN-AI-003 | PASS | engine hook only | **PARTIAL** |
| SCN-AI-004 | PASS | PASS (BREAKDOWN) | **PASS** |
| SCN-AI-005 | PASS | engine hook only | **PARTIAL** |
| SCN-AI-006 | PASS | PASS (packaging blocked) | **PASS** |
| SCN-AI-007 | PASS + **MQTT→OEE E2E** | PASS (`customerZeroOeeE2e`) | **PASS** |
| SCN-AI-008 | PASS | engine hook only | **PARTIAL** |
| SCN-AI-009 | PASS | engine hook only | **PARTIAL** |
| SCN-AI-010 | PASS | PASS (genealogy to FG) | **PASS** |

---

## UNS / MQTT Status

| Mode | Status |
| --- | --- |
| `IN_PROCESS_EVENT_GENERATION` | **VERIFIED** — `/uns/messages`, `/uns/topics`, `/events`, overview `eventsPerSec` |
| `REAL_MQTT_BROKER_VERIFIED` | **VERIFIED** — Control Plane → Scenario Runtime `/api/v1/uns/publish` → Mosquitto `:41884`; independent `mqtt` subscriber observed Platform UNS |

**Observed topic (authoritative Platform UNS):**
```text
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/CHECKWEIGHER-01/state
```

Envelope fields verified: `schemaVersion=1.0`, `equipmentId`, `timestamp`, `dataQuality`, payload `state=MICROSTOP`, `reasonCode=PRODUCT_JAM`. Correlation via `eventId` containing scenario seed / `runId`.

---

## APIs

| Endpoint | Status |
| --- | --- |
| GET `/health` | PASS |
| GET `/overview` | PASS |
| GET `/sites` | PASS |
| GET `/factory` | PASS |
| GET `/lines` | PASS |
| GET `/equipment` | PASS |
| GET `/orders` | PASS |
| GET `/batches` | PASS |
| GET `/genealogy` | PASS |
| GET `/campaign` | PASS |
| GET `/warehouse` | PASS |
| GET `/serials` | PASS |
| GET `/scenarios` | PASS |
| GET `/simulation` | PASS |
| GET `/events` | PASS |
| GET `/uns/tree` | PASS |
| GET `/uns/health` | PASS |
| GET `/uns/messages` | PASS |
| GET `/uns/topics` | PASS |
| GET `/data-products` | PASS |
| GET `/traceability/CHECKWEIGHER-01` | PASS |
| GET `/traceability/BOTTLE-FILLER-01` | NOT_FOUND (legacy id; not in Autoinjector factory) |
| POST `/simulation/start\|stop\|reset\|tick` | PASS |
| POST `/scenarios/run` | PASS |

External (Compose):

| Endpoint | Status |
| --- | --- |
| Scenario Runtime `POST /api/v1/uns/publish` | PASS |
| OEE `GET /api/v1/oee/CHECKWEIGHER-01?window=hour` | PASS (live) |

---

## Landing Page Integration

**Present (not `LANDING_PAGE_INTEGRATION_MISSING`).**

Minimal audit fix applied (prior):

- Heading / aria: Explore the Model Company
- Badges: `SYNTHETIC` · `NON-GXP` · `UNS-NATIVE`
- Subtext: Autoinjector Drug Product → Assembly → Packaging → Finished Goods
- CTA: OPEN MODEL COMPANY → `/model-company`

---

## Model Company Route

| Item | Status |
| --- | --- |
| `/model-company` Overview | PASS (metrics: simulation, scenario, orders, batches, equipment, broker) |
| Simulated clock | **NOT_AVAILABLE** (not exposed on Overview) |
| Campaign value stream | PASS (`/model-company/campaign` ASCII stream with order/batch/qty/status) |
| Stage click-through | PARTIAL — Genealogy + OEE buttons; stages themselves are not separate routed pages |
| Subpages (factory/lines/equipment/…) | PASS — mostly JSON inspector UX |

---

## Data Product Integration

| Check | Status |
| --- | --- |
| MC → generic `/data-products/:name` | PASS — `checkweigher-01-oee` (Autoinjector-scoped) |
| Prior deep links `sample-oee-data-product` / `sample-rest-equipment-product` | FAIL (catalog 404) — historical |
| `filler-01-oee` | Still present as SAMPLE for filler-01; **not** used for CHECKWEIGHER-01 E2E |
| `checkweigher-01-oee` | Catalog entity + `dataprod.platform/consume-base-url` + `dataProducts.consume.baseUrls` |
| Query context `site`/`line`/`equipment` | PASS — `DataProductDetailPage.parseContext` |
| Live OEE rows from Model Company UNS | **PASS** (OEE API + E2E; Consumption Framework wired to `:18080`) |
| Separate MC-only OEE pages | Correctly **not** built |

---

## Customer Zero E2E Levels (MQTT → OEE)

| Level | Description | Result |
| --- | --- | --- |
| 1 | Model Company event generated | **PASS** |
| 2 | Real MQTT publish (via Scenario Runtime) | **PASS** |
| 3 | Independent MQTT subscriber observed event | **PASS** |
| 4 | OEE UNS adapter consumed event | **PASS** |
| 5 | OEE engine calculated result | **PASS** |
| 6 | OEE API returned live result | **PASS** |
| 7 | Consumption Framework resolved live result | **PASS** (baseUrls + consume-base-url → upstream, not fixture) |
| 8 | Frontend displayed live result | **NOT_RUN** (no stable browser automation this session) |
| 9 | Direct frontend route refresh | **PASS** (browser Accept: text/html) |

**Sample live OEE API snapshot (CHECKWEIGHER-01, window=hour):**  
availability / performance / quality / oee present; `downtimeSeconds > 0`; `calculationStatus=COMPLETE`; `equipmentId=CHECKWEIGHER-01`; context site/line set; **not** `source=fixture`.

---

## Verified User Journey

```text
Landing → OPEN MODEL COMPANY     PASS (section + CTA)
  → Nexora Model Pharma Overview PASS (API-backed)
  → Campaign                     PASS
  → Scenarios → SCN-AI-001       PASS (API + UI run)
  → Scenarios → SCN-AI-007       PASS (API + MQTT→OEE E2E)
  → Packaging / CHECKWEIGHER-01  PASS (domain + UNS + OEE)
  → Open OEE Data Product        PARTIAL (deep link → checkweigher-01-oee + live upstream;
                                 browser rendering of live metrics NOT_RUN)
```

---

## Tests Executed

| Suite | Result |
| --- | --- |
| `@internal/plugin-model-company-backend` | **23 passed** / 4 suites (incl. mqttBridge + customerZeroOeeE2e) |
| `@internal/plugin-model-company` | **3 passed** / 2 suites |
| `@internal/plugin-data-products` | **58 passed** / 10 suites |
| `app` `ModelCompanySection` | **1 passed** |
| `backend` oeeGoldenPath + design | **10 passed** / 2 suites |
| Real MQTT → OEE integration | **PASS** (`customerZeroOeeE2e`, requires Compose) |

---

## Demo Readiness

| Use | Rating |
| --- | --- |
| Internal demo | **READY_WITH_CONDITIONS** |
| Customer demo | **READY_WITH_CONDITIONS** (disclose synthetic NON-GxP; MQTT path now proven) |
| Technical workshop | **READY** for SCN-AI-007 MQTT→OEE vertical |
| Customer sandbox | **PARTIAL** (restart backend to load new catalog/config; browser FE check remaining) |
| Validation test harness | **NOT_READY** (`NOT_VALIDATED`; synthetic only) |

---

## Customer Sandbox Readiness

**`PARTIAL`**

Requires: backend restart to load `checkweigher-01-oee` + `baseUrls`; Compose `model-company` up; optional browser walkthrough of Open OEE.

---

## Current Gaps

1. ~~`modelCompany.runtimeBaseUrl` disabled~~ → **FIXED** (enabled; MQTT bridge via Scenario Runtime)  
2. ~~`brokerStatus=NOT_CONFIGURED`~~ → **FIXED** when runtime is up (`brokerConfigured=true`)  
3. ~~OEE live consume / empty `baseUrls`~~ → **FIXED** for `checkweigher-01-oee`  
4. ~~Hard refresh 404~~ → **Reclassified PASS** for browsers (Accept: text/html); prior probe FAIL preserved historically  
5. Overview lacks simulated time  
6. Equipment UI still largely raw JSON; value-stream stages not independently routed  
7. Data Product bindings may still report `CUSTOMER_COMPONENT_GAP` for non-OEE bindings  
8. Persistence under `packages/backend/.runtime` (cwd-sensitive); factory switch needs explicit reset — **documented; not redesigned**  
9. Level 8 browser display of live OEE metrics not automated  

### Fixes applied this session

- Scenario Runtime `POST /api/v1/uns/publish` MQTT relay  
- Control Plane `RuntimeMqttBridge` when `runtimeBaseUrl` set  
- Compose `oee-checkweigher` on shared Mosquitto `:41884`  
- OEE `MICROSTOP` → `STOPPED` alias (loss classification stays in OEE engine)  
- Catalog `checkweigher-01-oee` + consume `baseUrls`  
- Model Company deep links retargeted to `checkweigher-01-oee`  
- Automated `customerZeroOeeE2e.test.ts`  

---

## Separate Instance Decision

**`SAME_BACKSTAGE_INSTANCE`**

| Concern | Decision |
| --- | --- |
| Frontend | Same app plugin |
| Runtime services | Separate (`model-company/runtime` Compose) |
| Persistence | Isolated `.runtime/model-company/` |
| Catalog | Shared catalog; MC-tagged / sample entities |
| Permissions | Shared `modelCompany.*` permissions |

No technical blocker requires a second Backstage.

---

## Persistence note (cwd-relative)

`runtimeStorePath` / `eventsPath` resolve from `process.cwd()`. Starting the backend from `packages/backend` vs repo root writes different `.runtime/model-company/` trees. Factory YAML resolution walks parents (stable); state/events do not. **Do not redesign now** — document + reset when switching factories. Only fix if E2E becomes unstable (E2E uses temp dirs).

---

## Recommended Next Action

**Milestone:** Automate browser Open OEE (CHECKWEIGHER-01 live metrics) and promote E2E declaration from `MODEL_COMPANY_DATA_PRODUCT_E2E_PARTIAL` to `MODEL_COMPANY_DATA_PRODUCT_E2E_VERIFIED`.
