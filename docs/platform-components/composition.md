# Component Composition

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Composition is declarative and version-controlled. The YAML
`GoldenPathComposition` manifest is canonical. Composer 1.0 at `/compose`
helps developers create that YAML. It is not a runtime orchestrator.

## Conceptual model

```yaml
goldenPath:
  name: oee-data-product
components:
  sources:
    - rest-source
    - mqtt-consumer
    # unified-namespace is optional (Mode B)
  storage:
    - timeseries
  outputs:
    - rest-api
  operations:
    - health
    - observability
  intelligence: []
```

## Manifest

`apiVersion: dataprod.platform/v1alpha1`  
`kind: GoldenPathComposition`

This is **not** a Backstage Catalog kind. Files live under
`catalog/compositions/`.

```yaml
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: oee-data-product
spec:
  components:
    - ref: component:default/rest-source
      version: 1.x
    - ref: component:default/mqtt-consumer
      version: 1.x
```

Manifests must not contain customer secrets or runtime credentials.

## Validation

Validation checks:

- component exists in Catalog
- component is supported (not PLANNED)
- version constraint is valid SemVer / `N.x`
- component is not deprecated
- component is compatible with the Data Product Standard
- required `dependsOn` components are present
- conflicting components are detected

Example: Machine State Consumer requires Unified Namespace `1.x`. Catalog
has Unified Namespace `1.0.0` → COMPATIBLE. See
`catalog/compositions/machine-state-consumer.yaml`.

Wave 1 REST API, Health, and Observability are CERTIFIED runtimes.

Example: OEE Mode A requires MQTT Consumer `1.x`. Catalog has MQTT
Consumer `1.0.0` → COMPATIBLE. Kafka is not part of OEE 1.0. See
[OEE composition](../oee/composition.md).

## Composer 1.0

Open `/compose` to select Catalog-backed Platform Components, validate
with `validateComposition()`, and export YAML. Continue to a Golden Path
only when the selection matches an official pattern (today: OEE Mode A).
See [Composition Builder](composer.md).
The YAML manifest remains canonical. Composer is not a runtime
orchestrator. See [OEE example](oee-example.md).
