# OEE Edge-Case Matrix 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

Companion to [Edge cases](edge-cases.md) and [Quality](quality.md).
Do not implement runtime from this table.

| Case | Behavior | Quality | calculationStatus | API | Observability |
| --- | --- | --- | --- | --- | --- |
| No production context | Availability may still compute; Performance/OEE not | WARNING (custom/hour); MANDATORY fail for `window=order` | `MISSING_PRODUCTION_CONTEXT` | 200 with `oee: null` if equipment exists; 404 if none | Warn `oee_context_missing` |
| Missing ideal cycle time | Same as no usable context for Performance | MANDATORY on context document | `MISSING_IDEAL_CYCLE` | 200, `performance`/`oee` null | Warn `oee_ideal_cycle_missing` |
| No machine states | Entire window unobserved; do not invent STOPPED | MANDATORY for Availability | `MISSING_MACHINE_STATE` | 200, `availability`/`oee` null | Warn `oee_state_unobserved` |
| No counts | Counts remain null; never default to 0 | WARNING `COUNTS_UNAVAILABLE` if no baseline | `MISSING_COUNTER_DATA` | 200, `oee` null | Info `oee_counts_unavailable` |
| Zero runtime, zero counts | Availability 0 if planned time > 0; Quality undefined | INFORMATIONAL | `MISSING_QUALITY_DATA` | 200, `oee` null | Info |
| Zero runtime, counts > 0 | Performance null (no time to evaluate speed) | WARNING | `INSUFFICIENT_OBSERVATION` or `MISSING_QUALITY_DATA` depending on remaining inputs | 200, `oee` null | Warn `oee_counts_without_runtime` |
| Zero production, runtime > 0 | Performance 0, Quality null, OEE null | INFORMATIONAL | `MISSING_QUALITY_DATA` | 200, `oee: null` | Info |
| 100% reject | Quality 0, OEE 0 | INFORMATIONAL | `COMPLETE` | 200, `oee: 0` | Info |
| Late event | Include by event time; recalc window | INFORMATIONAL | Same status model as a closed window | 200 superseded row | Info `oee_late_event` |
| Duplicate `eventId` | First wins | INFORMATIONAL | Unchanged | Unchanged | Debug `oee_duplicate_event` |
| Counter reset | `produced += current` | WARNING | Unchanged if otherwise complete | 200 | Warn `oee_count_reset` |
| Out-of-order event | Sort by event time then `eventId`; replay timeline | INFORMATIONAL | Unchanged | 200 after recalc | Info `oee_out_of_order` |
| REST source unavailable | Use cached context if present; else missing context | WARNING | `MISSING_PRODUCTION_CONTEXT` if no cache | 200 last result or null OEE; Health DOWN on source | Error `rest_source` (no token in logs) |
| MQTT unavailable | Consumer health DOWN; stored events still calculate | WARNING | Recalculate from stored events | 200 last result; Health DOWN | Error `mqtt_disconnected` |
| Storage unavailable | No write, no fake zero OEE | MANDATORY | N/A | **503** | Error `timeseries_unavailable` |
| Invalid payload / schema | Reject event | MANDATORY | N/A for that event | Unchanged previous result | Warn `oee_invalid_payload` (redacted) |
| Equipment ID mismatch | Reject event | MANDATORY | N/A | Unchanged | Warn `oee_identity_mismatch` |

HTTP 200 + `oee: 0` is allowed only for `COMPLETE` when Quality is 0 (for example 100% reject).
`oee: null` is required when any required component is missing.
Storage failure must not look like zero OEE.
