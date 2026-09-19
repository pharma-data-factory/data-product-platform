# Using Components in Golden Paths

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

**Build the domain logic. Reuse the platform.**

Open `/platform-components`, choose a CERTIFIED runtime component, and
compose it with a `GoldenPathComposition` plus Catalog `dependsOn`.

Do not store inverse Used By annotations. Used By in the library is
derived from validated runtime compositions.

## How to reuse a component

1. Confirm the card shows **Runtime available** and a status you are
   allowed to consume (TESTED or CERTIFIED).
2. Copy the import from the component detail page. For REST Source the
   proven OEE usage is:

   ```python
   from pdf_rest_source import RestSource, RestSourceSettings
   ```

3. Add the component to a composition:

   ```yaml
   - ref: component:default/rest-source
     version: "1.x"
   ```

4. Vendor or copy the package into the generated product so the service
   runs without Backstage. See [Vendoring](vendoring.md).

Composer 1.0 at `/compose` can generate the YAML. Generic runtime
generation from arbitrary selections is not available. The YAML
manifest remains canonical.

## OEE — actual runtime reuse

OEE Golden Path 1.0 Mode A consumes six CERTIFIED Wave 1 packages.
Source: `catalog/artifacts/nexora/oee-data-product-direct.yaml` and
`templates/oee-data-product/content/app/main.py`.

- Health
- Observability
- MQTT Consumer
- REST Source
- Time-Series Storage
- REST API

## MQTT Temperature and REST Equipment — conceptual only

MQTT Temperature runtime is **not** refactored onto MQTT Consumer.
REST Equipment runtime is **not** refactored onto REST Source.

Conceptual compositions (`mqtt-temperature-conceptual.yaml`,
`rest-equipment-conceptual.yaml`) document intended building blocks.
They must not be shown as actual runtime reuse.

## Other composition proofs

Machine Metrics Reference composes MQTT Consumer, Health, Observability,
Time-Series Storage, and REST API. Generic machine metrics only. Not OEE.

Machine State Consumer `dependsOn: component:default/unified-namespace`.
UNS remains DEVELOPMENT.
