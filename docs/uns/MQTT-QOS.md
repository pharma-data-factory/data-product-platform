# UNS MQTT QoS & Retention 1.0

## QoS baseline

| Class | QoS | Rationale |
| --- | --- | --- |
| High-frequency telemetry | **0** | Lossy acceptable; latest state retained separately |
| State transitions (`state`, `availability`) | **1** | At-least-once for operating truth |
| Business events (`events/*`, orders, warehouse) | **1** | Operationally important |
| QoS 2 | **Not default** | Cost/complexity; justify per use case |

## Retained messages

| Topic class | Retain |
| --- | --- |
| `state`, `telemetry`, `counts`, `temperature`, `availability`, order/batch/HU `state` | **YES** (latest snapshot) |
| `events/*` | **NO** |

New subscribers receive last retained state immediately; they must not treat event topics as current truth.

## Birth / death

Publish `…/availability` with `ONLINE` / `OFFLINE` / `DEGRADED`.  
Where the client library supports it, set MQTT Last Will to `OFFLINE` on `availability` (retain=true).
