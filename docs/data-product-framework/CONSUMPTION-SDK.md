# Consumption SDK

Package: `@internal/data-product-consumption`

## API

```ts
import {
  dataProductConsumptionApiRef,
  useDataProduct,
  useDataProductQuery,
  useDataProductStream,
  useDataProductContract,
  useDataProductQuality,
  useDataProductLineage,
} from '@internal/data-product-consumption';
```

## Responsibilities

- Product discovery via `/consume/products/:entityRef`
- Endpoint resolution (never hardcode product host in plugins)
- Auth via Backstage `fetchApi` / session
- Normalized `ConsumptionError` codes
- Loading/stream pause-resume
- Contract/quality/lineage from descriptor metadata
- Extension registry (`registerDataProductExtension`)

## Error codes

`NOT_FOUND` · `FORBIDDEN` · `INTERFACE_UNAVAILABLE` · `TIMEOUT` · `CONTRACT_VIOLATION` · `UPSTREAM_UNAVAILABLE` · `UNKNOWN`
