# OEE UNS Customer Zero E2E — Verification Report

**Date:** 2026-08-23 (evening verification resume)  
**Product validation status (unchanged):** `NOT_VALIDATED`

## Scope

Verification only after Windows/OneDrive `@internal/data-product-consumption` junction workaround.  
Junction / `link-internal-packages.js` / package `exports` **not modified** (still healthy).

Minimal startup fix (not a Model Company product shortcut): `resolveFactoryPath` now walks parents so `modelCompany.factoryPath` resolves when backend `cwd` is `packages/backend` (was ENOENT → backend crash).

## E2E levels (executed this run)

| Level | Name | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Contract | **PASS** | `templates/oee-data-product/content/contracts/oee-result.schema.json`; pytest `test_contract` + `test_api` (11 PASS) |
| 2 | Adapter | **PASS** | Consume descriptor maps OEE interfaces (`query` → `/api/v1/oee`, stream SSE); prior UNS messages `valid: true` |
| 3 | Domain | **PASS** | `SCN-AI-007` run + 60 ticks → `CHECKWEIGHER-01.state=MICROSTOP`, `reasonCode=PRODUCT_JAM`, phase `PACKAGING` |
| 4 | MQTT Broker | **PASS** | `model-company/runtime` Mosquitto **Up** `:41884`; runtime health `:18091`; pub/sub roundtrip + prior live engine publish |
| 5 | API | **PASS** | Guest auth → `/api/data-products/consume/products|query` **200**; OEE Golden Path backend tests prior PASS |
| 6 | Consumption SDK | **PASS** | Descriptor for `filler-01-oee` includes interfaces + `oee-dashboard`; query returns OEE row (`oee=0.838`, equipment `CHECKWEIGHER-01`) via fixture path |
| 7 | Frontend | **PASS** | Full `yarn start` restart; SPA `/data-products`, `/data-products/filler-01-oee`, `/data-products/line04-equipment-state` **200**; `main.js` contains `data-product-consumption` + `DataProductDetailPage`; no `Can't resolve` / `Module not found` in shell or webpack log; `DataProductDetailPage` unit tests PASS |

## Frontend / package checks

| Check | Result |
| --- | --- |
| Nested junctions (app, data-products, data-products-backend) | PASS |
| `require.resolve` from plugin / `/node` entry | PASS |
| Webpack compile after restart | PASS (`Plugin initialization complete`) |
| Model Company plugin mount | PASS (after path fix) |

## Equipment Data Product note

| Entity | Catalog | Consume | Page shell |
| --- | --- | --- | --- |
| `sample-rest-equipment-product` | **404** (not in active catalog locations) | N/A | SPA 200 (client will show missing entity) |
| `line04-equipment-state` | **200** | **200** (fixture) | **200**, no compile errors |

## Full scenario attempt

```text
SCN-AI-007 → MQTT → OEE → API → Consumption Framework → Frontend
```

### Highest verified continuous boundary

```text
SCN-AI-007 (Model Company domain)
  → CHECKWEIGHER-01 MICROSTOP / PRODUCT_JAM
  → Control Plane Consumption Framework (fixture OEE query + FE shell)
```

### Where the flow stops

**Boundary:** Domain / in-process UNS buffer → **live MQTT broker → running OEE Golden Path → live consume upstream → FE live numbers**

**Root cause (stacked, not redesigned away):**

1. `dataProducts.consume.baseUrls: {}` — consume query source remains `fixture`, not live OEE HTTP.
2. No running scaffolded OEE Data Product instance configured for this session.
3. Model Company Backstage plugin does **not** publish to Mosquitto unless `modelCompany.runtimeBaseUrl` / MQTT host is configured (commented in `app-config.yaml`); SCN ticks update domain state + in-memory UNS buffer, not necessarily broker topics for `*/state`.
4. Documented Customer Zero gap **CZ-AI-06**: OEE GP cannot consume UNS 1.0 state enum/envelope without GP extension — even with broker+OEE up, live semantic adaptation remains a product gap.

**Not marked PASS:** end-to-end `SCN-AI-007 → MQTT → OEE calculate → live API → SDK → FE live metrics`.

## Non-claims

- Did **not** change `validation_status` (`NOT_VALIDATED`)
- Did **not** invent Model Company-only OEE shortcuts
- Did **not** alter the consumption package junction workaround
- Fixture OEE responses remain labeled `source: fixture`
