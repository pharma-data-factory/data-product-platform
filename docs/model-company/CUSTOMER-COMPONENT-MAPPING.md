# Customer Component Mapping (UNS)

| Need | Customer component | Synthetic source | UNS path | Compatibility |
| --- | --- | --- | --- | --- |
| Equipment state | OEE / Equipment consumers | Equipment Simulator | `…/{equipment}/state` | OEE: `REQUIRES_EXTENSION` |
| Counters | OEE Data Product | Equipment Simulator | `…/{equipment}/counts` | `UNS_COMPATIBLE_WITH_CONFIG` (topics) |
| Temperature | MQTT Temperature GP | Equipment Simulator | `…/{equipment}/temperature` | `REQUIRES_EXTENSION` |
| Availability | Platform observability | Equipment Simulator | `…/{equipment}/availability` | Platform |
| Orders | (no ERP GP) | ERP Simulator | `…/orders/{id}/state` | `NOT_REQUIRED` |
| Warehouse HU | (no WH GP) | Warehouse Simulator | `…/warehouse/handling-units/{id}/state` | `NOT_REQUIRED` |
| Equipment master | REST Equipment GP | Equipment REST list | REST (not MQTT) | `NOT_COMPATIBLE` (MQTT) |

See `docs/uns/UNS-STANDARD.md`.
