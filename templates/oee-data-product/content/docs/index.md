# Overview

${{ values.description }}

Equipment: `${{ values.equipmentId }}`. Default window: `${{ values.defaultWindow }}`.
Counter convention: **CUMULATIVE**. Contracts: **1.0.0**.

OEE is a Data Product. Domain logic lives in `app/domain` and
`app/domain/calculation`. Wave 1 Platform Components provide MQTT, REST GET,
SQLite time-series, REST API, Health, and Observability. The process keeps
running if Backstage is stopped.

MES remains System of Record. This product does not access MES, ERP, LIMS,
EWM, or Historian databases. CERTIFIED means technical platform completeness
only. It is not GxP validation. See [Product](product.md).
