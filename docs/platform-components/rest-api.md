# REST API

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Reusable FastAPI host. No business endpoints.

Provides application setup, validation and HTTP error handling, Health
integration, Observability middleware, `/api/v1` prefix, and OpenAPI.

Golden Paths add domain routers:

- `/api/v1/oee`
- `/api/v1/equipment`
- `/api/v1/temperatures`

without modifying this component.

Catalog `dependsOn`: Health, Observability.

## Error behavior

Request validation returns HTTP 422. `HTTPException` is returned as JSON
`{ "detail": ... }`. Unhandled exceptions return HTTP 500
`Internal Server Error` and increment error counters. Domain routers
remain external.
