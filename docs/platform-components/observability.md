# Observability

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Reusable structured logging, `X-Request-ID` correlation, request timing,
and error counters. Metrics are in-process (`InMemoryMetrics`).

Python package: `pdf-observability`.

MVP:

- structured logs with correlation id
- request correlation via `X-Request-ID`
- basic metrics abstraction
- request timing
- error counters
- optional Health checker (`observability` is always UP)

Prepared as an adapter seam for Prometheus, OpenTelemetry, and Grafana.
Those backends are not required and not shipped in Wave 1.

No monitoring backend is introduced.

### Pilot minimum

Required: structured stdout logs, health, error counters, credential
redaction. Not required: central metrics backend, distributed tracing,
enterprise monitoring integration, or alerting.

Do not build an observability platform for the pilot.

## Error behavior

Unhandled HTTP exceptions increment `http_errors` and are logged with a
correlation ID. Credential-like extra fields are masked as `***`.
`InMemoryMetrics` stays process-local.

## Security

No credentials. Do not log tokens or passwords. TLS and remote exporters
are out of scope for this wave.
