# Future SaaS registration

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

SaaS Edition is **FUTURE**. Multi-tenancy and automatic tenant
provisioning are not implemented.

Conceptual later flow:

```text
Customer
   ↓
AWS Marketplace
   ↓
Subscribe
   ↓
Registration redirect (POST x-amzn-marketplace-token)
   ↓
Nexora backend  (ResolveCustomer)
   ↓
Resolve Marketplace customer
   ↓
Create/link Organization
   ↓
Resolve entitlement (GetEntitlements)
   ↓
Customer enters SaaS workspace
```

`POST /api/entitlements/marketplace/register` exists as a protected
boundary. It does not create tenants. Registration tokens are redacted
in logs.

OrganizationContext remains a seam: `internal` today; `customer-a` /
`customer-b` later. Catalog is not rewritten for multi-tenancy.
