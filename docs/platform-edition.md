# Platform Edition model

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Platform Edition is **PLANNED**. The current Control Plane is the
Internal Developer Platform, not a GA customer-cloud SKU.

Conceptual future flow:

```text
AWS Marketplace
      ↓
Commercial entitlement / license  (platform.core)
      ↓
Platform Release
      ↓
Customer AWS Account
      ↓
Nexora Control Plane
      ↓
Customer Identity Provider
      ↓
Customer GitHub / Data Products
```

Packaging (containers, deployment templates) is not implemented in this
phase. Customer Identity Provider (Entra ID / OIDC) remains planned.
