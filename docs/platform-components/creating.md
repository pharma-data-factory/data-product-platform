# Creating a Platform Component

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

1. Add `platform-components/{category}/{name}/` with `catalog-info.yaml`.
2. Use `kind: Component` and `spec.type: platform-component`.
3. Set category, SemVer, owner, certification status, and standard
   compatibility annotations.
4. Register the file in `platform-components/catalog.yaml`.
5. Document the component. Do not invent a second database.
6. If the component has a runtime, add tests, configuration example, and
   Docker only for that runtime. Placeholders may stay Catalog-only.
7. Do not model the component as `spec.type: data-product`.

Intelligence components start as PLANNED. Do not add AI provider
integrations until a later milestone.
