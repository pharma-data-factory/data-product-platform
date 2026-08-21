# Golden Path concept

Owner: Golden Path Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

A Golden Path is a certified, repeatable way to create a Data Product.
Developers configure a name, owner, and repository. The path generates
source, tests, contract, CI, Docker, catalog-info, and TechDocs.

CERTIFIED is technical platform status only. It is not GxP validation.

## Certified today

| Golden Path | Interface | Contract |
| --- | --- | --- |
| MQTT Temperature Data Product | MQTT → REST | `temperature-event` 1.1.0 |
| REST Equipment Data Product | REST → REST | `equipment-event` 1.0.0 |
| OEE Data Product | MQTT + REST → REST | `oee-result` 1.0.0 (commercial FUTURE) |

How-to (Control Plane, do not copy product TechDocs here):

- [Create MQTT Temperature Data Product](../how-to/mqtt-temperature.md)
- [Create REST Equipment Data Product](../how-to/rest-equipment.md)
- [Create OEE Data Product](../how-to/oee.md)

Mandatory documentation sections for every official Golden Path:
[Golden Path documentation standard](../engineering/golden-path-documentation.md).

Also see [templates.md](../templates.md).
