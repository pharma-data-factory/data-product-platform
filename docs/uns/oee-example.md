# OEE via Unified Namespace

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Readiness only. **Do not calculate OEE in this phase.**

OEE 1.0 domain design: [OEE Domain & Contract Design](../oee/index.md).
Unified Namespace is optional (Mode B). Direct MQTT Consumer is Mode A.

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  MES[MES production context] --> REST[REST Source]
  MACH[Machine events] --> UNS[UNS / MQTT]
  REST --> OEE[OEE Data Product]
  UNS --> OEE
  OEE --> API[OEE API / Dashboard]
  OEE --> A[Availability]
  OEE --> P[Performance]
  OEE --> Q[Quality]

  class UNS teal
  class OEE navy
```

Catalog: `example-oee-data-product` `dependsOn` `component:default/unified-namespace`.
That entity is an architectural placeholder, not a Golden Path.
