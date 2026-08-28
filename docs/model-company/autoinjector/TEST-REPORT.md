# Autoinjector Test Report

**Date:** 2026-08-23  
**validation_status:** NOT_VALIDATED

## Executed (unit)

| Suite | Focus |
| --- | --- |
| `autoinjectorCampaign.test.ts` | Factory load, SCN-AI-001/002/004/006/010, determinism, YAML expected files |
| Legacy `service.test.ts` | model-pharma still loadable |
| FE route / landing tests | Campaign routes + landing CTA |

## Verified E2E boundary

```text
SCN-AI-* tick engine → UNS messages (orders/batches/equipment/HU/quality)
→ Model Company campaign/genealogy APIs
→ Generic /data-products/* deep links (sample catalog)
```

**Not verified:** live MQTT → running OEE Golden Path instance → live OEE numbers.

## Compatibility

OEE / Equipment / new genealogy-class products: see CUSTOMER-ZERO-FINDINGS.md
