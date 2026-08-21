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
| No production context | Availability may still compute; Performance/OEE not | WARNING (custom/hour); MANDATORY fail for `window=order` | `INCOMPLETE` | 200 with `oee: null` if equipment exists; 404 if none | Warn `oee_context_missing` |
| Missing ideal cycle time | Same as no usable context for Performance | MANDATORY on context document | `INCOMPLETE` | 200, `performance`/`oee` null | Warn `oee_ideal_cycle_missing` |
| No machine states | Entire window unobserved; do not invent STOPPED | MANDATORY for Availability | `INCOMPLETE` | 200, `availability`/`oee` null | Warn `oee_state_unobserved` |
| No counts | `totalCount=0`; zero-production guards | WARNING `COUNTS_UNAVAILABLE` if no baseline | `NO_PRODUCTION` if planned time > 0 | 200, `oee` 0 or null per guards | Info `oee_counts_unavailable` |
| Zero runtime, zero counts | Availability 0 if planned time > 0 | INFORMATIONAL | `NO_PRODUCTION` or `VALID` with `oee=0` | 200 | Info |
| Zero runtime, counts > 0 | Performance null (no time to evaluate speed) | WARNING | `INCOMPLETE` | 200, `oee` null | Warn `oee_counts_without_runtime` |
| Zero production, runtime > 0 | Performance 0, Quality null, OEE 0 | INFORMATIONAL | `NO_PRODUCTION` | 200, `oee: 0` | Info |
| 100% reject | Quality 0, OEE 0 | INFORMATIONAL | `VALID` | 200, `oee: 0` | Info |
| Late event | Include by event time; recalc window | INFORMATIONAL | Closed: previous status; open: `PENDING_LATE_DATA` | 200 superseded row | Info `oee_late_event` |
| Duplicate `eventId` | First wins | INFORMATIONAL | Unchanged | Unchanged | Debug `oee_duplicate_event` |
| Counter reset | `produced += current` | WARNING | Unchanged if otherwise valid | 200 | Warn `oee_count_reset` |
| Out-of-order event | Sort by event time then `eventId`; replay timeline | INFORMATIONAL | Unchanged | 200 after recalc | Info `oee_out_of_order` |
| REST source unavailable | Use cached context if present; else incomplete | WARNING | `INCOMPLETE` if no cache | 200 last result or incomplete; Health DOWN on source | Error `rest_source` (no token in logs) |
| MQTT unavailable | Consumer health DOWN; stored events still calculate | WARNING | `PENDING_LATE_DATA` if current window | 200 last result; Health DOWN | Error `mqtt_disconnected` |
| Storage unavailable | No write, no fake zero OEE | MANDATORY | `INVALID_INPUT` not used | **503** | Error `timeseries_unavailable` |
| Invalid payload / schema | Reject event | MANDATORY | N/A for that event | Unchanged previous result | Warn `oee_invalid_payload` (redacted) |
| Equipment ID mismatch | Reject event | MANDATORY | N/A | Unchanged | Warn `oee_identity_mismatch` |

HTTP 200 + `oee: 0` is allowed only for `VALID` or `NO_PRODUCTION`.
Storage failure must not look like zero OEE.
