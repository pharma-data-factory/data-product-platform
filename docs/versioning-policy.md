# Versioning Policy

Semantic versioning for the Nexora Data Product standard,
shared SDK, and official templates.

This is a technical platform policy. It is not GxP validation.

## Versioned artifacts

| Artifact | Current line | Meaning |
| --- | --- | --- |
| Data Product Standard | `1.0.x` | Required generated artifacts, endpoints, and catalog metadata |
| Data Product SDK | `1.x` | Generic quality, contract, compatibility, and metadata helpers |
| MQTT Temperature template | `1.x` | Official MQTT Data Product Golden Path |
| REST Equipment template | `1.x` | Official REST Data Product Golden Path |

Generated Data Product instances also have their own `version` (product
release) and a separate data-contract version on the Catalog API entity.

## SemVer rules

### PATCH

Bug fix only. No contract change and no intended behavior change.

Examples: lint fix, clearer error message, documentation typo, CI path fix.

### MINOR

Backward-compatible capability addition.

Examples: optional quality check, new optional metadata field, additional
TechDocs page, new optional endpoint that existing consumers can ignore.

### MAJOR

Breaking platform or template contract change.

Examples: required catalog field removed or renamed, required endpoint
removed or changed incompatibly, SDK helper signature break, generated
layout change that existing automation cannot consume.

## Compatibility

See [Compatibility matrix](compatibility-matrix.md).

Standard `1.0.x` is compatible with SDK `1.x` and the official `1.x`
MQTT and REST templates.

A generated Data Product reports:

- `dataProductStandardVersion`
- `sdkVersion`
- `template` / `templateVersion`
- `contractVersion`

via `GET /api/v1/platform-metadata`.

## Certification

Template status `CERTIFIED` means only:

> Conforms to the Nexora technical standard.

It does not mean GxP validated or regulatory approved.
