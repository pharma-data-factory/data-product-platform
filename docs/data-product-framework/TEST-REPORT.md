# Data Product Consumption Framework — Test Report

**Date:** 2026-08-23 (re-verified evening)  
**Product validation:** `NOT_VALIDATED` (unchanged)

For the resumed OEE UNS Customer Zero level scorecard see  
[`E2E-VERIFICATION-REPORT.md`](./E2E-VERIFICATION-REPORT.md).

## Unit / package tests (executed)

| Suite | Result |
| --- | --- |
| `@internal/data-product-consumption` resolve (junctions + `require.resolve`) | **PASS** |
| `data-products` `DataProductDetailPage.test.ts` | **PASS** (3) |
| OEE template `test_contract` + `test_api` | **PASS** (11) |

## Live probes (executed)

| Probe | Result |
| --- | --- |
| Frontend restart + compile | **PASS** |
| `/data-products`, `/data-products/filler-01-oee`, `/data-products/line04-equipment-state` | **PASS** (200, no resolve errors) |
| Consume descriptor + OEE query (fixture) | **PASS** |
| Live OEE upstream (`baseUrls`) | **FAIL** (empty config → fixture only) |

## E2E levels (summary)

| Level | Result |
| --- | --- |
| 1 Contract | **PASS** |
| 2 Adapter | **PASS** |
| 3 Domain | **PASS** |
| 4 MQTT Broker | **PASS** |
| 5 API | **PASS** |
| 6 Consumption SDK | **PASS** |
| 7 Frontend | **PASS** |

Full `SCN-AI-007 → MQTT → OEE → live API → FE` **stops** at live OEE upstream / broker wiring (see E2E report).

## Non-claims

- Did not change product `validation_status`
- Fixtures labeled `source: fixture`
- No Model Company-only OEE product invented
