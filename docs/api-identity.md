# API Entity Identity

Collision-safe Backstage identity for Data Product contracts.

## Problem

Many Data Products can provide the same logical contract, for example
`temperature-event`. Backstage API entities are unique by
`kind` + `namespace` + `name`. A hard-coded `api:default/temperature-event`
collides as soon as a second product is registered.

## Convention

Keep the contract **display name** human-readable. Use a unique Catalog
`metadata.name` derived from the Data Product name and the logical contract.

| Concept | Example |
| --- | --- |
| Data Product | `cold-room-temperature` |
| Logical contract | `temperature-event` |
| API `metadata.name` | `cold-room-temperature--temperature-event` |
| API `metadata.title` | Temperature Event Contract |
| Backstage reference | `api:default/cold-room-temperature--temperature-event` |

Pattern:

```text
{dataProductName}--{logicalContractName}
```

The product name cannot contain `--` (scaffolder names are kebab-case), so
the separator is unambiguous.

Component topology:

```yaml
spec:
  providesApis:
    - ${{ values.name }}--temperature-event
```

API entity:

```yaml
metadata:
  name: ${{ values.name }}--temperature-event
  title: Temperature Event Contract
  annotations:
    dataprod.platform/contract: temperature-event
    dataprod.platform/contract-version: 1.1.0
```

Consumers bind to the **unique** API entity of the product they use:

```yaml
spec:
  consumesApis:
    - cold-room-temperature--temperature-event
```

They do not bind to a global `temperature-event` name.

## What stays human-readable

- API `metadata.title`
- annotation `dataprod.platform/contract` (logical name)
- schema file names such as `contracts/temperature-event.schema.json`

The UI should display the title or logical contract name, and link to the
unique Catalog entity.

## Legacy entities

Existing entities named `temperature-event` or `equipment-event` remain
valid. The Data Products plugin still reads legacy annotations. Newly
generated products must use this convention.
