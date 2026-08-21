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

Consumers must distinguish **OEE = 0** from **OEE cannot be calculated**.

| Status | Meaning | `oee` field |
| --- | --- | --- |
| `VALID` | Inputs sufficient; ratios published | Number (may be `0` or `> 1` if Performance `> 1`) |
| `NO_PRODUCTION` | Planned production exists and window `totalCount = 0` | `0` when Availability is defined; else `null` |
| `INCOMPLETE` | Missing context, cycle time, or entire state timeline | `null` |
| `INVALID_INPUT` | Mandatory quality failed for the request (bad window, failed context) | `null`; HTTP 400 on explicit bad query |
| `PENDING_LATE_DATA` | Window still open (`windowEnd > calculatedAt`) | Number or `null` as of now; not final |

Precedence when several apply:

1. `INVALID_INPUT`
2. `PENDING_LATE_DATA` (open window)
3. `NO_PRODUCTION`
4. `INCOMPLETE`
5. `VALID`

`completeness` (`COMPLETE` / `PARTIAL` / `INCOMPLETE`) remains input
coverage. It can be `PARTIAL` on a `VALID` result (some unobserved time
already subtracted).

## Quality endpoint

Future `GET /api/v1/quality` reuses the Golden Path quality-report
shape (check name, passed/failed, class). It does not invent a second
quality language.
