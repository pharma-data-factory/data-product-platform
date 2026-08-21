# Quality Rules

`GET /api/v1/quality` evaluates stored events against mandatory rules.

| Check | Rule |
| --- | --- |
| `eventId_not_empty` | `eventId` is not empty |
| `deviceId_not_empty` | `deviceId` is not empty |
| `timestamp_iso8601` | `timestamp` is a valid ISO-8601 datetime |
| `temperature_within_limits` | value is within `TEMPERATURE_MIN` / `TEMPERATURE_MAX` |
| `unit_allowed` | `unit` is `C` or `F` |
| `contract_schema` | payload matches the published JSON Schema |

A failing mandatory check returns `"status": "FAIL"` and fails CI.

Default technical limits: `-50` to `150`.

Quality badges in the Data Product Platform (`DEVELOPMENT`, `TESTED`,
`CERTIFIED`) are technical platform status only. They are not GxP or
regulatory validation.
