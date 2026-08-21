# Temperature Event Contract

Backstage API entity: `api:default/sample-mqtt-temperature-product--temperature-event`

Logical contract name: `temperature-event`  
Authoritative contract version: `1.1.0`  
(`dataprod.platform/contract-version` on the API entity)

## Topology

Catalog relations, not custom annotations:

- Provided by `component:default/sample-mqtt-temperature-product`
- Consumed by `component:default/temperature-dashboard-consumer`

Open the API in the Software Catalog to see provider and consumers.
Open Catalog Graph from the Data Product to see the same relationships.

## Schema

Canonical file in generated products:
`contracts/temperature-event.schema.json`

Required fields:

- `eventId` (string, unique, idempotent ingest key)
- `deviceId` (string)
- `timestamp` (ISO-8601)
- `temperature` (number)
- `unit` (`C` or `F`)
