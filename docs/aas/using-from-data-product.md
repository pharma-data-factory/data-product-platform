# Using AAS from a Data Product

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Data Products must not depend on SQLite tables. Use lookup:

- `resolve_asset(assetId)`
- `resolve_property(assetId, propertyId)`
- `resolve_endpoint(assetId, propertyId)`

Python:

```python
from pdf_aas.lookup import resolve_property

meta = resolve_property(repo, "filler-01", "speed")
# unit == "rpm"
# connectivity.topic == "pharma/basel/packaging/line-01/filler-01/speed/value"
```

HTTP:

`GET /api/v1/resolve/assets/filler-01/properties/speed`

Machine Metrics Reference remains unchanged. The lookup is the
integration proof: it can resolve Filler 01 speed without migrating that
runtime.
