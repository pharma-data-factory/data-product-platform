# Warehouse Sink (Product Publish Bus → Analytics)

**Status:** DEVELOPMENT / NOT CERTIFIED / NOT VALIDATED  
**Role:** Platform Component — lands `StreamEvent` envelopes for warehouse profiles

```text
Data Product → Product Publish Bus (MQTT products/…)
                     ↓
              warehouse-sink
                     ↓
     file staging  |  Snowflake DDL+JSONL stub  |  Databricks path stub
```

This component does **not** open live Snowflake or Databricks sessions in v0.1.
It prepares staging artifacts so operators and future connectors can load data.

## Settings (`WAREHOUSE_*`)

| Env | Default | Meaning |
| --- | --- | --- |
| `WAREHOUSE_ENABLED` | `false` | Must be true to land |
| `WAREHOUSE_PROFILE` | `file` | `file` \| `snowflake` \| `databricks` |
| `WAREHOUSE_STAGING_DIR` | `data/warehouse-staging` | Local staging root |
| `WAREHOUSE_DATASET` | empty | e.g. `manufacturing.line04_oee_oee_result_v1` |
| `WAREHOUSE_SNOWFLAKE_*` | metadata only | DDL stub fields — no live connect |

## Design-time Catalog annotations

```yaml
dataprod.platform/publish-ports: mqtt,warehouse
dataprod.platform/publish-warehouse-profile: snowflake
dataprod.platform/publish-warehouse-dataset: manufacturing.sample_oee_oee_result_v1
```

## Usage

```python
from pdf_warehouse_sink import WarehouseSink, WarehouseSinkSettings

sink = WarehouseSink(WarehouseSinkSettings(enabled=True, profile="snowflake"))
sink.land_payload(
    event_id="e1",
    timestamp="2026-09-11T10:00:00Z",
    source="component:default/sample-oee-data-product",
    payload={"oee": 0.84, "equipmentId": "FILLER-01"},
    dataset="manufacturing.sample_oee_oee_result_v1",
)
```
