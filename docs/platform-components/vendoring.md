# Vendoring and reuse

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

## Current reuse mechanism

```
Platform Component source
        ↓
vendor snapshot
        ↓
generated Data Product
        ↓
Python import
```

OEE copies CERTIFIED Wave 1 snapshots into `vendor/` (Health,
Observability, MQTT Consumer, REST Source, Time-Series Storage, REST
API). The generated service imports packages such as `pdf_rest_source`
and runs without Backstage.

This keeps generated products independent from the Control Plane.

## Limitation

Multiple generated products create multiple copies of the same
component implementation. Security and bug fixes must be recopied.

Do **not** introduce a package registry in this wave.

## Future option

Internal package registry — **FUTURE / EVALUATE**.

OEE-specific assessment: [OEE Wave 1 vendoring](../oee/pilot-vendoring.md).
