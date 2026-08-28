# Model Company / UNS Test Report

**Date:** 2026-08-23 (re-verified evening)  
**Platform validation:** `NOT_VALIDATED` (unchanged)

## Suites

| Suite | Focus | Result |
| --- | --- | --- |
| `plugins/model-company-backend` | UNS topics, SCN-003/004, contract counts, CCG | prior PASS |
| `plugins/model-company` | Chrome labels, routes incl. `/model-company/uns` | prior PASS |
| `packages/app` ModelCompanySection | Landing CTA | prior PASS |
| `model-company/runtime` scenario-engine | Path/env fix for Docker factory default | **fixed + health ok** |

## Runtime MQTT E2E (executed)

| Target | Result |
| --- | --- |
| Mosquitto on `localhost:41884` | **Up** |
| Scenario engine `http://127.0.0.1:18091/health` | **ok** |
| Manual pub/sub on `uns/#` | **PASS** |
| Simulation start → live UNS publish (state/availability/temperature) | **PASS** |
| Simulator → UNS message → schema validation (buffer/unit) | **Verified** (unit, prior) |
| SCN-003/004 → OEE DP result | **`CUSTOMER_COMPONENT_GAP`** |
| SCN-007 → Temperature DP excursion | **`CUSTOMER_COMPONENT_GAP`** |

## Fix applied this run

`model-company/runtime/scenario-engine/app/main.py`: do not eagerly evaluate `Path(...).parents[3]` when `MODEL_COMPANY_FACTORY` is already set (broke Docker import).
