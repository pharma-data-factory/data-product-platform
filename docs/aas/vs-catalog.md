# AAS vs Backstage Catalog

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Backstage Catalog stores **platform topology**:

- `component:default/aas-foundation` (`spec.type: platform-component`)
- Platform-level `dependsOn` from Data Products to that component

Catalog must **not** contain one Component per sensor. Sensors belong in
the AAS Repository.

Future OEE may declare:

```yaml
spec:
  dependsOn:
    - component:default/aas-foundation
    - component:default/mqtt-consumer
    - component:default/timeseries
    - component:default/rest-api
    - component:default/health
    - component:default/observability
```

That relation is topology. Filler 01 temperature remains AAS metadata.
