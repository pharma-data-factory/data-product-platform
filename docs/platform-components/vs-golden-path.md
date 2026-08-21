# Platform Component vs Golden Path

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

A **Platform Component** is a reusable technical building block
(integration, storage, operations). It is not a Data Product.

A **Golden Path** is an approved product template that composes
components plus **domain logic** into a generated Data Product.

| | Platform Component | Golden Path |
| --- | --- | --- |
| What it is | Reusable technical capability | Product template + domain model |
| Runs where | Inside the generated service | Scaffolds a whole Data Product |
| Example | REST Source, MQTT Consumer, Health | OEE, MQTT Temperature, REST Equipment |
| Catalog type | `platform-component` | Template + generated `data-product` |

OEE 1.0 Mode A reuses six CERTIFIED Wave 1 components and keeps OEE
formulas in `templates/oee-data-product` domain code.

MQTT Temperature and REST Equipment remain independent Golden Path
runtimes. They do **not** currently import MQTT Consumer or REST Source
as reusable packages. Conceptual compositions document intended reuse
only.

See [How to reuse a Component](using.md) and
[Composition](composition.md).
