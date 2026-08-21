# Component Lifecycle and Certification

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Technical lifecycle for Platform Components:

| Status | Meaning |
| --- | --- |
| PLANNED | Catalog placeholder. Not supported in compositions. |
| DEVELOPMENT | Registered and evolving. Supported for composition validation. |
| TESTED | Automated tests exist for the component contract. |
| CERTIFIED | Conforms to the Pharma Data Factory **technical** Platform Component standard. |
| DEPRECATED | Must not be used in new compositions. |

CERTIFIED means only:

> Conforms to the Pharma Data Factory technical Platform Component standard.

It does **not** mean:

- GxP validated
- regulatory approved
- validated for a specific pharmaceutical process

This is the same technical-only distinction used for Data Product
certification and Golden Path CERTIFIED vs RELEASED.

Wave 1 implementations are promoted to CERTIFIED only when the
[Certification Checklist](certification-checklist.md) and
[Wave 1 Conformance Matrix](wave-1-conformance.md) both pass.
See [Wave 1 Certified Components](wave-1-certified.md).

OEE may consume only approved TESTED or CERTIFIED components according
to current platform policy. See [OEE](../oee/index.md).
