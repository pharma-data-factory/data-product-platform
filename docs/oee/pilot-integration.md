# OEE Pilot Integration Proof 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Local/containerized proof that a **generated** OEE Data Product can run
end-to-end against Test MES and a real MQTT broker before a plant
connection. Formulas and contracts are unchanged.

This is not GxP validation, not AWS Marketplace, and not a production
sizing exercise.

## Topology

```text
Test MES
   │ REST production-context 1.0.0
   ▼
REST Source
   │

MQTT Publisher / Machine Simulator
   │
   ▼
MQTT Broker (Mosquitto, anonymous PILOT-LOCAL only)
   │
   ▼
MQTT Consumer
   │
   └─────────────┐
                 ▼
          OEE Data Product (generated pilot-oee-line-01)
                 │
          Time-Series Store (SQLite)
                 │
                 ▼
             REST API
```

The Control Plane / Backstage is not required at runtime.

## Generated product

`python data-product-platform/pilot/oee/generate.py` renders
`templates/oee-data-product/content` to
`pilot/oee/generated/pilot-oee-line-01` with the same values Marketplace
Create would apply.

## Durable vs not durable

Durable in SQLite:

- raw machine-state, production-count, quality-count events
- last production-context cache
- calculated OEE result rows

Intentionally not durable:

- in-memory duplicate counter
- last rejected-payload quality buffer
- MQTT connected flag / reconnect backoff
- REST Source last error string
- in-process observability counters

## Mosquitto

Anonymous mode is **pilot-local only**. Plant / production requires
credentials, TLS, and broker authorization.

## GitHub

Live publish is `GITHUB_LIVE_PROOF_NOT_RUN` unless
[oee-github-integration-test.md](../developer/oee-github-integration-test.md)
is executed in a controlled org.

Developer sequence: [OEE pilot how-to](../how-to/oee-pilot.md).
Vendoring review: [pilot-vendoring.md](pilot-vendoring.md).
