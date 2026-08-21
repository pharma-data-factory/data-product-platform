# Golden Path lifecycle

Owner: Golden Path Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Official Golden Paths move through a controlled lifecycle. Certification
and release stay separate. None of these states is GxP or regulatory
approval.

Official Golden Paths have two independent fields in release metadata:

- `certification.status`: DEVELOPMENT / TESTED / CERTIFIED
- `status`: DRAFT / TESTING / RELEASED / DEPRECATED / RETIRED

Do not treat CERTIFIED as a release state. CERTIFIED is implementation
status. RELEASED is the Create-offer state. See [Status model](../status-model.md).

| Release state | Meaning |
| --- | --- |
| DRAFT | Under development. Not generally available. |
| TESTING | Automated and manual tests in progress. |
| RELEASED | A specific certified version is approved for consumption. |
| DEPRECATED | Still visible. Replacement and support window are published. Not used for new Create. |
| RETIRED | Not offered for new Data Product creation. Existing products remain visible. |

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef muted fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A

  D[DRAFT] --> T[TESTING]
  T --> R[RELEASED]
  R --> DEP[DEPRECATED]
  DEP --> RET[RETIRED]

  class D,T muted
  class R teal
  class DEP,RET navy
```

A Golden Path can be CERTIFIED and still not RELEASED. MVP 1.0 official
paths are CERTIFIED and RELEASED. Developers consume RELEASED versions
from Marketplace. Commercial availability is a third dimension
(AVAILABLE / PLANNED / FUTURE / BLOCKED).

The TypeScript release transition graph still allows `status: CERTIFIED`
as a pre-RELEASED engineering state. Product communication uses
`certification.status` for CERTIFIED and `status` for RELEASED. Do not
collapse those fields.

Related: [Release management](release-management.md),
[Versioning](versioning.md).
