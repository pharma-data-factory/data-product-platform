# Distribution channels

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Distribution metadata describes where a Golden Path release is approved
to be distributed. It is not an entitlement, license, or billing system.

| Channel | Status | Meaning |
| --- | --- | --- |
| INTERNAL | AVAILABLE | Used by Pharma Data Factory engineers |
| TEMPLATE_EDITION | AVAILABLE FOR PILOT | Approved certified templates for a controlled Template Edition pilot. Not commercially distributable while legal gates are OPEN |
| PLATFORM_EDITION | PLANNED | Future customer-hosted Control Plane. Not available. |
| SAAS | FUTURE | Future managed service entitlements. Not available. |

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef muted fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A

  REL[Golden Path Release]
  INT[Internal<br/>AVAILABLE]
  TMP[Template Edition<br/>AVAILABLE FOR PILOT]
  AWS[AWS Marketplace<br/>adapter / not listed]
  PLT[Platform Edition<br/>PLANNED]
  INST[Customer Installation<br/>PLANNED]
  SAAS[SaaS<br/>FUTURE]
  ENT[Entitlement<br/>FUTURE]

  REL --> INT
  REL --> TMP --> AWS
  REL --> PLT --> INST
  REL --> SAAS --> ENT

  class REL,INT,TMP teal
  class AWS,PLT,INST,SAAS,ENT muted
```

Do not present Platform Edition or SaaS as available. Commercial
entitlement is enforced separately from technical release status.
AWS Marketplace does not deliver a template ZIP.

Related: [deployment models](../architecture/deployment-models.md),
[Template Edition](../template-edition.md).
