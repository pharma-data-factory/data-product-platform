# Documentation ownership

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Ownership is recorded in markdown and Catalog metadata, not a database.

Example:

```text
Owner: Platform Team
Documentation Version: 1.0
Applicable Platform: Data Product Standard 1.0.x
Last Reviewed: 2026-08
```

| Area | Owner |
| --- | --- |
| Platform architecture | Platform Team |
| MQTT Golden Path | Golden Path Team |
| REST Equipment Golden Path | Golden Path Team |
| Unified Namespace | Platform Team |
| Data Product Standard | Platform Team |
| Identity & RBAC | Platform Team |

Every Developer Hub page must include:

- Owner
- Documentation Version
- Applicable Platform Version
- Last Reviewed
- Audience

Catalog `spec.owner` on the platform Component remains
`group:default/platform-team`. Golden Path TechDocs stay in the generated
repository and inherit that product's catalog owner.
