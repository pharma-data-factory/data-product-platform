# Identity, RBAC, and landing experience

Nexora uses Backstage authentication and the Permission
Framework. There is no third-party RBAC platform in this milestone.

## Auth architecture

Two GitHub mechanisms exist and must stay separate:

| Mechanism | Purpose | Config | Credentials |
| --- | --- | --- | --- |
| GitHub user login | Portal identity | `auth.providers.github` | `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` |
| GitHub App publishing | Create repositories from templates | `integrations.github.apps` | `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY` |

Never mix these credentials. User login does not publish repositories.
Repository publishing does not sign users in.

## Production access policy

| Environment | GitHub OAuth | Guest | Unknown GitHub user |
| --- | --- | --- | --- |
| Local `yarn start` | allowed | allowed as Developer fallback, not Admin | GitHub may authenticate; platform access is still denied until grouped |
| Docker Compose / shared server | required | forbidden | denied unless Catalog User exists |
| Staging / production / pilot | required | forbidden | denied; no implicit Viewer |

Production does **not** set `dangerouslyAllowSignInWithoutUserInCatalog`.
An authenticated GitHub user must exist as an approved Catalog `User`.
A future organization allowlist may be added later. Catalog User approval
is sufficient for this phase.

Unknown users see **Access not granted**. They do not receive Viewer,
Developer, Owner, or Admin. Authorization is never derived from
GitHub OAuth scopes.

The page message is:

> Your GitHub identity was authenticated successfully, but you do not
> currently have access to this Nexora environment.
>
> Contact your platform administrator to request access.

## Login flow

Unauthenticated users see the public landing and **Sign In**.
The public header also offers **Book a Demo** (`#contact`) and English/German
language selection. There is no free-tier signup CTA.

Clicking Sign In opens the dedicated login card:

- Continue with GitHub
- Continue as Guest (development only)

Approved GitHub users resolve to `user:default/<login>`, receive group
membership, and land on `/`.

Unapproved GitHub users see Access not granted with their GitHub login,
**Sign Out**, and **Return to landing page**.

## Onboarding a user

Users and roles live in the users-backend database, not in a YAML file
(NXD-051). `catalog/org.yaml` holds Groups only; the Catalog's Users are a
projection the plugin rewrites from the database.

1. **First administrator** — on a fresh production install, set
   `USERS_BOOTSTRAP_ADMIN=<github-login>` before the first start. It is read
   once, against an empty user table (NXD-106).
2. **GitHub identity** — note the person's GitHub login, for example
   `schmeckm`.
3. **Add the user** — Admin → Users & Roles (`/admin/users`, PLATFORM_ADMIN
   only): enter that login, a display name, and the groups. Choose exactly one
   platform role group; add `urs-*` groups only for people who sign approvals.
4. **Effective role** — the person signs in, or signs in again. No restart is
   needed; the change and who made it are in the user audit trail.

```text
GitHub identity → Admin → Users & Roles → memberOf groups → effective role
```

A GitHub login that has no user record authenticates and lands on
**Access not granted**. Approval roles are granted only in Nexora, never
derived from GitHub (NXD-107).

## Role / group model

- `platform-viewers` → Viewer
- `data-product-developers` → Developer
- `data-product-owners` → Data Product Owner
- `platform-admins` → Platform Admin

`platform-team` remains the catalog owner of official entities. It is not an
RBAC role.

Local Guest is a member of `guests` and `data-product-developers` so Golden
Paths keep working in development. Guest is not a production identity.

## Permission matrix

Enforced by `PlatformPermissionPolicy` on the backend. Users without a
platform group are denied privileged and catalog access. Frontend hiding
is not sufficient.

| Capability | Viewer | Developer | Owner | Admin |
| --- | --- | --- | --- | --- |
| View Catalog, APIs, TechDocs | yes | yes | yes | yes |
| View Marketplace | yes | yes | yes | yes |
| View Data Products | yes | yes | yes | yes |
| Read AAS assets/sensors (`aas.read`) | yes | yes | yes | yes |
| Manage AAS metadata (`aas.manage`) | no | no | yes | yes |
| Execute approved Scaffolder templates | no | yes | yes | yes |
| Create Data Products | no | yes | yes | yes |

Commercial Golden Path Create also requires an ACTIVE organization
entitlement. RBAC and entitlement are independent. See
[entitlements-vs-rbac.md](entitlements-vs-rbac.md).
| Create from RELEASED official Golden Paths | no | yes | yes | yes |
| Create from DRAFT/TESTING official Golden Paths | no | no | no | yes |
| Propose Golden Path release | no | yes | yes | yes |
| Review Golden Path certification | no | no | yes | yes |
| Approve / release official Golden Paths | no | no | no | yes |
| Owner/governance and technical certification | no | no | yes | yes |
| Template, marketplace, and platform administration | no | no | no | yes |

## Identity providers

See [identity-providers.md](identity-providers.md). MVP uses GitHub only.
Entra ID, Google, and Okta are not implemented.

## Landing and home

Unauthenticated users see the public landing. Approved authenticated users
land on the role-aware home dashboard. The user menu includes Sign Out.

Do not treat Backstage as the visible product brand.
