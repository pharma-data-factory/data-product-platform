# Platform Component vs Backstage Plugin

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

This distinction is mandatory.

## BACKSTAGE PLUGIN

Extends the Control Plane.

Runs with Backstage.

Examples:

- Catalog
- TechDocs
- Search

If Backstage is down, plugin UI is unavailable. That must not stop a
generated Data Product.

## PLATFORM COMPONENT

Runs with or inside generated Data Products.

Examples:

- REST Source
- MQTT Consumer
- Time-Series Storage

Generated Data Products must remain able to run when Backstage is
unavailable. Wave 1 packages are vendored into the product repository
for that reason.

Do not implement Data Product runtime capabilities as Backstage
plugins. Do not implement Control Plane UI as a Platform Component.
