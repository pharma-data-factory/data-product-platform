# OEE Edge Cases 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Canonical behavior when inputs are missing, late, duplicated, or
inconsistent. Implementation must follow these rules; this file is not
runtime.

## Missing machine states

If no state event exists at or before `windowStart`, time until the
first state in the window is **unobserved**.

- Unobserved seconds are removed from `plannedProductionSeconds`.
- They are not runtime and not downtime.
- `completeness = PARTIAL` if any unobserved time remains.

Do not invent `STOPPED` for silence. That would be site-specific.

If the entire window is unobserved: `availability = null`,
`completeness = INCOMPLETE`, `oee = null`.

## Overlapping states

Producers may emit overlapping or simultaneous states.

Normalization:

1. Sort by event time, then `eventId`.
2. Each event ends the previous state at its timestamp.
3. Two events with the same timestamp: the greater `eventId` (UUID
   string compare) wins; the other is ignored as superseded, not stored
   as active.
4. After this, the timeline has no overlaps.

Do not keep two active states. Do not average them.

## Missing or conflicting ideal cycle time

| Situation | Behavior |
| --- | --- |
| No context, or `idealCycleTimeSeconds` missing | `performance = null`, `oee = null`, `completeness = INCOMPLETE` |
| `idealCycleTimeSeconds <= 0` | Context fails quality; same result as missing |
| Two context rows overlap the window with different cycle times | Use the row whose `plannedStart` is latest and still `<= windowStart` (or latest overlap). Set `completeness = PARTIAL`. Do not average cycle times. |
| Cycle time changes mid-window | Split is **not** in 1.0. Use one cycle time per result row as above. |

## Count resets

A cumulative reading lower than the previous reading is a reset.

```text
produced += current_reading   # not current - previous
```

Resets may happen on power cycle, order change, or counter overflow.
OEE 1.0 does not classify the cause.

A drop of 0 is not a reset. Only `current < previous`.

## Duplicate events

| Duplicate kind | Behavior |
| --- | --- |
| Same `eventId` | First accepted wins; later copies ignored |
| Different `eventId`, identical payload and timestamp | Both stored; count delta of the second is 0 if cumulative reading is unchanged |
| Same `eventId` after a quality reject of the first | The retry may be accepted if the first never stored |

## Late events

See [Time windows](time-windows.md#late-events). Late is processing time
only. Recalculate the same window key when a late event is accepted.

## Zero production

`totalCount = 0` after deltas:

- If `runtimeSeconds > 0`: `performance = 0`, `quality = null`, `oee = 0`.
- If `runtimeSeconds = 0` and `plannedProductionSeconds > 0`:
  `availability = 0`, `performance = null`, `quality = null`, `oee = 0`.
- If there was no planned production: `oee = null`.

Zero production is valid, not a quality failure.

## Invalid counts

Reject at the quality gate (event not used):

- Negative `totalCount`, `goodCount`, or `rejectCount`
- Non-integer counts
- Missing required count fields
- `goodCount` or `rejectCount` present without the other on
  `quality-count-event`

Window-level `goodCount > totalCount` (production stream) does not rewrite
counts; it sets `reconciliationStatus = COUNT_MISMATCH`.

## Maintenance windows

Two inputs can exclude time from planned production:

1. State `MAINTENANCE` (default mapping).
2. `plannedDowntime[]` on production context.

Use the **union** of those intervals. Do not double-subtract.
Maintenance inside planned production is not downtime (`downtimeSeconds`
excludes it).

## Planned downtime

Declared on production context. Kinds are informational (`MAINTENANCE`,
`BREAK`, `CHANGEOVER`, …). OEE 1.0 treats every `plannedDowntime`
interval the same: exclude from planned production. Do not map kind
strings to site-specific Availability vs Performance losses.

Unplanned `STOPPED` / `IDLE` during a planned-downtime interval sits
inside excluded time and does not add `downtimeSeconds`.

## Missing counts

No production or quality events in/before the window:

- `totalCount = 0`, `goodCount = 0`, `rejectCount = 0`
- Apply zero-production guards
- `reconciliationStatus = COUNTS_UNAVAILABLE` if no count events exist
  at all for that equipment in the window (including no baseline)

A baseline reading at or before `windowStart` with no later reading
means zero production, not unavailable counts.

## Conflicting envelope and payload identity

If Mode B envelope `source.equipment` ≠ payload `equipmentId` (when
both exist): reject the event.

## Clock skew

Timestamps far in the future (after `calculatedAt` + 5 minutes) fail
quality. Past timestamps are allowed (late/out-of-order). The 5-minute
skew bound is operational, not a published contract field.
