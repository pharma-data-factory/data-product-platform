# Golden Path Integration

Official Golden Paths emit consumption metadata automatically:

- `catalog-info.yaml` annotations (`consume-*`, `presentation-*`, `validation-status: NOT_VALIDATED`)
- `dataproduct.yaml` documentary descriptor

## Templates updated

- `oee-data-product`
- `rest-equipment-product`
- `mqtt-temperature-product`

## Customer outcome

Create → Publish → Catalog registration → Generic `/data-products/:name` page available without a custom frontend.
Specialized UI is optional via presentation extensions.
