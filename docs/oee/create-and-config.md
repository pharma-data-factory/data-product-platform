# OEE Create UX and configuration (design)

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

No Create template is registered in this phase. This is the intended
Marketplace → Create form and config split.

## Create form (build-time)

Keep the wizard small. Do not expose Wave 1 internals that the
composition already pins.

| Field | Required | Notes |
| --- | --- | --- |
| Data Product Name | Yes | Catalog `metadata.name` |
| Description | Yes | |
| Owner | Yes | Group ref |
| Domain | Yes | Default `manufacturing` |
| Equipment Identifier | Yes | Canonical `equipmentId` |
| Default Time Window | Yes | `hour` \| `shift` \| `day` \| `order` \| `custom` |
| Count Convention | Display only | Fixed **CUMULATIVE** for 1.0 |
| Production Context Mode | Display only | REST |
| Machine Event Mode | Display only | MQTT |
| MQTT Topic Pattern | Yes | One pattern or three documented suffixes |
| Production Context URL reference | Yes | Name of runtime env var, not the secret |

Do not ask for Health, Observability, SQLite path, TLS, or component
versions on Create. Those are composition + runtime env.

Storage is SQLite for the pilot; do not offer a database picker.

## Build-time vs runtime

| Build-time (Catalog / generated repo) | Runtime (env / secrets) |
| --- | --- |
| Name, owner, domain, equipmentId | `MQTT_HOST`, `MQTT_PORT`, credentials |
| Topic pattern, default window | `MQTT_TLS_*` |
| Composition pins `1.x` | REST URL, token, timeout |
| Contract versions 1.0.0 | `TIMESERIES_SQLITE_PATH` |

Secrets never appear in Catalog, `catalog-info.yaml`, or committed
`.env`. Use `.env.example` with empty values, same as existing Golden
Paths.

## Future generated layout (do not create)

```text
app/
  domain/
    models.py        # DOMAIN OWNED
    calculator.py    # DOMAIN OWNED
    timeline.py      # DOMAIN OWNED
    windows.py       # DOMAIN OWNED
    counters.py      # DOMAIN OWNED
  routes/
    oee.py           # DOMAIN OWNED (uses REST API 1.x)
  ingestion/
    mappings.py      # DOMAIN OWNED adapters
contracts/           # DOMAIN OWNED schemas (copies of 1.0.0)
tests/               # DOMAIN OWNED scenarios A–E + edges
composition.yaml     # PLATFORM MANAGED pin of Wave 1 1.x
catalog-info.yaml    # PLATFORM MANAGED topology
```

| PLATFORM MANAGED | DOMAIN OWNED |
| --- | --- |
| Health, Observability, REST API, REST Source, MQTT Consumer, Time-Series | Formulas, timeline, counters, windows |
| Dockerfile/CI/quality-gate skeleton | Adapters / mappings |
| catalog-info `dependsOn` | OEE routes and tests |
| `.env.example` keys | Site-specific mapping code |

Do not duplicate MQTT reconnect, REST retries, or SQLite in `app/domain`.

## Catalog topology (future instance)

```yaml
spec:
  type: data-product
  dependsOn:
    - component:default/health
    - component:default/observability
    - component:default/mqtt-consumer
    - component:default/rest-source
    - component:default/timeseries
    - component:default/rest-api
  providesApis:
    - {product}--oee-result
  consumesApis:
    - {product}--production-context
    - {product}--machine-state-event
    - {product}--production-count-event
    - {product}--quality-count-event
```

Optional later: `unified-namespace`, `aas-foundation`.
No custom topology annotations. Used By is derived.
