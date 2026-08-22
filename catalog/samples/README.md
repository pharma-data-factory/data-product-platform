# Sample / demo / planned Catalog

This location is **not** part of the production or Docker Compose Catalog.

| Class | Entities |
| --- | --- |
| SAMPLE | `sample-orders-product`, MQTT/REST sample products and consumers, Machine State Consumer sample, `sample-oee-data-product`, `pilot-oee-line-01` (PILOT / TEST, not official template certification) |
| SAMPLE industrial | `catalog/samples/industrial.yaml` — `filler-01`, `dispenser-01`, OEE / weighing / equipment-state products. Plugin fixtures only. |
| PLANNED | `example-oee-data-product`, `example-cold-chain-data-product` |

Local `yarn start` (`app-config.yaml`) loads these files so unit tests and
the developer demo UI still have fixtures.

`app-config.production.yaml` and `app-config.docker.yaml` must not list
`catalog/samples/`.
