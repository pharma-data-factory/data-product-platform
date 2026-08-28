# UNS Versioning 1.0

## Schema versioning

- Every payload includes `schemaVersion` (e.g. `"1.0"`).
- JSON Schema files use `-v1` suffix (`equipment-state-v1.schema.json`).
- **Breaking** payload changes require a **new major** schema version (`v2`) and must not silently alter `v1` consumers.
- Additive optional fields may stay within the same major if explicitly documented as non-breaking.

## Topic versioning

Topics are not versioned in the path by default. Contract evolution is via `schemaVersion` in the payload. If a breaking topic rename is required, publish dual-run for a deprecation window.

## Platform validation

UNS Standard documents and schemas are **`NOT_VALIDATED`**. Promotion to validated baseline is a separate Platform Core process.
