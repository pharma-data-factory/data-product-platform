# Observability

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

Structured logging, request correlation ID (`X-Request-ID`), in-process
metrics, request timing, and error counters.

Does not require Prometheus, OpenTelemetry, or Grafana. `InMemoryMetrics`
is the adapter seam for those backends later.

Python package: `pdf-observability`.

## Security

No credentials. Correlation IDs are request headers, not secrets. Credential-like
log fields are masked. Do not deploy Prometheus, OpenTelemetry, or Grafana in
this wave.
