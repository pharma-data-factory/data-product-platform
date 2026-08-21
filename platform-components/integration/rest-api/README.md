# REST API

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

FastAPI host with health, observability, validation handling, API prefix
`/api/v1`, and OpenAPI. No business endpoints.

A Golden Path adds domain routers such as `/api/v1/oee` without modifying
this component.

Depends on Health and Observability.

Python package: `pdf-rest-api`. Runtime proof: Machine Metrics reference Docker image.

## Security

No source credentials. Correlation ID is propagated on `X-Request-ID`.
