# Build a Data Product from Platform Components

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Journey:

1. **Select components** from `/platform-components` (Health, Observability, REST API, REST Source, MQTT Consumer, Time-Series).
2. **Create a composition manifest** under `catalog/artifacts/nexora/` (`kind: GOLDEN_PATH`, an Artifact kind, not a Catalog kind).
3. **Validate** with `validateComposition` — missing, deprecated, PLANNED, version, standard, `dependsOn`, and conflicts.
4. **Add domain logic** only in the Data Product. Do not put OEE, temperature, or equipment rules into a Platform Component.
5. **Run locally** with environment variables / `.env.example`. The Data Plane does not need Backstage.
6. **Test** component packages and the product (`pytest`).
7. **Conformance** — Catalog type, version, owner, docs, configuration contract, tests, security via env.
8. **Catalog** — generated `catalog-info.yaml` uses native `dependsOn`. Used By is derived. Open Catalog Graph.
9. **Release** — technical TESTED/CERTIFIED only. Not GxP.

Reference proof: Machine Metrics (`catalog/artifacts/nexora/machine-metrics-reference.yaml`).
Not OEE.
