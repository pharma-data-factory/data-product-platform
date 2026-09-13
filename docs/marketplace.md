# Marketplace

The Marketplace MVP is catalog-driven and static. It does not implement
payments, partner accounts, or onboarding.

Categories:

- Templates
- Connectors
- Data Products
- Platform Components
- Solutions

Unified Namespace is a reusable **platform component**. It is not a
Data Product Golden Path and is not listed as MQTT Temperature or REST
Equipment.

Available factory entries link to official software templates. REST API
Connector remains a preview placeholder. Snowflake Connector is a
DEVELOPMENT Marketplace card pointing at the `warehouse-sink` platform
component (staging / DDL stubs only — no live Snowflake connectivity).

Official Golden Path cards take version and certification from Golden Path
release metadata. Contract and quality come from Catalog entities when a
real product instance exists. Static Marketplace data does not point at
sample Catalog entities. Sample products live in `catalog/samples/` and
are loaded only by local `yarn start`.

`CERTIFIED` on a template means only that it conforms to the Pharma Data
Factory technical standard. It is not GxP or regulatory approval.

The in-product Marketplace is not AWS Marketplace. AWS Marketplace is a
future commercial procurement and entitlement source. This plugin does
not implement billing, subscriptions, or purchase buttons. Cards may
show ENTITLED, NOT ENTITLED, PLANNED, or FUTURE from the entitlement
service. See [aws-marketplace-strategy.md](aws-marketplace-strategy.md)
and [commercial-architecture.md](commercial-architecture.md).
