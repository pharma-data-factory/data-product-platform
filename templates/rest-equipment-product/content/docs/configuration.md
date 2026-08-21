# Configuration

Copy `.env.example` to `.env`. Do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `SOURCE_API_URL` | External equipment API. Empty disables source fetch. |
| `SOURCE_API_TOKEN` | Optional bearer token |
| `SOURCE_API_TIMEOUT` | HTTP timeout in seconds. Default `10`. |
| `SQLITE_PATH` | SQLite file path. Default `data/equipment.db`. |

The service name and version come from the project manifest and
`catalog-info.yaml`.
