# OEE product decisions

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: PRODUCT / PLATFORM  
Version: 1.0.0  
Status: CERTIFIED (decisions locked for OEE 1.0; technical only, not GxP)

Do not invent plant-specific policy. Each row is still open for
counsel/product confirmation. Engineering **recommended defaults** are
what the 1.0 design implements unless product overrides them before
implementation.

| Topic | Status | Recommended default | Impact if changed after 1.0.0 |
| --- | --- | --- | --- |
| Planned downtime model | DECISION REQUIRED | Union of context `plannedDowntime[]` and state `MAINTENANCE`; kinds are informational | New kinds that change Availability vs Performance would be a contract/policy change |
| Shift boundaries | DECISION REQUIRED | Caller supplies `[windowStart, windowEnd)` for `window=shift`; no built-in calendar | A platform shift catalog would be new config, not a formula change |
| Cumulative vs delta counters | DECISION REQUIRED | **CUMULATIVE** with reset algorithm | Switching default to delta is `BREAKING_CHANGE` |
| Good/reject origin | DECISION REQUIRED | Quality station MQTT when present; else Quality null if only production counts | Mixing MES quality REST later is an adapter, not a formula change |
| Who owns ideal cycle time | DECISION REQUIRED | Production context (MES via REST), not PLC and not AAS in MVP | Moving to AAS master data is optional later |
| Order-based vs equipment-based | DECISION REQUIRED | Equipment grain; order is a **window kind** | Mixing both in one row is out of scope |
| Performance > 100% | DECISION REQUIRED | **Allowed** (not clamped) | Clamping later is `BREAKING_CHANGE` for `oee-result` |
| Micro-stops | IMPLEMENTED (1.1 additive) | `IDLE` and `STOPPED` still unplanned availability loss on `oee-result` 1.0. Optional duration thresholds classify microstops on loss APIs without changing A/P/Q | Changing 1.0 Availability to exclude microstops would be `BREAKING_CHANGE` |
| Site-local hour/day vs UTC | DECISION REQUIRED | UTC windows unless optional context timezone is added later | Timezone field is COMPATIBLE |
| `orderId` required on context | DECISION REQUIRED | **Optional** except `window=order` | Making it always required is `BREAKING_CHANGE` |
| Treat some IDLE as planned | DECISION REQUIRED | No in 1.0; `reason` is diagnostic only | Optional context flags later, COMPATIBLE |

Engineering will not encode a named customer's MES reason-code map.
