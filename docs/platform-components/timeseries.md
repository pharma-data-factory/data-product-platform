# Time-Series Storage

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Generic points: timestamp, entityId, metric, value, unit, tags.

SQLite MVP. Interface: `write_point`, `query_range`, `latest`,
`delete_before`. Future adapters (TimescaleDB, InfluxDB, AWS Timestream)
are documented seams, not dependencies.

Not an OEE schema.

Python package: `pdf-timeseries`.

## OEE storage decision

**SQLITE_ACCEPTABLE_FOR_OEE_PILOT** for a single-instance, low-volume
controlled pilot (one equipment or a small line, operator-scale event
rates, local file backup).

SQLite is not production-grade multi-instance storage. Concurrent writers,
shared network files, long retention, and multi-replica reads need a
later backend behind the existing `TimeSeriesStore` protocol
(TimescaleDB / InfluxDB / Amazon Timestream seams). Do not introduce a
new database automatically.

## Error behavior

Invalid points fail Pydantic validation at the public boundary. SQLite
errors propagate to the caller. `delete_before` is a retention seam;
callers choose the cutoff.

## Security

`TIMESERIES_SQLITE_PATH` is configurable. SQLite is a local file, not a
credential. Future adapters must keep database secrets in the
environment.
