# Entitlements vs RBAC

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

RBAC and entitlements are independent. Both are required for commercial
Create.

Example:

- User = Developer
- RBAC = allowed to Create
- Organization entitlement `golden-path.mqtt-temperature` = ACTIVE
  → Create allowed.

- User = Developer
- RBAC = allowed
- Entitlement missing
  → commercial capability unavailable.

- User = Viewer
- Entitlement ACTIVE
  → Create denied. Role is insufficient.

Internal development uses `LocalEntitlementProvider`. That is a provider
choice, not an Admin role bypass.

Frontend chips are informational. Backend `/api/entitlements` and
Scaffolder template permissions enforce the commercial gate.

Related: [identity and RBAC](identity-and-rbac.md),
[commercial architecture](commercial-architecture.md).
