# Identity Provider abstraction

RBAC stays independent from the identity provider. Groups and the
Permission Framework grant roles. The IdP only proves who the person is.

## Current MVP

Provider: **GitHub** (user OAuth App)

- Identity key: GitHub login → `user:default/<login>`
- Approval: Catalog `User` entity
- Role: `spec.memberOf` platform groups
- Development fallback: Guest
- Publishing: separate GitHub App (not an IdP)

Do not implement Microsoft Entra ID, Google, or Okta in this phase.

## Future Platform Edition

Planned, not available:

- Microsoft Entra ID / OIDC
- Customer-hosted identity configuration
- Same Backstage User / Group RBAC model

The IdP changes. The groups do not.

```text
Identity Provider (GitHub today, Entra/OIDC later)
        │
        ▼
 Backstage User entity
        │
        ▼
 Catalog groups (platform-viewers, …)
        │
        ▼
 Permission Framework roles
```

## Future SaaS

Future, not available:

- Customer-specific SSO
- OrganizationContext / tenant isolation
- Entitlement enforcement

SSO still must not assign Developer, Owner, or Admin by itself.

## Allowlist (future)

Production may later add a configurable organization allowlist in front
of Catalog User approval. That allowlist is not implemented yet.
Catalog User approval is sufficient for MVP 1.1.
