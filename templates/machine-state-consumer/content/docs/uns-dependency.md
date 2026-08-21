# UNS Dependency

Catalog:

```yaml
spec:
  type: data-product
  dependsOn:
    - ${{ values.unsComponent }}
  consumesApis:
    - unified-namespace--machine-state-event
```

Composition (`composition.yaml`) lists only Unified Namespace. REST API
and Observability exist as Catalog placeholders, not reusable runtimes,
so they are future composition candidates.

Used By on Unified Namespace is the inverse Catalog `dependsOn` relation.
Open Catalog Graph from the product page.
