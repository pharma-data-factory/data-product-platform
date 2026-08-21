# Product model

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Canonical product model for Pharma Data Factory:

## PLATFORM COMPONENT

Reusable runtime capability. Discovered in the Component Library.
Not a Data Product. Not a Backstage plugin.

## COMPOSITION

Version-controlled declaration of required capabilities.
`apiVersion: dataprod.platform/v1alpha1`  
`kind: GoldenPathComposition`

Composition defines dependencies. It does not start infrastructure.

## GOLDEN PATH

Certified implementation blueprint for a recurring product pattern.
Official Create remains MQTT Temperature, REST Equipment, and OEE.

## DATA PRODUCT

Generated independent runtime containing domain logic. The developer
owns domain models, business rules, domain contracts, and
application-specific logic.

## COMPOSER

Developer tool used to create and validate composition manifests.
Route: `/compose`. YAML remains the canonical artifact.

```
                 PHARMA DATA FACTORY

     ┌─────────────────────────────────┐
     │       COMPONENT LIBRARY         │
     │                                 │
     │ REST │ MQTT │ Storage │ Health  │
     │ Observability │ REST Source     │
     └────────────────┬────────────────┘
                      │
                COMPOSITION
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   EXISTING PATTERN          NEW USE CASE
          │                       │
    Golden Path                 Composer
          │                       │
          ▼                       ▼
        OEE              Equipment Use Log
          │                 DESIGN FIRST
          ▼
   Create Product
```

Do not collapse these layers.

- Existing pattern: a certified Golden Path such as OEE, then Create.
- New use case: Composer exports YAML. Equipment Use Log is
  **DESIGN FIRST**, not a Golden Path and not Create.

A validated composition is not a certified Golden Path. Selecting
components is not generating a runtime.
