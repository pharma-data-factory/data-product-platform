# AAS Submodels

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

MVP shells include these `idShort` values:

| idShort | Role |
| --- | --- |
| Identification | Asset identity |
| TechnicalData | Manufacturer / model / serial |
| OperationalDataDefinition | How operational properties are defined |
| Sensors | Sensor / property definitions |
| Connectivity | Endpoint mappings |

This is a small, extensible set. It is **not** a proprietary submodel
library and is **not** a complete IDTA submodel collection.

Future compatibility: standard submodels such as Nameplate, Technical
Data (ZVEI), and Digital Nameplate can replace or sit beside these
`idShort` values without changing Catalog topology.

AASX import/export is a future capability. It is not implemented.
