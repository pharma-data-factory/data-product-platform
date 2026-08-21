# OEE Source Mapping 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

Canonical OEE is source-system neutral. Adapters live in generated
`app/ingestion/mappings.py` (DOMAIN OWNED). The calculator must not
import SAP, MES, or PLC tag names.

```text
MES HTTP JSON          PLC / MQTT payload
        │                      │
        ▼                      ▼
 Source Adapter          Source Adapter
        │                      │
        ▼                      ▼
 production-context     machine-state-event
                        production-count-event
                        quality-count-event
        │                      │
        └──────────┬───────────┘
                   ▼
            OEE calculator
```

## REST Source

REST Source 1.x performs generic GET (URL, token, timeout, retries).
It does not know MES. The adapter maps the response body onto
`production-context` 1.0.0 (`contextId`, `equipmentId`, plan times,
`idealCycleTimeSeconds`, …).

Typical source: MES. Not: MES database, SAP table, LIMS, EWM.

## MQTT Consumer

MQTT Consumer 1.x delivers `(topic, payload)`. The adapter:

1. Parses payload JSON.
2. Maps to one of the three event contracts.
3. For Mode A, synthesizes identity from payload fields (and optional
   topic capture groups). It does **not** require a UNS envelope.

Topic pattern is runtime config, not a Catalog annotation.

## Mode A vs Mode B

| | Mode A (pilot) | Mode B (future) |
| --- | --- | --- |
| Transport | MQTT Consumer 1.x on approved topics | UNS then MQTT Consumer |
| Envelope | Optional; payload may be enough | UNS event envelope |
| Domain contracts | Identical | Identical |
| Calculator | Unchanged | Unchanged |

Do not make UNS mandatory. Do not CERTIFY UNS for this design.

## AAS (optional)

Future OEE may resolve through AAS Foundation:

- equipment identity aliases → `equipmentId`
- units (seconds vs minutes for cycle time)
- sensor / state semantics
- REST/MQTT endpoint lookup

MVP works with a configured `equipmentId` string and Create-time MQTT
topic / REST URL. AAS is not a blocker. Do not store OEE results in AAS.

See [AAS + OEE](../aas/oee.md).
