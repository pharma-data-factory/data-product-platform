# UNS Consumer Guide

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

Data Products subscribe to governed topics. They do not connect to PLC,
SCADA, MES, or historian databases.

Catalog relation:

```yaml
spec:
  type: data-product
  dependsOn:
    - component:default/unified-namespace
```

Validate the envelope and the referenced payload schema. Treat unknown
topics as out of contract.
