# Extension API

```ts
registerDataProductExtension({
  id: 'oee-dashboard',
  title: 'OEE Dashboard',
  Component: MyComponent,
});
```

Catalog annotation:

```yaml
dataprod.platform/presentation-extensions: oee-dashboard
```

## Built-in

`oee-dashboard` — displays OEE / Availability / Performance / Quality from Consumption SDK query rows.
Does **not** recalculate OEE.

## Security

Only ids registered in the platform bundle are loadable. Arbitrary remote modules are rejected by design.
