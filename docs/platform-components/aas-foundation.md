# Asset Administration Shell Foundation

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Catalog: `component:default/aas-foundation`  
Category: `asset-semantic`  
Certification: **DEVELOPMENT** (technical only, not GxP, not full AAS)

Python package `pdf-aas` reuses Health, Observability, and REST API.
SQLite stores AAS documents. Time-Series Storage is not used.

Configuration (no secrets):

```
AAS_SQLITE_PATH=.data/aas.sqlite
AAS_SEED=true
```

Docker (from `platform-components/`):

```
docker build -f asset-semantic/aas-foundation/Dockerfile .
```

Canonical docs: [What is AAS?](../aas/index.md).
