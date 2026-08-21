# Wave 1 Conformance Matrix

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Technical conformance only. Not GxP validation.

| Component | Version | Tests | Docs | Config | Security | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Health | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |
| Observability | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |
| REST API | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |
| REST Source | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |
| MQTT Consumer | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |
| Time-Series Storage | 1.0.0 | PASS | PASS | PASS | PASS | PASS | CERTIFIED |

Machine Metrics Reference is a composition proof (TESTED), not a
component in this matrix.

## Proof coverage

| Component | Proof |
| --- | --- |
| Health | Liveness, readiness, injected dependency-check seam, deterministic `HealthPayload` |
| Observability | Structured logging, correlation ID, request timing, error counters, metrics abstraction, no monitoring backend |
| REST API | FastAPI bootstrap, `/api/v1`, OpenAPI, validation errors, standard exceptions, health + observability, no domain routers |
| REST Source | GET, auth header abstraction, bounded timeout/retry, error model, validation hook, no customer API |
| MQTT Consumer | Connect, subscribe, reconnect (bounded/configurable), handler callback, disconnected health, TLS seam, no topic/domain logic |
| Time-Series | `write_point`, `latest`, `query_range`, generic entityId/metric/value/unit/tags, SQLite adapter, replaceable store protocol |

A failing column keeps that component TESTED or lower.
