# Time-Series Storage

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

Generic points: timestamp, entityId, metric, value, unit, tags.

SQLite MVP. Interface: `write_point`, `query_range`, `latest`,
`delete_before` (retention seam). Future adapters: TimescaleDB, InfluxDB,
AWS Timestream — not dependencies in this version.

Not an OEE schema.

Python package: `pdf-timeseries`.

## Security

SQLite path is local file configuration, not a credential. Future
TimescaleDB/InfluxDB/Timestream adapters must keep secrets in the
environment.
