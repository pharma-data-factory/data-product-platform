# Unified Namespace

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

The Unified Namespace (UNS) is a **platform component**. It is not a
Data Product. It provides a governed MQTT topic hierarchy so products
such as OEE, Cold Chain, Quality, Energy, and Equipment Monitoring can
consume OT/IT events without point-to-point coupling to source systems.

Catalog model:

- Kind: `Component`
- `spec.type`: `platform-component`
- System: `integration-platform`
- Future Data Products `dependsOn: component:default/unified-namespace`

Do not implement OEE or Cold Chain business logic in this component.

- [Architecture](architecture.md)
- [Namespace convention](namespace.md)
- [Topic naming](topic-naming.md)
- [Event envelope](event-envelope.md)
- [Contracts](contracts.md)
- [Local development](local-development.md)
- [OEE readiness](oee-example.md)
- [Cold Chain readiness](cold-chain-example.md)
- [Compose a Data Product with Unified Namespace](../how-to/compose-uns.md)
