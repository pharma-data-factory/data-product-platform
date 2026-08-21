# REST Source Integration

The generated product includes a configurable REST source client. It is not
an SAP, MES, or other customer-system adapter.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SOURCE_API_URL` | Equipment source URL. Empty disables fetch. |
| `SOURCE_API_TOKEN` | Optional bearer token. Never commit this value. |
| `SOURCE_API_TIMEOUT` | HTTP timeout in seconds. Default `10`. |

Copy `.env.example` to `.env`. Keep tokens out of Git.

## Fetch behavior

`POST /api/v1/source/sync` calls the configured URL and upserts each
valid equipment record.

Accepted payloads:

- a JSON array of equipment objects
- `{ "items": [ ... ] }`

Invalid payloads fail the sync. Empty `SOURCE_API_URL` returns
`source: disabled` and does not call a remote system.

## Local MVP

Leave `SOURCE_API_URL` empty and use `POST /api/v1/equipment` to ingest
the canonical equipment model without an external API.
