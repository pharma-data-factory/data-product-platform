# Status model

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PRODUCT  
Version: 1.0.0

Nexora never collapses these four dimensions into one badge.

Authoritative freeze: [MVP 1.0 baseline](mvp-1.0-baseline.md).

## Implementation status

Technical conformance of an asset (template, component, or generated
instance) to the Nexora standard.

| Status | Meaning |
| --- | --- |
| DEVELOPMENT | Work in progress. Not a certified product asset. |
| TESTED | Automated/manual tests pass. Not yet CERTIFIED. |
| CERTIFIED | Conforms to the applicable Nexora technical standard. |

CERTIFIED does **not** mean GxP validated, regulatory approved,
commercially approved, or AWS Marketplace listed.

## Release status

Whether a **version** of an official Golden Path is approved for Create.

| Status | Meaning |
| --- | --- |
| DRAFT | Under development. Not generally offered. |
| TESTING | Release candidate tests in progress. |
| RELEASED | A specific certified version is approved for consumption. |
| RETIRED | Not offered for new Create. Existing products remain visible. |

Catalog release metadata stores release status separately from
`certification.status`. A path can be CERTIFIED and RELEASED at once.
DEPRECATED remains a supported transition in
[Golden Path lifecycle](engineering/golden-path-lifecycle.md); it is not
an MVP 1.0 operating state.

## Commercial status

Whether the organization may treat the asset as a commercial SKU.

| Status | Meaning |
| --- | --- |
| AVAILABLE | Entitlement key is offered internally (still legally BLOCKED for distribution). |
| PLANNED | Productized later (Platform Edition, component SKU). |
| FUTURE | Reserved commercial id; not an enabled SKU. |
| BLOCKED | Legal/distribution gate closed (default `legalDistributionStatus`). |

OEE 1.0 is **CERTIFIED / RELEASED** technically and **FUTURE**
commercially. FUTURE does not mean the Golden Path is missing.

## Validation status

| Status | Meaning |
| --- | --- |
| NOT VALIDATED | Default for every MVP 1.0 asset. |
| GxP VALIDATED | Out of scope. Never inferred from CERTIFIED. |

MVP 1.0 validation status is **NOT VALIDATED** for all Golden Paths,
Wave 1 components, and the Control Plane.

## Product subsystems (URS, Validation, …)

Control Plane modules that are not Golden Paths — including URS Composer
electronic signatures — have an explicit four-dimension status and a
written GxP / e-sign position in
[Subsystem status and GxP position](subsystem-status.md).
Do not infer GxP readiness from the presence of signature or approval UI.
