# Data Product Consumption Framework — Readiness Assessment

**Date:** 2026-08-23  
**Product validation status (unchanged):** `NOT_VALIDATED`

---

## Classification

**`READY_WITH_CONDITIONS`**

---

## Existing strengths

| Area | Evidence |
| --- | --- |
| Catalog identity | `Component` + `spec.type: data-product` + `dataprod.platform/*` annotations |
| Data Products UI | `/data-products`, `/data-products/:name` governance/overview |
| Contracts | Template schemas + Catalog `API` entities |
| Permissions | `data-product.view|create|governance|certification.manage` |
| Backend | `data-products-backend` with catalog + CI + certification |
| Industrial mock UX | Nexora assets/quality/contracts |
| Model Company | Status board for connected products |

## Conditions

1. No custom `kind: DataProduct` — keep Component model; add consumption annotations.
2. No product runtime proxy today — add controlled `/consume/*` access layer.
3. No chart library — metric cards + table/JSON/realtime feed first; timeseries as capability with simple SVG or table fallback.
4. Live OEE/Temperature require running GP instances — fixtures for SAMPLE products; live probe = optional.
5. Do not invent quality/validation metrics.

## Blockers

**None** for Framework v1 MVP.
