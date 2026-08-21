# REST Source

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

Generic GET client. No SAP/MES/customer API.

```
SOURCE_API_URL=
SOURCE_API_TOKEN=
SOURCE_API_TIMEOUT=10
SOURCE_API_RETRIES=2
```

Timeout is bounded to 0.1–60 seconds. Retries are bounded to 0–5.

Supports auth header abstraction, timeout, retry, validation hook, and
observability. Tokens stay in environment variables.

Python package: `pdf-rest-source`.

## Security

`SOURCE_API_TOKEN` is a secret. Never commit it, print it, or store it
in Catalog. Tests use mock HTTP, not customer systems.
