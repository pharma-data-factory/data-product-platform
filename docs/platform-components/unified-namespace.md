# Unified Namespace as a Platform Component

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Unified Namespace is registered as:

- `spec.type: platform-component`
- category: `integration`
- certification: `DEVELOPMENT`

It may conceptually depend on MQTT Consumer / Producer. MQTT is the first
transport. Kafka is deferred. The full UNS runtime already exists under
`uns/` and must not be duplicated here.

OEE 1.0 does not require Unified Namespace (Mode A). Cold Chain and other
future products may `dependsOn: component:default/unified-namespace`.

UNS is a building block, not a Data Product. Deep documentation:
[Unified Namespace](../uns/index.md).

Composition proof: [Compose a Data Product with Unified Namespace](../how-to/compose-uns.md).
