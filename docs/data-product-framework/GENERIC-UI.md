# Generic Data Product UI

Route: `/data-products/:name`

Optional context query: `?site=&line=&equipment=&area=`

## Tabs

Overview · Data · API · Realtime · Contracts · Quality · Lineage · Tests · Validation · Ownership

Tabs for API/Realtime hide when interfaces/capabilities are absent.

## Renderers

`DataProductTable` · `DataProductMetricCards` · `DataProductTimeseries` · `DataProductRealtimeFeed` · `DataProductJsonViewer` · `DataProductSchemaViewer`

Timeseries v1 uses a table fallback (no chart library in the platform).

## Extensions

Overview loads registered extensions listed in `presentation-extensions` (e.g. `oee-dashboard`).
Extensions are compile-time registered platform components — not remote code.
