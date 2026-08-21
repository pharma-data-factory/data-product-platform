# Register in Catalog

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

Golden Path create runs `catalog:register` on the generated
`catalog-info.yaml`. That file must include the Component
(`spec.type: data-product`), the contract API, `providesApis`, and
`backstage.io/techdocs-ref`.

If the entity is missing:

1. Confirm the GitHub repository contains `catalog-info.yaml`.
2. Confirm catalog location processing in the Control Plane.
3. Do not invent custom topology annotations when native Catalog fields exist.

See [data-product-template-standard.md](../data-product-template-standard.md).
