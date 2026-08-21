# Future composition generation

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Composer 1.0 at `/compose` already builds and validates
`GoldenPathComposition` YAML. See [Composition Builder](composer.md).

The following remain **PLANNED** and are not implemented:

- generic runtime generation from arbitrary component selections
- a composition-to-scaffolder engine
- runtime orchestration from the Composer UI

The YAML manifest remains canonical. Composer must not become another
runtime orchestration engine. Official Create remains MQTT Temperature,
REST Equipment, and OEE.
