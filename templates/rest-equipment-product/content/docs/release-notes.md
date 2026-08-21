# Release Notes

## 1.0.0

- Initial REST Equipment Data Product Golden Path.
- Canonical equipment model with unique `equipmentId` upsert.
- Configurable REST source (`SOURCE_API_URL`, `SOURCE_API_TOKEN`,
  `SOURCE_API_TIMEOUT`) and local `POST /api/v1/equipment` mock ingest.
- Data contract version `1.0.0` as the `equipment-event` API entity.
- Quality endpoint evaluates mandatory checks.
- Compatibility tests gate breaking changes for `1.x` consumers.
