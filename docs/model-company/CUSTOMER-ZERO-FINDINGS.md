# Customer Zero Findings (UNS-native)

Model Company is **CUSTOMER ZERO** for Platform UNS Standard 1.0. Gaps are classified by priority. Do **not** hide gaps with Model-Company-only bypasses.

| ID | Pri | Finding | Impact | Status |
| --- | --- | --- | --- | --- |
| CZ-U01 | **P0** | MQTT Temperature GP rejects UNS envelope (`additionalProperties: false`) | Customer cannot point Temperature DP at UNS temperature topics without GP extension | OPEN — `CUSTOMER_COMPONENT_GAP` |
| CZ-U02 | **P0** | OEE 1.0 state enum lacks `BREAKDOWN` / `MICROSTOP` / `MATERIAL_STARVED` | UNS Standard 1.0 states not consumable as-is | OPEN — `REQUIRES_EXTENSION` |
| CZ-U03 | **P0** | No scaffolder params for UNS root / enterprise / site / area / line / equipment / QoS / retain | Customer must hand-edit env after Create | OPEN |
| CZ-U04 | **P1** | OEE counter topic expects `pharma/oee/+/count` defaults + flat counter schema | Topics remappable (`UNS_COMPATIBLE_WITH_CONFIG`) but payload mapping still needed | OPEN |
| CZ-U05 | **P1** | No automated deploy of Golden Path instance against Model Company Mosquitto | Manual Docker + env (same as any customer plant broker) | OPEN |
| CZ-U06 | **P1** | Legacy `uns/` service uses root `pharma` + domain/event hierarchy | Two UNS shapes coexist until migration | OPEN (documented) |
| CZ-U07 | **P2** | MQTT GP subscribe QoS not configurable (defaults 0); UNS state uses QoS 1 | May be acceptable; document | MITIGATED_DOCS |
| CZ-U08 | **P2** | Topic ACLs / mTLS not provisionable via Golden Path | Local anonymous broker only | MITIGATED_DOCS |
| CZ-U09 | **P2** | REST Equipment GP has no MQTT/UNS path | Expected — use REST sync | `NOT_COMPATIBLE` |
| CZ-U10 | **P3** | Catalog facet for `model-company` / UNS contracts not first-class | Tag-based discovery only | OPEN |

## Correct architecture (enforced)

```text
Equipment Simulator → MQTT → UNS → Golden Path Data Product → API
```

Incorrect (forbidden): simulator → internal OEE function.
