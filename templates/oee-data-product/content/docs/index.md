# Overview

${{ values.description }}

Equipment: `${{ values.equipmentId }}`. Default window: `${{ values.defaultWindow }}`.
Counter convention: **CUMULATIVE**. Contracts: **1.0.0**.

OEE is a Data Product. Domain logic lives in `app/domain`. Wave 1 Platform
Components provide MQTT, REST GET, SQLite time-series, REST API, Health, and
Observability. The process keeps running if Backstage is stopped.
