# Composition Builder

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Composer sits on the **new use case** path:

Component Library → Composition → Composer → design-first YAML.

Existing patterns such as OEE still go Golden Path → Create Product.
Equipment Use Log is DESIGN FIRST, not Create.

```
Platform Component
Reusable runtime capability.

Composition
Version-controlled declaration of required capabilities.

Golden Path
Certified implementation blueprint for a recurring product pattern.

Data Product
Generated independent runtime containing domain logic.

Composer
Developer tool used to create/validate composition manifests.
```

## What it does

1. Load Platform Components from the Catalog-backed library.
2. Select consumable runtimes (CERTIFIED/TESTED/DEVELOPMENT with runtime).
3. Validate with the existing `validateComposition()` engine.
4. Preview and export YAML (`kind: GoldenPathComposition`).
5. Continue to an official Golden Path only when the selection matches
   one exactly (today: OEE Mode A).

## What it does not do

- Generate arbitrary FastAPI repositories
- Start infrastructure
- Persist drafts in Catalog
- Install component runtimes
- Resolve a dependency graph beyond current metadata
- Certify a composition as a Golden Path

The YAML manifest remains canonical and version-controlled.

## Selection honesty

| Status | Runtime | Composer |
| --- | --- | --- |
| CERTIFIED | available | Selectable |
| TESTED | available | Selectable with warning |
| DEVELOPMENT | available | Visible, marked DEVELOPMENT |
| PLANNED | — | Not selectable |
| Catalog only | none | Not selectable |

Kafka, PostgreSQL, object storage, audit, RAG and KG stay catalog-only
or PLANNED. AAS Foundation and Unified Namespace stay DEVELOPMENT.

A **VALIDATED** composition is not a **CERTIFIED** Golden Path.

## Official Create remains

MQTT Temperature, REST Equipment, and OEE. Composer 1.0 does not add a
generic Golden Path.

See also [Composition](composition.md) and [Product model](product-model.md).
