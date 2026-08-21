# Quality Rules

`GET /api/v1/quality` evaluates stored records against mandatory rules.

| Check | Rule |
| --- | --- |
| `equipmentId_not_empty` | `equipmentId` is present and not empty |
| `equipmentId_unique` | `equipmentId` is unique among stored records |
| `name_not_empty` | `name` is present and not empty |
| `site_not_empty` | `site` is present and not empty |
| `status_allowed` | `status` is `ACTIVE`, `INACTIVE`, or `MAINTENANCE` |
| `updatedAt_iso8601` | `updatedAt` is a valid ISO-8601 datetime |
| `contract_schema` | payload matches the published JSON Schema |

A failing mandatory check returns `"status": "FAIL"` and fails CI.

Quality badges in the Data Product Platform (`DEVELOPMENT`, `TESTED`,
`CERTIFIED`) are technical platform status only. They are not GxP or
regulatory validation.
