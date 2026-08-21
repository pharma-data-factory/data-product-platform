# OEE Storage 1.0 (design)

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

Pilot storage is **SQLite** through certified Time-Series Storage 1.x
(`TimeSeriesStore`). Verdict: `SQLITE_ACCEPTABLE_FOR_OEE_PILOT`
(single instance). Domain logic must not import sqlite3.

## Datasets

| Dataset | How | Notes |
| --- | --- | --- |
| Raw machine state | Metric `oee.raw.machine_state` (value encoded as state enum index or tag `state=`) | Event time = point timestamp; `eventId` in tags |
| Raw production counts | `oee.raw.total_count` | Cumulative reading |
| Raw quality counts | `oee.raw.good_count`, `oee.raw.reject_count` | Cumulative readings |
| Production context cache | `oee.raw.context` plus tags `contextId`, `orderId` | Cache of last GET; not MES master data |
| Derived OEE | `oee.availability`, `oee.performance`, `oee.quality`, `oee.oee` | Ratios; nulls omitted or tagged `calculationStatus` |
| Derived durations | `oee.runtime_seconds`, `oee.downtime_seconds`, `oee.planned_production_seconds` | |
| Derived counts | `oee.total_count`, `oee.good_count`, `oee.reject_count` | Window deltas |

Entity id = `equipmentId`. Tags: `windowKind`, `orderId`, `windowStart`.

Do not copy MES/ERP material masters, BOMs, or user directories into
SQLite. Context cache holds only `production-context` 1.0.0 fields.

## Upgrade path

`TimeSeriesStore` already declares TimescaleDB, InfluxDB, and Amazon
Timestream as NotImplemented seams. Changing the backend must not
change:

- formulas
- contracts
- REST paths
- calculator / timeline / counter modules

Pilot limitation: one writer process. Multi-instance requires a later
backend, not a domain rewrite.
