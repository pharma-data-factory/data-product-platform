# OEE Pilot Limitations

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PLATFORM ADMIN  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

Explicit boundaries for the first OEE Golden Path. Do not hide them in
marketing copy.

| Limitation | Meaning |
| --- | --- |
| Single instance | One writer process; SQLite file is not multi-node |
| SQLite | Pilot proof only; not HA production storage |
| No GxP claim | CERTIFIED is technical platform status only |
| No regulatory validation | Not CSV, not Annex 11 evidence |
| No production HA | No clustering, no failover story |
| No UNS dependency | Mode A MQTT Consumer; UNS remains DEVELOPMENT |
| No AAS dependency | Configured `equipmentId` is enough |
| No Kafka | Not an input |
| No AI / RAG / LLM | Out of MVP scope |
| No core-system DB access | No MES/ERP/LIMS/EWM tables |
| No dashboard in MVP | REST API only; consumers later |
| Not commercially listed | Technical Marketplace card only; commercial availability is FUTURE; no AWS Marketplace entitlements |

Timezone: UTC internally. No global shift calendar ships in 1.0.
