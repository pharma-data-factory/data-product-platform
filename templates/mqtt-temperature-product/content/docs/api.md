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

## `GET /api/v1/temperatures`

Returns recent stored temperature events.

## `POST /api/v1/temperatures`

Stores a temperature event without an MQTT broker. Returns `201` for a new
`eventId` and `200` when the same `eventId` is replayed.

```bash
curl -X POST http://localhost:8080/api/v1/temperatures ^
  -H "Content-Type: application/json" ^
  -d "{\"eventId\":\"evt-probe-1\",\"deviceId\":\"probe-1\",\"timestamp\":\"2026-08-16T17:00:00Z\",\"temperature\":4.2,\"unit\":\"C\"}"
```

## `GET /api/v1/platform-metadata`

Reports the Pharma Data Factory standard, SDK, template, and contract
versions. This is technical platform metadata, not GxP validation.

```json
{
  "dataProductStandardVersion": "1.0.0",
  "sdkVersion": "1.0.0",
  "template": "${{ values.templateName }}",
  "templateVersion": "${{ values.templateVersion }}",
  "contractVersion": "1.1.0"
}
```

## `GET /api/v1/quality`

Returns the latest quality evaluation, including `contractVersion` and
mandatory check results.

In Backstage, open the unique API entity
`${{ values.name }}--temperature-event`. The display name remains
Temperature Event Contract.
