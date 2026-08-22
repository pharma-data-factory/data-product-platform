# Nexora Industrial Plugin Suite

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Catalog-first industrial layer around existing Backstage plugins.

```text
Golden Paths create Components / APIs / Resources
        ↓
Backstage Catalog
        ↓
Nexora plugins visualize assets, contracts, quality, connectivity
```

The plugins do not generate Data Products, calculate OEE, or run weighing
logic. Sample entities live in `catalog/samples/industrial.yaml` and load
only in local development.

- [Asset & Equipment Explorer](asset-explorer.md)
- [Data Product & Contract Explorer](contract-explorer.md)
- [Data Quality & Connectivity](quality-connectivity.md)

Existing Catalog, API Docs, TechDocs, Search, Data Products, and
Marketplace stay the system of record for those jobs.
