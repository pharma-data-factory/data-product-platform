# Health

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

Reusable health/readiness convention. Not a Data Product.

- Liveness: `GET /health` → `{ status, service, version }`
- Readiness: `GET /health/ready` with optional injected dependency checks
- No product-specific dependencies in the base component

Configuration: none (service name and version are passed by the host).
Secrets: none.

Python package: `pdf-health`.

## Security

No secrets. Service name and version are host arguments, not environment
credentials.
