# Component Composition

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Composition is declarative and version-controlled. The YAML `GOLDEN_PATH`
Artifact manifest is canonical, and the Artifact Registry loads it at startup.
Composer 1.0 at `/compose` helps developers create that YAML. It is not a
runtime orchestrator.

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

`apiVersion: nexora.dev/v1alpha1`  
`kind: GOLDEN_PATH`

A composition is an Artifact. It is **not** a Backstage Catalog kind. Files
live under `catalog/artifacts/nexora/` alongside every other manifest the
Artifact Registry loads at startup.

```yaml
apiVersion: nexora.dev/v1alpha1
kind: GOLDEN_PATH
metadata:
  namespace: nexora
  name: oee-data-product-uns
  version: "1.0.0"
  displayName: "Packaging OEE (UNS optional Mode B example)"
spec:
  standardVersion: "1.0.0"
  components:
    - ref: "component:default/rest-source"
      version: "1.x"
    - ref: "component:default/mqtt-consumer"
      version: "1.x"
    - ref: "component:default/timeseries"
      version: "1.x"
      optional: true
```

`ref` is a Backstage Catalog entity ref and `version` is a constraint, not a
pin — a composition points at the Catalog rather than restating it. This is
why the list is `spec.components` and not `spec.dependencies`, which pins
exact Artifact versions. A component marked `optional` is offered by the
Composer rather than required.

Internally a composition resolves to the `GoldenPathComposition` model that
validation has always worked against; `compositionOfArtifactManifest` is that
adapter. Compositions were their own manifest family under
`catalog/compositions/` until NXD-027 made them Artifacts.

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
`catalog/artifacts/nexora/machine-state-consumer.yaml`.

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
