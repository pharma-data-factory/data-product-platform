# Data Quality & Connectivity

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Route: `/quality`

## Required providers

The frontend never calls plant systems directly. It uses Backstage APIs
that hit `nexora-industrial`:

| API | Path |
| --- | --- |
| Quality | `/api/nexora-industrial/quality` |
| Connectivity | `/api/nexora-industrial/connectivity` |

Configure remote bases in `app-config.yaml` under `nexora.providers`.
Leave empty to use local mock fixtures. Never put credentials in
frontend config.

## Supported health states

`HEALTHY` · `WARNING` · `ERROR` · `UNKNOWN`

Minimum checks: freshness, completeness, schema, volume.

Connectivity kinds: MQTT, REST, OPC UA, Kafka, Files, Events. Kafka is
a status label only. This plugin does not deploy Kafka.

## Example payloads

```json
{
  "status": "ok",
  "data": {
    "freshness": { "state": "HEALTHY", "label": "Freshness", "value": "3 sec" },
    "completeness": { "state": "HEALTHY", "label": "Completeness", "value": "99.8 %" },
    "schema": { "state": "HEALTHY", "label": "Schema", "value": "Valid" },
    "volume": { "state": "HEALTHY", "label": "Volume", "value": "Normal" }
  }
}
```

```json
{
  "status": "unconfigured",
  "message": "The equipment is registered in the catalog, but no connectivity provider is configured."
}
```
