# OEE REST API 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

Implemented by the OEE Data Product Golden Path using REST API 1.x
(`/api/v1` prefix, Health, Observability middleware).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness / readiness (Health 1.x) |
| GET | `/api/v1/oee` | Latest or filtered `oee-result` list |
| GET | `/api/v1/oee/{equipmentId}` | Results for one equipment |
| GET | `/api/v1/oee/{equipmentId}/current` | Open or latest closed window |
| GET | `/api/v1/oee/{equipmentId}/history` | Closed windows |
| GET | `/api/v1/quality` | Quality-report (existing Golden Path semantics) |

Do not add per-factor endpoints (`/availability`, `/performance`).
Those values live on `oee-result`.

## Query parameters

| Name | Applies to | Meaning |
| --- | --- | --- |
| `from` | list, history | Window start `>=` (ISO-8601) |
| `to` | list, history | Window end `<=` (ISO-8601) |
| `window` | all OEE GETs | `hour` \| `day` \| `shift` \| `order` \| `custom` |
| `orderId` | all OEE GETs | Filter when `window=order` |

`/current` without `window` defaults to `custom` spanning
`[now-1h, now)` in UTC until Create-time default window is set.

## HTTP mapping

| Situation | Status | Body |
| --- | --- | --- |
| Result exists | 200 | `oee-result` or array |
| Equipment unknown / no rows | 404 | Problem details, no fake `oee: 0` |
| Bad `from`/`to`/`window` | 400 | `calculationStatus` not used; query invalid |
| Storage unavailable | 503 | Health readiness DOWN |
| MQTT/REST source down | 200 if stored results exist | Health may be DOWN; `calculationStatus` as stored |

Never return HTTP 200 with `oee: 0` to mean “cannot calculate”.
Use `calculationStatus` and nullable `oee`.
