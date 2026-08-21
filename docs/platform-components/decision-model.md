# Developer Decision Model

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

**Build the domain logic. Reuse the platform.**

## When building something new

Does this capability already exist as an approved Platform Component?

```
YES → REUSE IT
NO  → classify the capability
```

## DOMAIN LOGIC

Business functionality unique to the product.

Examples:

- OEE calculation
- Equipment usage sessions
- Cold-chain excursion rules

Implement this in the generated Data Product. Do not put it inside a
Platform Component.

## PLATFORM COMPONENT

Reusable technical capability that runs with or inside generated Data
Products.

Examples:

- MQTT Consumer
- REST Source
- Time-Series Storage
- Health

Browse the library: `/platform-components`.

## BACKSTAGE PLUGIN

Control Plane functionality. Runs with Backstage.

Examples:

- TechDocs
- Search
- Catalog UI
- CI visualization

Generated Data Products must keep running when Backstage is unavailable.

## EXTERNAL LIBRARY

Underlying implementation technology. Not a Platform Component and not
a Backstage plugin.

Examples:

- FastAPI
- Pydantic
- paho-mqtt
- httpx
