# Asset Administration Shell Foundation

Owner: Platform Team  
Version: 1.0.0  
Status: DEVELOPMENT (technical only, not GxP)

Reusable AAS repository for **what an asset or property means**.
It is not a Data Product, not Unified Namespace, and not a historian.

Python package: `pdf-aas`.

```
AAS_SQLITE_PATH=.data/aas.sqlite
AAS_SEED=true
```

From `platform-components/`:

```
docker build -f asset-semantic/aas-foundation/Dockerfile .
```

or `uvicorn pdf_aas.main:app --port 8090`.

Health: `GET /health`. Assets: `GET /api/v1/assets`.
Seed includes Filler 01 (`filler-01`) with temperature, pressure, speed,
and machine-state mappings. Connectivity references must not contain secrets.
