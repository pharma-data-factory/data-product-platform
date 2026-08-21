# Cold Chain via Unified Namespace

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Readiness only. **No Cold Chain business logic in this phase.**

```text
Temperature sensor
        ↓
Unified Namespace / MQTT
        ↓
temperature-value contract
        ↓
Cold Chain Data Product
```

This demonstration contract is not the MQTT Temperature Golden Path
`temperature-event` contract.

Catalog: `example-cold-chain-data-product` `dependsOn`
`component:default/unified-namespace`.
