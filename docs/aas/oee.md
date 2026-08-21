# AAS + OEE

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

**Do not implement OEE from this page.**

Future OEE should resolve through AAS:

- Equipment identity
- Sensor definitions and units
- Machine-state semantic meaning
- Operational endpoint mappings
- Ideal cycle time **only if** it is asset master data

Keep these separate:

| Kind | Example | Store |
| --- | --- | --- |
| Asset master / semantics | Filler type, speed unit | AAS |
| Production context | orderId, materialId | OEE input contract |
| Runtime events | machine-state-event | UNS / MQTT |
| OEE domain configuration | shift calendar, window rules | OEE product config |

Do not make every OEE configuration value an AAS property.
