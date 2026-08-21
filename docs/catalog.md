# Catalog hygiene

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING

| Class | Location | Loaded by |
| --- | --- | --- |
| PRODUCTION / PILOT | `catalog/entities.yaml`, `platform-components/catalog.yaml`, `catalog/org.yaml`, templates | `app-config.yaml`, `app-config.docker.yaml`, `app-config.production.yaml` |
| REFERENCE | Machine Metrics Reference (`dataprod.platform/catalog-class: REFERENCE`) | Production and Docker via `platform-components/catalog.yaml`. Labeled REFERENCE in Data Products. Not a Golden Path. |
| SAMPLE / DEMO / PLANNED | `catalog/samples/entities.yaml` | `app-config.yaml` only (`yarn start`) |

Production and Docker Catalogs must not expose `sample-orders-product`,
`example-oee-data-product`, `example-cold-chain-data-product`, or
`github.com/example` sample products as real Data Products.

Machine Metrics remains a TESTED reference composition, not an official
Golden Path and not a commercial product.
