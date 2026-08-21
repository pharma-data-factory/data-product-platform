# Health

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Reusable liveness and readiness convention. Python package `pdf-health`.

## Liveness

`GET /health` reports that the process is running. It does not probe
product-specific dependencies.

```json
{
  "status": "UP",
  "service": "machine-metrics-reference",
  "version": "1.0.0"
}
```

## Readiness

`GET /health/ready` runs optional injected checkers. A Data Product
supplies those checkers at composition time.

## Dependency health

The base component has no MQTT, REST source, store, or domain checks.
Inject checkers such as MQTT connected or store reachable from the
host. A failed or raising checker marks readiness `DOWN` and does not
change liveness.

## Error behavior

Liveness never raises. A checker exception becomes a `DOWN` check with
`detail` set to the error message. The JSON model is deterministic:
`{ status, service, version }` for liveness; readiness adds `checks`
when checkers are present (`response_model_exclude_none`).

CERTIFIED is technical only. Not GxP.
