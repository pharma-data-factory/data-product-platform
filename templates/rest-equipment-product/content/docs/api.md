# API

Base URL for local development: `http://localhost:8080`

## `GET /health`

```json
{
  "status": "UP",
  "service": "${{ values.name }}",
  "version": "${{ values.version }}"
}
```

## `GET /api/v1/equipment`

Returns stored equipment records.

## `POST /api/v1/equipment`

Local mock ingestion path. Returns `201` for a new `equipmentId` and `200`
when the same `equipmentId` is updated.

```bash
curl -X POST http://localhost:8080/api/v1/equipment ^
  -H "Content-Type: application/json" ^
  -d "{\"equipmentId\":\"EQ-1001\",\"name\":\"Bioreactor 01\",\"site\":\"SITE-A\",\"status\":\"ACTIVE\",\"updatedAt\":\"2026-08-17T06:30:00Z\"}"
```

## `POST /api/v1/source/sync`

Fetches equipment from `SOURCE_API_URL` when configured.

## `GET /api/v1/platform-metadata`

Reports the Nexora standard, SDK, template, and contract
versions. This is technical platform metadata, not GxP validation.

```json
{
  "dataProductStandardVersion": "1.0.0",
  "sdkVersion": "1.0.0",
  "template": "${{ values.templateName }}",
  "templateVersion": "${{ values.templateVersion }}",
  "contractVersion": "1.0.0"
}
```

## `GET /api/v1/quality`

Returns the latest quality evaluation, including `contractVersion` and
mandatory check results.

In Backstage, open the unique API entity
`${{ values.name }}--equipment-event`. The display name remains
Equipment Event Contract.
