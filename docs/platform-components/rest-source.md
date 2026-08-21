# REST Source

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Generic GET ingestion. Not a SAP/MES client.

```
SOURCE_API_URL=
SOURCE_API_TOKEN=
SOURCE_API_TIMEOUT=10
SOURCE_API_RETRIES=2
SOURCE_API_AUTH_HEADER=Authorization
SOURCE_API_AUTH_SCHEME=Bearer
```

Supports Bearer (or custom) auth header, timeout, retry, structured
response validation hook, and observability. Tokens are environment-only.

Catalog `dependsOn`: Observability.

Do not connect this component to SAP, MES, or customer systems in tests.
Use mock HTTP.

## Error behavior

Timeouts, transport errors, and HTTP status errors are retried up to
`SOURCE_API_RETRIES` (0–5) then raised as `RestSourceError`. Timeout is
bounded to 0.1–60 seconds. Tokens are never logged.

## Security

`SOURCE_API_TOKEN` is a secret. Auth header name and scheme are
configuration, not customer-API knowledge.
