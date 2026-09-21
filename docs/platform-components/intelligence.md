# Intelligence Foundation

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Intelligence Platform Components are **PLANNED** Catalog placeholders.
Do not implement AI provider integrations, RAG runtimes, or graph stores
in this phase.

## RAG Foundation

```mermaid
flowchart LR
  L[Document Loader] --> C[Chunker]
  C --> E[Embeddings]
  E --> V[Vector Store]
  V --> R[Retriever]
  R --> G[LLM Gateway]
```

## Knowledge Graph

```mermaid
flowchart LR
  S[Sources] --> X[Entity Extraction / Mapping]
  X --> GS[Graph Store]
  GS --> Q[Graph Query]
```

## Future GraphRAG

```mermaid
flowchart TB
  KG[Knowledge Graph] --> GR[GraphRAG]
  VR[Vector Retrieval] --> GR
  LLM[LLM Gateway] --> GR
```

Composition example: `catalog/artifacts/nexora/rag-foundation.yaml`.
Validation currently reports these components as unsupported (PLANNED).

When implemented, they will follow the same Platform Component Standard
as Health, Observability, REST API, REST Source, MQTT Consumer, and
Time-Series Storage (`spec.type: platform-component`, configuration
contract, conformance, technical certification).
