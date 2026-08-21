# Platform Architecture

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: INTERNAL ENGINEERING  
Version: MVP 1.1

Pharma Data Factory is the engineering and governance Control Plane.
IT/OT systems stay systems of record. Data Products sit on governed
interfaces. Consumers bind to contracts, not to source internals.

Canonical engineering notes: [architecture.md](../architecture.md).

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef light fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A

  ITOT["IT/OT Systems<br/>ERP · MES · LIMS · EWM<br/>Historian · CMO / other"]
  GI["Governed Interfaces<br/>API · Events · MQTT · REST · UNS"]
  DP["Data Products"]
  CONS["Consumers"]
  CP["Pharma Data Factory<br/>Control Plane"]

  ITOT --> GI --> DP --> CONS
  CP -.->|catalog · identity · Golden Paths · TechDocs| DP

  class ITOT,GI light
  class DP,CP teal
  class CONS navy
```

## Control Plane capabilities

Marketplace, Create, Catalog, Data Products, TechDocs, Search, identity,
RBAC, GitHub App publishing, CI Quality Gate display, Platform Compliance.

The Control Plane does not store all enterprise data and does not replace
source systems. Unified Namespace is a reusable platform component for
governed MQTT topics. It is not a business Data Product. Asset
Administration Shell Foundation is a reusable platform component for
asset and sensor semantics. AAS is not UNS and is not a historian.

## Five architecture layers

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  L1[Layer 1 Control Plane] --> L2[Layer 2 Data Product Foundation]
  L2 --> L3[Layer 3 Platform Components]
  L3 --> L4[Layer 4 Intelligence Components]
  L3 --> L5[Layer 5 Domain Golden Paths]
  L4 -.-> L5

  class L1,L2 teal
  class L3,L4,L5 navy
```

1. **Control Plane** — Backstage, Catalog, Create, Marketplace, Developer Hub, TechDocs, Search, identity, RBAC, governance.
2. **Data Product Foundation** — Standard, SDK, contracts, quality, compatibility, CI/CD, versioning, platform compliance.
3. **Platform Components** — reusable integration, data, and operations building blocks. Catalog `spec.type: platform-component`.
4. **Intelligence Components** — planned RAG / LLM / Knowledge Graph placeholders. Not implemented.
5. **Domain Golden Paths** — MQTT Temperature, REST Equipment, and OEE now (technically CERTIFIED / RELEASED). Cold Chain, Quality, Energy, AI Assistants later.

```mermaid
flowchart TB
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  F[Platform Foundation] --> C[Platform Components]
  C --> M[Composition]
  M --> G[Golden Paths]
  G --> P[Generated Data Products]

  class F,C teal
  class M,G,P navy
```

Registry: `/platform-components`. See
[Platform Component Library](../platform-components/index.md).

## Developer lifecycle

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  DEV[Developer] --> GP[Golden Path]
  GP --> GH[GitHub]
  GH --> CI[CI/CD]
  CI --> TEST[Tests]
  TEST --> DOCK[Docker]
  DOCK --> CAT[Catalog]
  CAT --> TD[TechDocs]

  class DEV,GP,GH navy
  class CI,TEST,DOCK,CAT,TD teal
```

The technical HOW for developers is also on
`/platform/architecture/developer`. That page links here instead of
creating a second documentation system.

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef light fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A

  CP[Pharma Data Factory Control Plane]
  CAT[Catalog]
  MKT[Marketplace]
  CRT[Create]
  GP[Golden Path]
  MAN[composition manifest]
  PC[Platform Components]
  DP[Generated Data Product]
  RT[Independent runtime]
  CONS[Consumers]

  CP --> CAT
  CP --> MKT
  CP --> CRT
  MKT --> GP
  CRT --> GP
  GP --> MAN --> PC --> DP --> RT --> CONS
  CAT -.->|registers| DP

  class CP,GP,PC,DP teal
  class CAT,MKT,CRT,MAN light
  class RT,CONS navy
```

## AAS versus Unified Namespace

AAS answers what an asset is and what its data means. Unified Namespace
answers where and how operational data flows. Neither replaces ERP, MES,
LIMS or EWM.

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef light fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A

  AAS["AAS<br/>filler-01 · speed · rpm"]
  MAP["maps to"]
  UNS["UNS topic<br/>pharma/basel/packaging/line-01/filler-01/speed/value"]

  AAS --> MAP --> UNS

  class AAS teal
  class MAP light
  class UNS navy
```

## Platform Component composition

Wave 1 Health, Observability, REST API, REST Source, MQTT Consumer and
Time-Series Storage are technically CERTIFIED. Unified Namespace and AAS
Foundation are DEVELOPMENT. Intelligence components are PLANNED.

```mermaid
flowchart TB
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  INT[Integration CERTIFIED / DEVELOPMENT]
  DATA[Data CERTIFIED / PLANNED]
  OPS[Operations CERTIFIED / PLANNED]
  INTEL[Intelligence PLANNED]
  GP[Golden Path]
  DP[Data Product]

  INT --> GP
  DATA --> GP
  OPS --> GP
  INTEL -.-> GP
  GP --> DP

  class INT,DATA,OPS teal
  class INTEL,GP,DP navy
```

## Golden Path lifecycle

```mermaid
flowchart LR
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  C[Certified components] --> G[Golden Path]
  G --> R[Generated Data Product]
  R --> V[Independent versioning]

  class C,G teal
  class R,V navy
```

Official examples: MQTT Temperature, REST Equipment, and OEE
(technically CERTIFIED / RELEASED). Cold Chain, Quality, Energy and AI
Assistant remain future. OEE commercial availability is FUTURE.

## Data Product runtime

```mermaid
flowchart LR
  classDef light fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  SRC[System of Record / Sensor]
  IF[MQTT / REST / UNS]
  IN[Ingestion]
  CT[Contract + Quality]
  API[Product API]
  CONS[Consumers]

  SRC --> IF --> IN --> CT --> API --> CONS

  class SRC light
  class IF,IN,CT,API teal
  class CONS navy
```

The generated runtime does not require the Control Plane to keep serving
consumers.

## System of Record to consumer

```mermaid
flowchart TB
  classDef light fill:#E8EEF4,stroke:#0B1F3A,color:#0B1F3A
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  SOR[ERP / MES / LIMS / EWM / IT-OT]
  AAS[AAS semantics]
  UNS[UNS data flow]
  PC[Platform Components]
  GP[Golden Path]
  DP[Data Product]
  CONS[Dashboard / Analytics / future AI Assistant]
  CP[Pharma Data Factory Control Plane]

  SOR --> AAS
  SOR --> UNS
  AAS --> PC
  UNS --> PC
  PC --> GP --> DP --> CONS
  CP -.->|catalog · identity · Golden Paths · TechDocs| DP

  class SOR,AAS,UNS light
  class PC,GP,DP teal
  class CONS,CP navy
```

Direct database access is not the standard integration method.

## OEE composition

OEE Golden Path 1.0 is technically CERTIFIED. It is not GxP validation.
The generated OEE runtime is independent of the Control Plane.

```mermaid
flowchart LR
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  REST[REST Source CERTIFIED]
  MQTT[MQTT Consumer / UNS]
  TS[Time-Series CERTIFIED]
  API[REST API CERTIFIED]
  H[Health CERTIFIED]
  O[Observability CERTIFIED]
  OEE[OEE domain logic CERTIFIED]

  REST --> OEE
  MQTT --> OEE
  TS --> OEE
  API --> OEE
  H --> OEE
  O --> OEE

  class REST,MQTT,TS,API,H,O,OEE teal
```

## Future Intelligence composition

RAG, LLM Gateway, Knowledge Graph and Vector Store are planned. They are
not available.

```mermaid
flowchart LR
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff

  DP[Governed Data Products]
  RAG[RAG PLANNED]
  LLM[LLM Gateway PLANNED]
  KG[Knowledge Graph PLANNED]
  VS[Vector Store PLANNED]
  AI[AI Assistant FUTURE]

  DP --> RAG --> AI
  DP --> LLM --> AI
  DP --> KG --> AI
  VS --> RAG

  class DP teal
  class RAG,LLM,KG,VS,AI navy
```
