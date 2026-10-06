# Golden Path Integration

Official Golden Paths emit consumption metadata automatically:

- `catalog-info.yaml` annotations (`consume-*`, `presentation-*`, `validation-status: NOT_VALIDATED`)
- `nexora.yaml`, the canonical manifest (NXD-130). Shipped by `oee-data-product` so far (NXD-131);
  the other Golden Paths follow. The former `dataproduct.yaml` is removed from all of them.

## Templates updated

- `oee-data-product`
- `rest-equipment-product`
- `mqtt-temperature-product`

## Customer outcome

Create → Publish → Catalog registration → Generic `/data-products/:name` page available without a custom frontend.
Specialized UI is optional via presentation extensions.
