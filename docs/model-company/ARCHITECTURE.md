# Model Company Architecture (UNS-native)

```text
Synthetic Factory (Model Pharma)
        │
        ▼
Source Adapters / Simulators
        │
        ▼
UNIFIED NAMESPACE (Platform Standard 1.0)
        │
        ├───────────────┐
        ▼               ▼
Equipment / Temp DP   OEE DP   (when GP extended / configured)
        │               │
        └───────┬───────┘
                ▼
          Backstage IDP
```

## Separation

| Layer | Contents |
| --- | --- |
| **Platform Core** | Backstage, Catalog, Scaffolder, Permissions, Golden Paths, **UNS Standard**, contracts |
| **Model Company** | Factory-as-Code, simulators, scenarios, synthetic data, UNS Explorer UI |

UNS Standard lives under `docs/uns/` + `contracts/uns/` — **not** Model-Company-owned.

## Runtime

- Control Plane: `@internal/plugin-model-company(-backend)` — scenario engine + UNS message buffer / Explorer
- Separate Compose: `model-company/runtime` — Mosquitto + Python UNS publisher

## Persistence isolation

`.runtime/model-company/` — simulation state + UNS message JSONL only.
