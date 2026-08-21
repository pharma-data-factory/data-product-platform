# Equipment Event Contract

Backstage API entity: `api:default/sample-rest-equipment-product--equipment-event`

Logical contract name: `equipment-event`  
Authoritative contract version: `1.0.0`  
(`dataprod.platform/contract-version` on the API entity)

## Topology

Catalog relations, not custom annotations:

- Provided by `component:default/sample-rest-equipment-product`
- Consumed by `component:default/equipment-dashboard-consumer`

Open the API in the Software Catalog to see provider and consumers.
Open Catalog Graph from the Data Product to see the same relationships.

## Schema

Canonical file in generated products:
`contracts/equipment-event.schema.json`

Required fields:

- `equipmentId` (string, unique, upsert key)
- `name` (string)
- `site` (string)
- `status` (`ACTIVE`, `INACTIVE`, or `MAINTENANCE`)
- `updatedAt` (ISO-8601)
