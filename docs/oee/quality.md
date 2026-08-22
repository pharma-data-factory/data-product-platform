# OEE Data Quality 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

OEE-specific checks on top of the existing Data Product quality-report
semantics (`DEVELOPMENT` / `TESTED` / `CERTIFIED` on the product, and
the quality endpoint used by MQTT Temperature / REST Equipment).

Failed **MANDATORY** checks reject the event or context document: it is
not stored and not used in calculation. **WARNING** still stores and
calculates, and is visible on `/api/v1/quality` and on `oee-result`.
**INFORMATIONAL** is logged only.

## Checks

| Check | Class | Fail / warn when |
| --- | --- | --- |
| Production context present | MANDATORY for Performance and `windowKind=order`; WARNING for Availability-only custom windows | No context for `equipmentId` covering the window |
| Equipment IDs align | MANDATORY | Envelope `source.equipment` ≠ payload `equipmentId` when both exist |
| Ideal cycle time `> 0` | MANDATORY on context | Missing or `<= 0` |
| Planned window valid | MANDATORY | `plannedEnd <= plannedStart` or missing |
| Machine state valid | MANDATORY | Not in `RUNNING`, `STOPPED`, `IDLE`, `MAINTENANCE` |
| Timestamp valid | MANDATORY | Missing, not timezone-aware ISO-8601 |
| Future timestamp | MANDATORY | Event time `> calculatedAt + 5 minutes` |
| Counts non-negative integers | MANDATORY | Negative, non-integer, non-finite |
| `goodCount` and `rejectCount` paired | MANDATORY | One present without the other on quality events |
| `goodCount <= totalCount` (event) | MANDATORY when quality `totalCount` present | `goodCount > totalCount` |
| `rejectCount <= totalCount` (event) | MANDATORY when quality `totalCount` present | `rejectCount > totalCount` |
| Duplicate `eventId` | INFORMATIONAL | Later copies ignored (first wins) |
| Counter reset | WARNING | Cumulative reading `<` previous; still apply reset algorithm |
| State timeline complete | WARNING | Any unobserved time in the window (`completeness=PARTIAL`) |
| Entire window unobserved | MANDATORY for Availability | No state at or before `windowStart` and none inside → `availability` null |
| Window bounds | MANDATORY | `windowStart >= windowEnd` |
| Context `contextId` present | MANDATORY | Missing `contextId` |

Window-level `goodCount` (quality stream) `>` production `totalCount` is
**WARNING** (`COUNT_MISMATCH`), not a rewrite of counts.

## calculationStatus

Consumers must distinguish **OEE cannot be calculated** (`oee: null`) from a
calculated value, including `0`.

| Status | Meaning | `oee` field |
| --- | --- | --- |
| `COMPLETE` | Inputs sufficient; A × P × Q published | Number (may be `0` or `> 1` if Performance `> 1`) |
| `MISSING_PRODUCTION_CONTEXT` | No production-context document | `null` |
| `MISSING_MACHINE_STATE` | No observed machine-state intervals | `null` |
| `MISSING_IDEAL_CYCLE` | Context present without a positive ideal cycle | `null` |
| `MISSING_COUNTER_DATA` | No counter / production counts | `null` |
| `MISSING_QUALITY_DATA` | No quality counts, or Quality undefined (`totalCount = 0`) | `null` |
| `INSUFFICIENT_OBSERVATION` | Bad window, or no usable planned production time after excluding unobserved time | `null` |

Missing inputs are never estimated and never defaulted to 0 or 1.

Precedence when several apply:

1. `INSUFFICIENT_OBSERVATION` for invalid windows
2. `MISSING_MACHINE_STATE`
3. `INSUFFICIENT_OBSERVATION` when planned production time is 0
4. `COMPLETE` when `oee` is not null
5. `MISSING_PRODUCTION_CONTEXT`
6. `MISSING_IDEAL_CYCLE`
7. `MISSING_COUNTER_DATA`
8. `MISSING_QUALITY_DATA`

`completeness` (`COMPLETE` / `PARTIAL` / `INCOMPLETE`) remains input
coverage. It can be `PARTIAL` on a `COMPLETE` result (unobserved time
already excluded from the basis).

## Quality endpoint

Future `GET /api/v1/quality` reuses the Golden Path quality-report
shape (check name, passed/failed, class). It does not invent a second
quality language.
